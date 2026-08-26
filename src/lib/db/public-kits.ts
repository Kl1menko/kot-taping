import "server-only";

import { db } from "./client";
import { KITS, type Kit } from "@/lib/kits";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

/**
 * Набори для лендінгу — з бази, з відкатом на константи з `kits.ts`.
 *
 * Причина відкату та сама, що й у `public-services.ts`: секція наборів не має
 * зникати з вітрини через невиконану міграцію чи незадані змінні Supabase.
 * Ціни в такому разі показуються як «уточнюється» — див. `formatKitPrice`.
 */
export async function listPublicKits(
  locale: Locale = DEFAULT_LOCALE,
): Promise<Kit[]> {
  try {
    const { data, error } = await db()
      .from("kits")
      .select(
        "slug, title, title_en, summary, summary_en, price, price_from, zone, allows_color, needs_measurements, sort",
      )
      .eq("is_active", true)
      .order("sort");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return KITS;

    return data.map((row) => ({
      slug: row.slug,
      // Порожній переклад = показуємо український текст, як і в прайсі послуг.
      title: (locale === "en" && row.title_en) || row.title,
      summary: (locale === "en" && row.summary_en) || row.summary,
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
