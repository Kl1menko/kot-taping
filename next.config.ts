import type { NextConfig } from "next";

/**
 * Заголовки безпеки.
 *
 * CSP тут свідомо немає: Next інлайнить скрипти для гідратації, тож без
 * nonce-проксі політика або ламає сторінку, або зводиться до `unsafe-inline`
 * і не захищає ні від чого. Це окрема робота — зробити її варто разом із
 * перевіркою на реальному деплої, а не наосліп.
 *
 * Нижче — те, що дає користь без ризику щось зламати.
 */
const securityHeaders = [
  // Проти clickjacking: адмінку не має бути видно в чужому iframe.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Сайт не просить ні камери, ні мікрофона, ні геолокації.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS має сенс лише поверх HTTPS; на localhost браузер його ігнорує.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Сторінки адмінки містять телефони й нотатки про здоров'я клієнтів.
        // Проміжні кеші не мають тримати їх у себе навіть на секунду.
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
