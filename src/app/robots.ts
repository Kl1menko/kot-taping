import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Адмінка закрита проксі й `requireSession()`, тож у видачу вона не потрапить
 * у будь-якому разі. Disallow тут — щоб краулер не витрачав бюджет на серію
 * редиректів на /admin/login.
 *
 * `?service=` закриваємо окремо: параметр лише переднастроює форму запису й
 * не змінює вміст сторінки. Без цього рядка кожне посилання з картки послуги
 * виглядало б для краулера окремою сторінкою-дублем.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/*?service="],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
