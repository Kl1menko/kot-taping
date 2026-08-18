/**
 * Канонічна адреса сайту.
 *
 * Потрібна там, де відносного шляху не досить: `metadataBase` для OG-картинок,
 * `sitemap.xml`, `robots.txt`, schema.org. Клієнтські компоненти її не читають,
 * але тримати змінну без `NEXT_PUBLIC_` не можна — sitemap і metadata
 * обчислюються під час збірки, а не на запит.
 *
 * Порядок пошуку:
 *   1. NEXT_PUBLIC_SITE_URL — задається вручну, коли є свій домен. Єдиний
 *      варіант, який дає стабільний canonical.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — продакшен-домен проєкту на Vercel. На
 *      відміну від VERCEL_URL він не змінюється з кожним деплоєм, тож canonical
 *      не стрибає між прев'ю-адресами.
 *   3. localhost — щоб `next build` проходив локально без жодного .env.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
