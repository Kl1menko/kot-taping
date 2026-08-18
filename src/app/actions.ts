"use server";

import { db } from "@/lib/db/client";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { dayTitle } from "@/lib/calendar";
import {
  contraindicationLabels,
  isContactChannel,
  isContraindication,
  isPreferredTime,
  isTapeColor,
  isValidHandle,
  needsHandle,
  needsReview,
  normalizeHandle,
  parseHeight,
  preferredTimeLabel,
  type ContactChannel,
} from "@/lib/intake";

export type BookingState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "phone"
      | "service"
      | "location"
      | "date"
      | "channel"
      | "handle"
      | "height"
      | "consent",
      string
    >
  >;
};

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 3;

/**
 * Стеля на спам, рахована по базі, а не в пам'яті процесу.
 *
 * Лічильник у модульній змінній тут не працює: кожен серверний інстанс (і
 * кожен воркер у dev) має власну пам'ять, тож ліміт обходиться простим
 * повтором. `requests` — спільний для всіх, тому рахуємо там.
 */
async function tooManyFrom(phone: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await db()
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);

  // Помилка перевірки не має блокувати живу заявку.
  if (error) {
    console.error("[booking] не вдалося перевірити ліміт:", error.message);
    return false;
  }

  return (count ?? 0) >= MAX_PER_HOUR;
}

