import "server-only";

import { db } from "./client";
import { KITS, type Kit } from "@/lib/kits";

/**
 * Набори для лендінгу — з бази, з відкатом на константи з `kits.ts`.
 *
 * Причина відкату та сама, що й у `public-services.ts`: секція наборів не має
 * зникати з вітрини через невиконану міграцію чи незадані змінні Supabase.
 * Ціни в такому разі показуються як «уточнюється» — див. `formatKitPrice`.
 */
export async function listPublicKits(): Promise<Kit[]> {
  try {
    const { data, error } = await db()
      .from("kits")
      .select(
        "slug, title, summary, price, price_from, zone, allows_color, needs_measurements, sort",
      )
      .eq("is_active", true)
      .order("sort");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return KITS;

    return data.map((row) => ({
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      price: row.price,
      priceFrom: row.price_from,
      zone: row.zone,
      allowsColor: row.allows_color,
      needsMeasurements: row.needs_measurements,
    }));
  } catch {
    // Мовчки, як і з прайсом: причина на поведінку вітрини не впливає.
    return KITS;
  }
}
