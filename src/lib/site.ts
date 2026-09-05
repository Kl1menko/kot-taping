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

/**
 * Чи можна давати цю адресу банку.
 *
 * `SITE_URL` має відкат на localhost, щоб `next build` проходив без жодного
 * .env, — і саме цей відкат один раз уже поїхав у продакшен: рахунки
 * виставлялись із `webHookUrl: http://localhost:3000/...`, банк не міг
 * достукатись, статуси назавжди лишались `created`, а гроші тим часом
 * списувались. Помилка мовчазна за побудовою: в адмінці все виглядає
 * справним, видно її лише з боку банку.
 *
 * Тому адресу, яка нікуди не веде ззовні, перевіряємо явно — до створення
 * рахунку, а не після.
 */
export function isPubliclyReachable(url: string = SITE_URL): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // http:// банк не прийме навіть на справжньому домені — вебхук лише https.
  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  // Петля й посилання на себе: 127.0.0.0/8, ::1.
  if (host === "::1" || /^127\./.test(host)) return false;
  // Приватні діапазони — тунель назовні їх не замінює.
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  // Домен без крапки (`http://myserver`) назовні не резолвиться.
  if (!host.includes(".")) return false;

  return true;
}
