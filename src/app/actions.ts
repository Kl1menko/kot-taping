"use server";

import { SERVICES } from "@/lib/services";

export type BookingState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "service" | "date", string>>;
};

const PHONE_RE = /^\+?[\d\s()-]{9,20}$/;

export async function submitBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const fieldErrors: BookingState["fieldErrors"] = {};

  if (name.length < 2) {
    fieldErrors.name = "Вкажіть ім'я — щонайменше 2 символи.";
  }
  if (!PHONE_RE.test(phone)) {
    fieldErrors.phone = "Вкажіть номер у форматі +380 XX XXX XX XX.";
  }
  if (!SERVICES.some((s) => s.slug === service)) {
    fieldErrors.service = "Оберіть послугу зі списку.";
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

  // TODO: persist to Supabase `bookings` (status = 'pending') and notify the
  // master via Telegram. Until then the request is only logged server-side.
  console.info("[booking] new request", { name, phone, service, date, note });

  return {
    status: "success",
    message:
      "Заявку прийнято. Я зв'яжусь із вами найближчим часом, щоб підтвердити час.",
  };
}
