import "server-only";

import { db } from "./client";
import type {
  AppointmentRow,
  ClientRow,
  LocationRow,
  ServiceRow,
} from "./types";

/**
 * Запис разом із клієнтом і послугою — саме в такому вигляді його показує
 * і картка в списку, і нижній лист деталей, тож джойн робимо одразу.
 */
export type AppointmentWithRefs = AppointmentRow & {
  client: Pick<ClientRow, "id" | "name" | "phone" | "notes">;
  service: Pick<ServiceRow, "id" | "title" | "slug" | "category">;
  location: Pick<LocationRow, "id" | "slug" | "city">;
};

const SELECT_WITH_REFS = `
  *,
  client:clients ( id, name, phone, notes ),
  service:services ( id, title, slug, category ),
  location:locations ( id, slug, city )
`;

/**
 * Записи в проміжку [start, end). Скасовані лишаємо: майстер має бачити, що
 * слот звільнився, а не гадати, куди подівся запис.
 */
export async function listAppointments(
  start: Date,
  end: Date,
  /** Slug кабінету; порожньо — усі кабінети. */
  locationSlug?: string,
): Promise<AppointmentWithRefs[]> {
  let query = db()
    .from("appointments")
    .select(SELECT_WITH_REFS)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at", { ascending: true });

  // Фільтр по полю пов'язаної таблиці — саме так PostgREST його приймає.
  if (locationSlug) query = query.eq("locations.slug", locationSlug);

  const { data, error } = await query;

  if (error) throw new Error(`Не вдалося прочитати записи: ${error.message}`);

  const rows = (data ?? []) as unknown as AppointmentWithRefs[];
  // `.eq` по вкладеній таблиці не відсіює рядки, а лише занулює зв'язок,
  // тож остаточну фільтрацію робимо тут.
  return locationSlug
    ? rows.filter((r) => r.location?.slug === locationSlug)
    : rows;
}

export async function listLocations(): Promise<LocationRow[]> {
  const { data, error } = await db()
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("sort");

  if (error) throw new Error(`Не вдалося прочитати кабінети: ${error.message}`);
  return data ?? [];
}

export async function listClientAppointments(
  clientId: string,
): Promise<AppointmentWithRefs[]> {
  const { data, error } = await db()
    .from("appointments")
    .select(SELECT_WITH_REFS)
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(`Не вдалося прочитати історію: ${error.message}`);
  return (data ?? []) as unknown as AppointmentWithRefs[];
}

/**
 * Записи, що можуть конфліктувати з новим слотом. Беремо вікно в добу навколо
 * початку: довших процедур не буває, а вужчий запит пропустив би запис, який
 * почався раніше й ще триває.
 */
export async function findConflicts(
  startsAt: Date,
  durationMin: number,
  excludeId?: string,
): Promise<AppointmentWithRefs[]> {
  const from = new Date(startsAt.getTime() - 24 * 60 * 60_000);
  const to = new Date(startsAt.getTime() + durationMin * 60_000);

  let query = db()
    .from("appointments")
    .select(SELECT_WITH_REFS)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString())
    // Скасований запис слот не займає.
    .neq("status", "cancelled");

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw new Error(`Не вдалося перевірити накладки: ${error.message}`);
  return (data ?? []) as unknown as AppointmentWithRefs[];
}
