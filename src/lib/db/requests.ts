import "server-only";

import { db } from "./client";
import type { RequestRow, RequestStatus } from "./types";

export type RequestWithService = RequestRow & {
  /** Назва послуги на момент показу; null, якщо послугу з прайсу прибрали. */
  serviceTitle: string | null;
};

/**
 * Заявки зі статусом. Назву послуги підтягуємо окремим запитом, а не джойном:
 * `service_slug` навмисно не FK (заявка має пережити зміни прайсу), тож
 * реляція для PostgREST тут не існує.
 */
export async function listRequests(
  status?: RequestStatus,
): Promise<RequestWithService[]> {
  let query = db()
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query.limit(200);
  if (error) throw new Error(`Не вдалося прочитати заявки: ${error.message}`);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const slugs = [...new Set(rows.map((r) => r.service_slug))];
  const { data: services } = await db()
    .from("services")
    .select("slug, title")
    .in("slug", slugs);

  const titles = new Map((services ?? []).map((s) => [s.slug, s.title]));

  return rows.map((row) => ({
    ...row,
    serviceTitle: titles.get(row.service_slug) ?? null,
  }));
}

export async function getRequest(id: string): Promise<RequestRow | null> {
  const { data, error } = await db()
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати заявку: ${error.message}`);
  return data ?? null;
}
