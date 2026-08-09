"use server";

import { db } from "@/lib/db/client";
import { escapeHtml, sendTelegram } from "@/lib/notify";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { dayTitle } from "@/lib/calendar";

export type BookingState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<"name" | "phone" | "service" | "location" | "date", string>
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

  const fieldErrors: BookingState["fieldErrors"] = {};

  if (name.length < 2) {
    fieldErrors.name = "Вкажіть ім'я — щонайменше 2 символи.";
  }
  if (!isValidPhone(phone)) {
    fieldErrors.phone = "Вкажіть номер у форматі +380 XX XXX XX XX.";
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
      note ? `<b>Коментар:</b> ${escapeHtml(note)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return {
    status: "success",
    message:
      "Заявку прийнято. Я зв'яжусь із вами найближчим часом, щоб підтвердити час.",
  };
}
