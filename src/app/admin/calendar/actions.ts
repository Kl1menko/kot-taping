"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { upsertClient } from "@/lib/db/clients";
import { findConflicts } from "@/lib/db/appointments";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { overlaps, timeRange } from "@/lib/calendar";
import type { AppointmentStatus } from "@/lib/db/types";

export type AppointmentState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "phone"
      | "service"
      | "location"
      | "startsAt"
      | "duration"
      | "price",
      string
    >
  >;
};

function parseForm(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    serviceId: String(formData.get("serviceId") ?? "").trim(),
    locationId: String(formData.get("locationId") ?? "").trim(),
    startsAt: String(formData.get("startsAt") ?? "").trim(),
    duration: String(formData.get("duration") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    // Дозволяє зберегти запис попри накладку — після явного попередження.
    force: formData.get("force") === "1",
  };
}

/** Створює або оновлює запис — форма в обох випадках одна. */
export async function saveAppointment(
  _prev: AppointmentState,
  formData: FormData,
): Promise<AppointmentState> {
  await requireSession();

  const input = parseForm(formData);
  const fieldErrors: AppointmentState["fieldErrors"] = {};

  if (input.name.length < 2) {
    fieldErrors.name = "Вкажіть ім'я клієнта.";
  }
  if (!isValidPhone(input.phone)) {
    fieldErrors.phone = "Номер у форматі +380 XX XXX XX XX.";
  }
  if (!input.serviceId) {
    fieldErrors.service = "Оберіть послугу.";
  }
  if (!input.locationId) {
    fieldErrors.location = "Оберіть кабінет.";
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    fieldErrors.startsAt = "Оберіть дату й час.";
  }

  const duration = Number(input.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    fieldErrors.duration = "Тривалість — додатне число хвилин.";
  }

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    fieldErrors.price = "Ціна не може бути від'ємною.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Перевірте виділені поля.", fieldErrors };
  }

  // Далі всі поля валідні — звужуємо типи для TypeScript.
  const start = startsAt as Date;

  // Накладка не блокує збереження назавжди: майстер може свідомо поставити
  // два записи поруч. Але мовчки допускати перетин не можна.
  if (!input.force) {
    const nearby = await findConflicts(start, duration, input.id || undefined);
    const clash = nearby.find(
      (a) =>
        // Накладка можлива лише в межах одного кабінету: Львів і Київ — це
        // різні місця, майстриня фізично не в обох одночасно, але й запис
        // в іншому місті слоту тут не займає.
        a.location_id === input.locationId &&
        overlaps(start, duration, new Date(a.starts_at), a.duration_min),
    );
    if (clash) {
      return {
        status: "error",
        message:
          `Накладка з записом «${clash.client.name}» ` +
          `(${timeRange(new Date(clash.starts_at), clash.duration_min)}). ` +
          "Натисніть «Зберегти попри накладку», якщо це навмисно.",
      };
    }
  }

  const client = await upsertClient({ name: input.name, phone: input.phone });

  const row = {
    client_id: client.id,
    service_id: input.serviceId,
    location_id: input.locationId,
    starts_at: start.toISOString(),
    duration_min: duration,
    price,
    note: input.note || null,
  };

  if (input.id) {
    const { error } = await db()
      .from("appointments")
      .update(row)
      .eq("id", input.id);
    if (error) {
      return { status: "error", message: `Не вдалося зберегти: ${error.message}` };
    }
  } else {
    const { error } = await db()
      .from("appointments")
      .insert({ ...row, status: "planned", source: "manual" });
    if (error) {
      return { status: "error", message: `Не вдалося створити: ${error.message}` };
    }
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/admin");

  return {
    status: "success",
    message: input.id ? "Запис оновлено." : "Запис створено.",
  };
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  await requireSession();

  const { error } = await db()
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Не вдалося змінити статус: ${error.message}`);

  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

export async function deleteAppointment(id: string) {
  await requireSession();

  const { error } = await db().from("appointments").delete().eq("id", id);
  if (error) throw new Error(`Не вдалося видалити запис: ${error.message}`);

  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

/** «Повторити запис» — той самий клієнт і послуга, нова дата. */
export async function repeatAppointment(id: string, startsAt: string) {
  await requireSession();

  const { data: source, error: readError } = await db()
    .from("appointments")
    .select("client_id, service_id, duration_min, price")
    .eq("id", id)
    .single();

  if (readError) throw new Error(`Не вдалося прочитати запис: ${readError.message}`);

  const { error } = await db().from("appointments").insert({
    client_id: source.client_id,
    service_id: source.service_id,
    starts_at: new Date(startsAt).toISOString(),
    duration_min: source.duration_min,
    price: source.price,
    status: "planned",
    source: "manual",
  });

  if (error) throw new Error(`Не вдалося повторити запис: ${error.message}`);

  revalidatePath("/admin/calendar");
}

/** Використовує клієнтська форма, щоб підставити телефон у канонічному вигляді. */
export async function normalizePhoneAction(value: string) {
  return normalizePhone(value);
}
