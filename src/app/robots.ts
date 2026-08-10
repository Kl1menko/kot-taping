import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Адмінка закрита проксі й `requireSession()`, тож у видачу вона не потрапить
 * у будь-якому разі. Disallow тут — щоб краулер не витрачав бюджет на серію
 * редиректів на /admin/login.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
