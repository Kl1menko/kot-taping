"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { upsertClient } from "@/lib/db/clients";
import { getRequest } from "@/lib/db/requests";
import type { RequestStatus } from "@/lib/db/types";

export type ConvertState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/** Кабінет за slug із заявки; якщо його немає — перший активний. */
async function resolveLocationId(slug: string | null): Promise<string | null> {
  const query = db().from("locations").select("id").eq("is_active", true);

  const { data } = slug
    ? await query.eq("slug", slug).maybeSingle()
    : await query.order("sort").limit(1).maybeSingle();

  return data?.id ?? null;
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  await requireSession();

  const { error } = await db().from("requests").update({ status }).eq("id", id);
  if (error) throw new Error(`Не вдалося змінити статус: ${error.message}`);

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

/**
 * Заявка → запис у календарі.
 *
 * Тут заявка перестає бути наміром і стає подією: створюємо (або знаходимо)
 * клієнта, ставимо запис і зшиваємо його з заявкою через `appointment_id` —
 * саме цей зв'язок потім дає чесну конверсію.
 */
export async function convertRequest(
  _prev: ConvertState,
  formData: FormData,
): Promise<ConvertState> {
  await requireSession();

  const id = String(formData.get("id") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  const durationRaw = String(formData.get("duration") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  const request = await getRequest(id);
  if (!request) {
    return { status: "error", message: "Заявку не знайдено." };
  }
  if (request.status === "converted") {
    return { status: "error", message: "Заявку вже перетворено на запис." };
  }

  const start = new Date(startsAt);
  if (!startsAt || Number.isNaN(start.getTime())) {
    return { status: "error", message: "Оберіть дату й час запису." };
  }

  const duration = Number(durationRaw);
  const price = Number(priceRaw);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { status: "error", message: "Тривалість — додатне число хвилин." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { status: "error", message: "Ціна не може бути від'ємною." };
  }

  const { data: service, error: serviceError } = await db()
    .from("services")
    .select("id")
    .eq("slug", request.service_slug)
    .maybeSingle();

  if (serviceError || !service) {
    return {
      status: "error",
      message:
        "Послуги з цієї заявки більше немає в прайсі. Створіть запис вручну через календар.",
    };
  }

  const client = await upsertClient({
    name: request.name,
    phone: request.phone,
  });

  // Кабінет із форми; якщо не вказано — бажаний із заявки, інакше перший.
  const locationId =
    String(formData.get("locationId") ?? "").trim() ||
    (await resolveLocationId(request.location_slug));

  if (!locationId) {
    return {
      status: "error",
      message: "Не вдалося визначити кабінет. Створіть запис через календар.",
    };
  }

  const { data: appointment, error: insertError } = await db()
    .from("appointments")
    .insert({
      client_id: client.id,
      service_id: service.id,
      location_id: locationId,
      starts_at: start.toISOString(),
      duration_min: duration,
      price,
      status: "planned",
      // Помітка джерела — без неї конверсію не порахувати.
      source: "site",
      note: request.note,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      status: "error",
      message: `Не вдалося створити запис: ${insertError.message}`,
    };
  }

  const { error: linkError } = await db()
    .from("requests")
    .update({ status: "converted", appointment_id: appointment.id })
    .eq("id", id);

  if (linkError) {
    // Запис уже створено — не залишаємо майстра з думкою, що нічого не сталось.
    return {
      status: "error",
      message: `Запис створено, але заявку не позначено: ${linkError.message}`,
    };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");

  return { status: "success", message: "Запис створено." };
}
