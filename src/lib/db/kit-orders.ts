import "server-only";

import { db } from "./client";
import type { KitOrderRow, KitRow } from "./types";
import type { KitOrderStatus } from "@/lib/kits";

export type KitOrderWithKit = KitOrderRow & {
  /** Назва набору на момент показу; null, якщо набір прибрали з каталогу. */
  kitTitle: string | null;
};

/**
 * Замовлення з назвою набору. Назву тягнемо окремим запитом, а не джойном:
 * `kit_slug` навмисно не FK — та сама причина, що й у заявках.
 */
export async function listKitOrders(
  status?: KitOrderStatus,
): Promise<KitOrderWithKit[]> {
  let query = db()
    .from("kit_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query.limit(200);
  if (error) throw new Error(`Не вдалося прочитати замовлення: ${error.message}`);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const slugs = [...new Set(rows.map((r) => r.kit_slug))];
  const { data: kits } = await db()
    .from("kits")
    .select("slug, title")
    .in("slug", slugs);

  const titles = new Map((kits ?? []).map((k) => [k.slug, k.title]));

  return rows.map((row) => ({
    ...row,
    kitTitle: titles.get(row.kit_slug) ?? null,
  }));
}

/** Замовлення в роботі — бейдж у навігації, як і «нові заявки». */
export async function countOpenKitOrders(): Promise<number> {
  const { count, error } = await db()
    .from("kit_orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["new", "confirmed", "paid"]);

  if (error) {
    throw new Error(`Не вдалося порахувати замовлення: ${error.message}`);
  }
  return count ?? 0;
}

/** Каталог наборів для адмінки — разом із неактивними, на відміну від сайту. */
export async function listKits(): Promise<KitRow[]> {
  const { data, error } = await db().from("kits").select("*").order("sort");
  if (error) throw new Error(`Не вдалося прочитати набори: ${error.message}`);
  return data ?? [];
}
