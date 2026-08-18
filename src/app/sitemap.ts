import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";

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
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Одна дата на всю збірку: сторінки статичні й оновлюються разом із деплоєм,
  // тож розводити їх різними мітками було б вигадкою.
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/poslugy`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...CATEGORIES.map((category) => ({
      url: `${SITE_URL}/poslugy/${category.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...LOCATIONS.map((location) => ({
      url: `${SITE_URL}/mistsya/${location.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
