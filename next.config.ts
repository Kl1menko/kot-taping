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

/**
 * Хост Supabase зі змінної оточення — без падіння, якщо її не задано:
 * `next.config` читається і там, де бази немає (лінт, аналіз бандла), а
 * валити збірку через відсутню картинку було б надмірно.
 */
const supabaseHost = (() => {
  try {
    return process.env.SUPABASE_URL
      ? new URL(process.env.SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    // AVIF перший: на фото він дає помітно менший файл за WebP при тій самій
    // якості. Браузер, який його не вміє, отримає WebP — Next віддає за
    // Accept, тож старі клієнти нічого не втрачають.
    formats: ["image/avif", "image/webp"],
    // Оптимізована картинка незмінна: URL містить параметри розміру та якості,
    // тож нова версія отримає нову адресу. Рік у кеші економить повторні
    // перекодування й раунди до сервера.
    minimumCacheTTL: 31536000,
    /**
     * Фото послуг лежать у Supabase Storage (міграція 0015), тож `next/image`
     * має право їх оптимізувати. Хост беремо зі `SUPABASE_URL` — прибивати
     * конкретний проєкт у конфіг не можна: у dev, staging і проді він різний.
     *
     * Шлях звужено до публічних об'єктів саме нашого bucket: ширший патерн
     * зробив би з оптимізатора відкритий проксі для будь-якої адреси на тому
     * хості. Змінної немає (збірка без бази) — список лишається порожнім і
     * зовнішні знімки просто не проходять, що чесніше за мовчазний доступ.
     */
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/service-images/**",
          },
        ]
      : [],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Відео й статичні картинки з `public/` Next кешем не завідує: без
        // цього заголовка браузер перепитує їх умовним запитом на кожному
        // візиті. Імена файлів стабільні, тож при заміні контенту файл треба
        // перейменувати — інакше рік у кеші зіграє проти нас.
        source: "/:path*.:ext(jpg|jpeg|png|webp|avif|svg|mp4|webm|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
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
