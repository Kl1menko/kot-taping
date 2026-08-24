"use server";

import { db } from "@/lib/db/client";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { sendPush } from "@/lib/push";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { dayTitle } from "@/lib/calendar";
import { readSchedule } from "@/lib/db/working-days";
import {
  formatTime,
  isDateAvailable,
  isTimeAvailable,
  parseTime,
  slotForTime,
} from "@/lib/schedule";
import {
  contraindicationLabels,
  isContactChannel,
  isContraindication,
  isTapeColor,
  isValidHandle,
  needsHandle,
  needsReview,
  normalizeHandle,
  parseHeight,
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
      | "time"
      | "channel"
      | "handle"
      | "height"
      | "consent",
      string
    >
  >;
  /**
   * Те, що людина вже ввела, — щоб повернути це у форму після помилки.
   *
   * React скидає неконтрольовані поля, коли `<form action>` завершується, тож
   * без цього ехо анкету з вісімнадцяти полів довелося б набирати заново через
   * одну описку в телефоні. Значення йдуть у `defaultValue`, а `key` форми
   * змушує React перемонтувати її з новими початковими значеннями.
   */
  values?: BookingValues;
};

/** Сирі значення форми — рівно ті, що прийшли, без нормалізації. */
export type BookingValues = {
  name: string;
  phone: string;
  service: string;
  location: string;
  date: string;
  note: string;
  channel: string;
  handle: string;
  time: string;
  tapeColor: string;
  height: string;
  measurements: string;
  contraindications: string[];
  consent: boolean;
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

  // Знімок введеного — повертаємо його з кожною помилкою, щоб форма
  // відновилася такою, якою людина її залишила.
  const values: BookingValues = {
    name,
    phone,
    service,
    location,
    date,
    note,
    channel: channelRaw,
    handle: handleRaw,
    time: timeRaw,
    tapeColor: colorRaw,
    height: heightRaw,
    measurements,
    contraindications,
    consent,
  };

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

  // Дату звіряємо з графіком, а не лише з «не в минулому».
  //
  // Це та сама перевірка, яку робить форма, малюючи календар (див.
  // `isDateAvailable`), тож відкинути день, який вона показала доступним, тут
  // неможливо. Але покластися на клієнта не можна: поле `date` приходить із
  // браузера, і графік — єдине, що відділяє заявку на робочу суботу від
  // заявки на неділю, коли кабінет зачинений.
  const locationSchedule = await readSchedule(location);

  if (!date) {
    fieldErrors.date = "Оберіть бажану дату.";
  } else if (!locationSchedule) {
    // Кабінет без графіка: або його щойно закрили, або графік ще не заведено.
    fieldErrors.date = "Для цього кабінету поки немає відкритих дат.";
  } else if (!isDateAvailable(locationSchedule, date)) {
    fieldErrors.date =
      "Ця дата вже недоступна — оберіть, будь ласка, іншу з відкритих.";
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

  // Час звіряємо з робочими годинами дня — тими самими, з яких форма щойно
  // намалювала сітку (`timesFor`). Тепер це точна година, а не орієнтир, тож
  // поле стало обов'язковим: заявка «десь увечері» знову означала б
  // узгодження листуванням, заради скорочення якого графік і заводили.
  const minutes = parseTime(timeRaw);

  if (!fieldErrors.date) {
    if (minutes === null) {
      fieldErrors.time = "Оберіть час.";
    } else if (
      !locationSchedule ||
      !isTimeAvailable(locationSchedule, date, minutes)
    ) {
      fieldErrors.time = "Цей час уже недоступний — оберіть інший.";
    }
  }

  // Проміжок анкети рахуємо з години: колонка `preferred_time` лишається як
  // орієнтир у списку заявок, але джерело правди тепер одне — сам час.
  const preferredTime = minutes !== null ? slotForTime(minutes) : null;

  // Без згоди заявку зберігати не можна: у ній телефон і дані про здоров'я.
  if (!consent) {
    fieldErrors.consent = "Без згоди на обробку даних я не можу прийняти заявку.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Перевірте виділені поля.",
      fieldErrors,
      values,
    };
  }

  const normalized = normalizePhone(phone);

  if (await tooManyFrom(normalized)) {
    return {
      status: "error",
      message:
        "Ви вже надіслали кілька заявок. Я зв'яжуся з вами найближчим часом — " +
        "якщо питання термінове, напишіть у Telegram чи Instagram.",
      values,
    };
  }

  const row = {
    name,
    phone: normalized,
    service_slug: service,
    location_slug: location,
    preferred_date: date,
    note: note || null,
    status: "new" as const,
    contact_channel: channel,
    contact_handle: needsHandle(channel) ? handle : null,
    preferred_time: preferredTime,
    preferred_at: minutes !== null ? formatTime(minutes) : null,
    // Колір звіряємо з асортиментом — у базу має лягти назва зі списку.
    tape_color: isTapeColor(colorRaw) ? colorRaw : null,
    height_cm: heightCm,
    measurements: measurements || null,
    contraindications,
    // Момент згоди, а не факт: для персональних даних важливо саме коли.
    consent_at: new Date().toISOString(),
  };

  let { error } = await db().from("requests").insert(row);

  // Колонки `preferred_at` може ще не бути: код їде на прод раніше, ніж хтось
  // виконає міграцію 0012, і між цими двома моментами кожна заявка падала б
  // цілком — через поле, без якого вона цілком дієздатна. Тому один повтор
  // без нього: втратити годину в заявці прикро, втратити заявку — недопустимо.
  // 42703 — undefined_column у Postgres.
  if (error?.code === "42703" && "preferred_at" in row) {
    console.warn(
      "[booking] немає колонки requests.preferred_at — виконайте міграцію 0012; " +
        "заявку збережено без точної години",
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- деструктуризація саме щоб прибрати поле
    const { preferred_at, ...withoutTime } = row;
    ({ error } = await db().from("requests").insert(withoutTime));
  }

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
      values,
    };
  }

  const flagged = needsReview(contraindications);
  const timeLabel = minutes !== null ? formatTime(minutes) : null;
  const tapeColor = isTapeColor(colorRaw) ? colorRaw : null;

  // Канал і нік — щоб майстриня одразу знала, де шукати людину (крок 2), а не
  // відкривала заявку заради одного рядка.
  const contactLine = needsHandle(channel)
    ? `<b>Зв'язок:</b> ${channel === "instagram" ? "Instagram" : "Telegram"}, @${escapeHtml(handle)}`
    : "<b>Зв'язок:</b> телефоном";

  // Сповіщення після збереження і без await-залежності від успіху: заявка вже
  // в базі, тож проблеми Telegram не мають ламати відповідь клієнтці.
  //
  // Два канали паралельно, не по черзі: Telegram веде в чат, пуш — одразу в
  // розділ заявок адмінки. Обидва мовчки ковтають власні помилки, тож
  // `allSettled` тут не потрібен, а `Promise.all` не додає їм затримки один
  // від одного — інакше повільний Telegram затримував би й пуш.
  await Promise.all([
    sendTelegram(
      [
        "<b>Нова заявка з сайту</b>",
        "",
        `<b>Ім'я:</b> ${escapeHtml(name)}`,
        `<b>Телефон:</b> ${escapeHtml(normalized)}`,
        `<b>Послуга:</b> ${escapeHtml(matched!.title)}`,
        `<b>Кабінет:</b> ${escapeHtml(matchedLocation!.city)}`,
        `<b>Бажана дата:</b> ${dayTitle(new Date(date))}`,
          timeLabel ? `<b>Час:</b> ${escapeHtml(timeLabel)}` : "",
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
    ),
    sendPush({
      // Заголовок несе найважливіше: протипоказання видно ще до розкриття.
      title: flagged ? "⚠️ Заявка з протипоказанням" : "Нова заявка з сайту",
      body: `${name}, ${matched!.title} — ${dayTitle(new Date(date))}, ${matchedLocation!.city}`,
      url: "/admin/requests",
      // Спільний тег: п'ять заявок за вечір дадуть один рядок у шторці, що
      // оновлюється, а не п'ять окремих сповіщень.
      tag: "request",
    }),
  ]);

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
