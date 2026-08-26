import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/lib/i18n";

/**
 * Карта сайту.
 *
 * Секції лендінгу — це якорі, а не маршрути, і в sitemap їм не місце:
 * пошуковик індексує сторінку, а не `#services`. Тому тут лише реальні URL —
 * головна, каталог, категорії послуг і кабінети.
 *
 * `priority` — річ відносна: він не піднімає сайт у видачі, а лише каже
 * краулеру, що обходити першим усередині цього ж домену. Тому головна 1.0,
 * категорії 0.8 (саме вони ловлять пошук за послугою), міста 0.8 — Львів і
 * Київ рівнозначні.
 *
 * Сайт двомовний, тож кожен запис іде двічі — по разу на мову, — і кожен
 * несе `alternates.languages` з посиланням на іншу версію. Це той самий
 * сигнал, що й `hreflang` у `<head>`: без нього Google вважає /en дублем і
 * лишає у видачі лише одну зі сторінок.
 */

/**
 * Один шлях у записах для обох мов.
 *
 * `alternates` однакові в обох — так і має бути: кожна версія перелічує всі,
 * включно з собою.
 */
function entries(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
) {
  const languages = Object.fromEntries(
    LOCALES.map((l) => [l, `${SITE_URL}${localePath(l, path)}`]),
  );

  return LOCALES.map((locale) => ({
    url: `${SITE_URL}${localePath(locale, path)}`,
    alternates: {
      languages: {
        ...languages,
        "x-default": `${SITE_URL}${localePath(DEFAULT_LOCALE, path)}`,
      },
    },
    ...rest,
  }));
}
export default function sitemap(): MetadataRoute.Sitemap {
  // Одна дата на всю збірку: сторінки статичні й оновлюються разом із деплоєм,
  // тож розводити їх різними мітками було б вигадкою.
  const lastModified = new Date();

  return [
    ...entries("/", { lastModified, changeFrequency: "weekly", priority: 1 }),
    ...entries("/poslugy", {
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    }),
    ...CATEGORIES.flatMap((category) =>
      entries(`/poslugy/${category.id}`, {
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...LOCATIONS.flatMap((location) =>
      entries(`/mistsya/${location.slug}`, {
        lastModified,
        changeFrequency: "monthly",
        priority: 0.8,
      }),
    ),
  ];
}