export async function submitBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const channelRaw = String(formData.get("channel") ?? "").trim();
  const handleRaw = String(formData.get("handle") ?? "").trim();
  const timeRaw = String(formData.get("time") ?? "").trim();
  const colorRaw = String(formData.get("tape_color") ?? "").trim();
  const heightRaw = String(formData.get("height") ?? "").trim();
  const measurements = String(formData.get("measurements") ?? "").trim();
  const consent = formData.get("consent") != null;

  // Чекбоксів кілька під одним іменем — беремо всі відмічені й лишаємо тільки
  // знайомі id: у формі могли підмінити value, а в базу має лягти наш перелік.
  const contraindications = formData
    .getAll("contraindications")
    .map((v) => String(v))
    .filter(isContraindication);

  const fieldErrors: BookingState["fieldErrors"] = {};

  if (name.length < 2) {
    fieldErrors.name = "Вкажіть ім'я — щонайменше 2 символи.";
  }
  if (!isValidPhone(phone)) {
    fieldErrors.phone = "Вкажіть номер телефону — 0XX XXX XX XX або +380 XX XXX XX XX.";
  }

  // Послугу звіряємо з базою, а не зі статичним списком: прайс тепер живе там.
  const { data: matched, error: serviceError } = await db()
    .from("services")
    .select("slug, title")
    .eq("slug", service)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError || !matched) {
    fieldErrors.service = "Оберіть послугу зі списку.";
  }

  // Кабінет так само звіряємо з базою, а не з константою на клієнті.
  const { data: matchedLocation } = await db()
    .from("locations")
    .select("slug, city")
    .eq("slug", location)
    .eq("is_active", true)
    .maybeSingle();

  if (!matchedLocation) {
    fieldErrors.location = "Оберіть кабінет зі списку.";
  }

  if (!date) {
    fieldErrors.date = "Оберіть бажану дату.";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) {
      fieldErrors.date = "Дата не може бути в минулому.";
    }
  }

  // Канал звіряємо зі списком, а не довіряємо полю: за ним майстриня шукатиме
  // людину, і «viber» тут зламав би крок 2 маршруту.
  const channel: ContactChannel = isContactChannel(channelRaw)
    ? channelRaw
    : "telegram";
  if (channelRaw && !isContactChannel(channelRaw)) {
    fieldErrors.channel = "Оберіть спосіб зв'язку зі списку.";
  }

  // Нік — єдиний спосіб знайти пацієнта в Instagram, тож для месенджерів він
  // обов'язковий. Для телефону контакт уже є — номер вище.
  const handle = normalizeHandle(handleRaw);
  if (needsHandle(channel)) {
    if (!handle) {
      fieldErrors.handle = "Вкажіть нік — за ним я знайду вас, щоб написати.";
    } else if (!isValidHandle(handle)) {
      fieldErrors.handle =
        "Нік складається з латинських літер, цифр, крапки й підкреслення.";
    }
  }

  // Розбираємо одразу у значення: після спільної перевірки полів TypeScript
  // уже не пам'ятає, що розбір удався, а тягти прапорець до вставки — зайве.
  const parsedHeight = parseHeight(heightRaw);
  const heightCm = parsedHeight.ok ? parsedHeight.value : null;
  if (!parsedHeight.ok) {
    fieldErrors.height = "Зріст у сантиметрах, наприклад 168.";
  }

  // Без згоди заявку зберігати не можна: у ній телефон і дані про здоров'я.
  if (!consent) {
    fieldErrors.consent = "Без згоди на обробку даних я не можу прийняти заявку.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Перевірте виділені поля.",
      fieldErrors,
    };
  }

  const normalized = normalizePhone(phone);

  if (await tooManyFrom(normalized)) {
    return {
      status: "error",
      message:
        "Ви вже надіслали кілька заявок. Я зв'яжуся з вами найближчим часом — " +
        "якщо питання термінове, напишіть у Telegram чи Instagram.",
    };
  }

  const { error } = await db().from("requests").insert({
    name,
    phone: normalized,
    service_slug: service,
    location_slug: location,
    preferred_date: date,
    note: note || null,
    status: "new",
    contact_channel: channel,
    contact_handle: needsHandle(channel) ? handle : null,
    preferred_time: isPreferredTime(timeRaw) ? timeRaw : null,
    // Колір звіряємо з асортиментом — у базу має лягти назва зі списку.
    tape_color: isTapeColor(colorRaw) ? colorRaw : null,
    height_cm: heightCm,
    measurements: measurements || null,
    contraindications,
    // Момент згоди, а не факт: для персональних даних важливо саме коли.
    consent_at: new Date().toISOString(),
  });

  if (error) {
    // Заявку втрачати не можна: лишаємо слід у логах, щоб її можна було
    // відновити вручну, і чесно кажемо клієнтці написати напряму.
    console.error("[booking] не вдалося зберегти заявку", {
      error: error.message,
      name,
      phone: normalized,
      service,
      date,
    });
    return {
      status: "error",
      message:
        "Не вдалося надіслати заявку. Напишіть, будь ласка, у Telegram або " +
        "Instagram — я відповім одразу.",
    };
  }

  const flagged = needsReview(contraindications);
  const timeLabel = preferredTimeLabel(timeRaw);
  const tapeColor = isTapeColor(colorRaw) ? colorRaw : null;

  // Канал і нік — щоб майстриня одразу знала, де шукати людину (крок 2), а не
  // відкривала заявку заради одного рядка.
  const contactLine = needsHandle(channel)
    ? `<b>Зв'язок:</b> ${channel === "instagram" ? "Instagram" : "Telegram"}, @${escapeHtml(handle)}`
    : "<b>Зв'язок:</b> телефоном";

  // Сповіщення після збереження і без await-залежності від успіху: заявка вже
  // в базі, тож проблеми Telegram не мають ламати відповідь клієнтці.
  await sendTelegram(
    [
      "<b>Нова заявка з сайту</b>",
      "",
      `<b>Ім'я:</b> ${escapeHtml(name)}`,
      `<b>Телефон:</b> ${escapeHtml(normalized)}`,
      `<b>Послуга:</b> ${escapeHtml(matched!.title)}`,
      `<b>Кабінет:</b> ${escapeHtml(matchedLocation!.city)}`,
      `<b>Бажана дата:</b> ${dayTitle(new Date(date))}`,
      timeLabel ? `<b>Зручний час:</b> ${escapeHtml(timeLabel)}` : "",
      contactLine,
      tapeColor ? `<b>Колір тейпу:</b> ${escapeHtml(tapeColor)}` : "",
      heightCm ? `<b>Зріст:</b> ${heightCm} см` : "",
      measurements ? `<b>Об'єми:</b> ${escapeHtml(measurements)}` : "",
      note ? `<b>Коментар:</b> ${escapeHtml(note)}` : "",
      // Найважливіше — в кінці, щоб не загубилось серед решти рядків.
      flagged
        ? "\n⚠️ <b>Потребує узгодження:</b>\n" +
          contraindicationLabels(contraindications)
            .map((l) => `• ${escapeHtml(l)}`)
            .join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return {
    status: "success",
    // Відмічене протипоказання запис не блокує — рішення медичне і за
    // майстринею. Але обіцяти тверде підтвердження тут було б нечесно.
    message: flagged
      ? "Заявку прийнято. Ви відмітили стан, який треба узгодити перед " +
        "процедурою, — я напишу вам, щоб уточнити деталі."
      : "Заявку прийнято. Я зв'яжусь із вами найближчим часом, щоб підтвердити час.",
  };
}
