import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Лендінг односторінковий: секції — це якорі, а не маршрути, і в sitemap їм
 * не місце (пошуковики індексують сторінку, а не `#services`). Тому єдиний
 * запис. Коли з'являться окремі сторінки послуг — додавати сюди.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
