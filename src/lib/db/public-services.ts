import "server-only";

import { db } from "./client";
import { SERVICES, type Service, type ServiceCategory } from "@/lib/services";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

/**
 * Прайс для лендінгу — з бази, з відкатом на константи з `services.ts`.
 *
 * Відкат тут не про надійність мережі, а про обіцянку з README: вітрина не має
 * лягати через несконфігуровану адмінку. Змінні Supabase на проді можуть бути
 * ще не задані (або міграції не виконані) — сайт мусить показувати прайс і в
 * цьому випадку. Тому будь-яка помилка читання = показуємо seed-дані з коду,
 * а не порожню секцію і не 500.
 *
 * Порожня таблиця обробляється так само: `db:seed` ще не запускали, отже
 * джерелом правди лишається код.
 *
 * Мова підставляється тут, а не в компонентах: картки, форма запису й
 * schema.org читають `title`/`summary`, і жодному з них не треба знати, що
 * перекладів два. Порожній `title_en` означає «переклад ще не написали» —
 * тоді показуємо український текст, а не порожню назву послуги.
 */

/** Категорії з БД можуть містити те, чого немає в коді, — звідси перевірка. */
const KNOWN_CATEGORIES = new Set<string>(
  SERVICES.map((s) => s.category as string).concat([
    "muscle",
    "neuro",
    "lymph-body",
    "lymph-face",
    "face-modeling",
    "sets",
  ]),
);

export async function listPublicServices(
  locale: Locale = DEFAULT_LOCALE,
): Promise<Service[]> {
  try {
    const { data, error } = await db()
      .from("services")
      .select(
        "slug, title, title_en, summary, summary_en, price, price_from, wear, badge, category, tone, image_url, sort",
      )
      .eq("is_active", true)
      .order("sort");

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return SERVICES;

    return data
      .filter((row) => KNOWN_CATEGORIES.has(row.category))
      .map((row) => ({
        slug: row.slug,
        title: (locale === "en" && row.title_en) || row.title,
        summary: (locale === "en" && row.summary_en) || row.summary,
        price: row.price,
        // `priceFrom`/`wear`/`badge` необов'язкові в типі, а в БД — nullable.
        // Приводимо до форми, яку вже очікують картки лендінгу.
        ...(row.price_from ? { priceFrom: true } : {}),
        ...(row.wear ? { wear: row.wear } : {}),
        ...(row.badge ? { badge: row.badge } : {}),
        ...(row.image_url ? { image: row.image_url } : {}),
        category: row.category as ServiceCategory,
        tone: row.tone,
      }));
  } catch {
    // Мовчки: лендінг важливіший за лог, а причина (немає змінних, немає
    // таблиці, немає мережі) на поведінку не впливає — показуємо прайс із коду.
    return SERVICES;
  }
}
