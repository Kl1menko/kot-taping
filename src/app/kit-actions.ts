"use server";

import { db } from "@/lib/db/client";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  isContactChannel,
  isTapeColor,
  isValidHandle,
  needsHandle,
  normalizeHandle,
  type ContactChannel,
} from "@/lib/intake";
import { isDeliveryCountry, isWorldwide } from "@/lib/kits";

export type KitOrderState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<
      "name" | "phone" | "kit" | "channel" | "handle" | "city" | "consent",
      string
    >
  >;
  /** Введене — щоб повернути його у форму після помилки. Див. `BookingState`. */
  values?: KitOrderValues;
};

/** Сирі значення форми — рівно ті, що прийшли, без нормалізації. */
export type KitOrderValues = {
  name: string;
  phone: string;
  kit: string;
  channel: string;
  handle: string;
  tapeColor: string;
  measurements: string;
  city: string;
  country: string;
  note: string;
  consent: boolean;
};

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 3;

/**
 * Стеля на спам — та сама механіка, що й у заявках на процедуру: рахуємо по
 * базі, бо лічильник у пам'яті процесу на Vercel не переживає холодний старт.
 */
async function tooManyFrom(phone: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await db()
    .from("kit_orders")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);

  if (error) {
    console.error("[kit] не вдалося перевірити ліміт:", error.message);
    return false;
  }

  return (count ?? 0) >= MAX_PER_HOUR;
}

export async function submitKitOrder(
  _prev: KitOrderState,
  formData: FormData,
): Promise<KitOrderState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const kitSlug = String(formData.get("kit") ?? "").trim();
  const channelRaw = String(formData.get("channel") ?? "").trim();
  const handleRaw = String(formData.get("handle") ?? "").trim();
  const colorRaw = String(formData.get("tape_color") ?? "").trim();
  const measurements = String(formData.get("measurements") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const countryRaw = String(formData.get("country") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const consent = formData.get("consent") != null;

  // Знімок введеного — повертаємо його з кожною помилкою.
  const values: KitOrderValues = {
    name,
    phone,
    kit: kitSlug,
    channel: channelRaw,
    handle: handleRaw,
    tapeColor: colorRaw,
    measurements,
    city,
    country: countryRaw,
    note,
    consent,
  };

  const fieldErrors: KitOrderState["fieldErrors"] = {};

  if (name.length < 2) {
    fieldErrors.name = "Вкажіть ім'я — щонайменше 2 символи.";
  }
  if (!isValidPhone(phone)) {
    fieldErrors.phone = "Вкажіть номер телефону — 0XX XXX XX XX або +380 XX XXX XX XX.";
  }

  // Набір звіряємо з базою: він визначає, чи є вибір кольору й чи потрібні
  // заміри, тож підміна slug зламала б і форму, і розрахунок матеріалу.
  const { data: kit } = await db()
    .from("kits")
    .select("slug, title, zone, allows_color")
    .eq("slug", kitSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!kit) {
    fieldErrors.kit = "Оберіть набір зі списку.";
  }

  const channel: ContactChannel = isContactChannel(channelRaw)
    ? channelRaw
    : "telegram";
  if (channelRaw && !isContactChannel(channelRaw)) {
    fieldErrors.channel = "Оберіть спосіб зв'язку зі списку.";
  }

  const handle = normalizeHandle(handleRaw);
  if (needsHandle(channel)) {
    if (!handle) {
      fieldErrors.handle = "Вкажіть нік — за ним я знайду вас, щоб написати.";
    } else if (!isValidHandle(handle)) {
      fieldErrors.handle =
        "Нік складається з латинських літер, цифр, крапки й підкреслення.";
    }
  }

  if (city.length < 2) {
    fieldErrors.city = "Вкажіть місто доставки.";
  }

  if (!consent) {
    fieldErrors.consent = "Без згоди на обробку даних я не можу прийняти замовлення.";
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
        "Ви вже надіслали кілька замовлень. Я зв'яжуся з вами найближчим часом — " +
        "якщо питання термінове, напишіть у Telegram чи Instagram.",
      values,
    };
  }

  const country = isDeliveryCountry(countryRaw) ? countryRaw : "Україна";
  // Колір беремо лише там, де він справді є: обличчя тейпується білим, і
  // збережений там колір ввів би майстриню в оману під час пакування.
  const tapeColor =
    kit!.allows_color && isTapeColor(colorRaw) ? colorRaw : null;

  const { error } = await db().from("kit_orders").insert({
    kit_slug: kit!.slug,
    name,
    phone: normalized,
    contact_channel: channel,
    contact_handle: needsHandle(channel) ? handle : null,
    tape_color: tapeColor,
    measurements: measurements || null,
    city,
    country,
    note: note || null,
    status: "new",
    consent_at: new Date().toISOString(),
  });

  if (error) {
    // Замовлення втрачати не можна — лишаємо слід у логах для ручного розбору.
    console.error("[kit] не вдалося зберегти замовлення", {
      error: error.message,
      name,
      phone: normalized,
      kit: kitSlug,
    });
    return {
      status: "error",
      message:
        "Не вдалося надіслати замовлення. Напишіть, будь ласка, у Telegram або " +
        "Instagram — я відповім одразу.",
      values,
    };
  }

  const contactLine = needsHandle(channel)
    ? `<b>Зв'язок:</b> ${channel === "instagram" ? "Instagram" : "Telegram"}, @${escapeHtml(handle)}`
    : "<b>Зв'язок:</b> телефоном";

  await sendTelegram(
    [
      "<b>Замовлення набору</b>",
      "",
      `<b>Набір:</b> ${escapeHtml(kit!.title)}`,
      `<b>Ім'я:</b> ${escapeHtml(name)}`,
      `<b>Телефон:</b> ${escapeHtml(normalized)}`,
      contactLine,
      tapeColor ? `<b>Колір:</b> ${escapeHtml(tapeColor)}` : "",
      measurements ? `<b>Заміри:</b> ${escapeHtml(measurements)}` : "",
      // Країна попереду міста: саме вона вирішує вартість доставки.
      `<b>Доставка:</b> ${escapeHtml(country)}, ${escapeHtml(city)}`,
      isWorldwide(country) ? "⚠️ Доставка за кордон — порахувати вартість" : "",
      note ? `<b>Коментар:</b> ${escapeHtml(note)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return {
    status: "success",
    message:
      "Замовлення прийнято. Я зв'яжуся з вами, щоб уточнити деталі й надіслати " +
      "реквізити на оплату.",
  };
}
