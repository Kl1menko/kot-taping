import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Preloader } from "@/components/preloader";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

const grotesque = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-grotesque",
  display: "swap",
  // Метрики запасного шрифта підганяються під Manrope, тож при підміні текст
  // не стрибає. Це прямо зменшує CLS — один із трьох Core Web Vitals.
  adjustFontFallback: true,
  fallback: ["system-ui", "arial"],
});

/**
 * Ідентифікатор лічильника (формат `G-XXXXXXX`).
 *
 * NEXT_PUBLIC_, бо тег працює в браузері — це не секрет: він і так видимий
 * у розмітці будь-якого сайту з аналітикою.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  // Без цього OG-картинка і canonical лишаються відносними шляхами, а
  // Facebook/Telegram такі не резолвлять — прев'ю при шері виходить порожнім.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kotova Taping — студія естетичного тейпування у Львові та Києві",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Телефони в тексті iOS підсвічує сам і фарбує їх у синє, ламаючи типографіку.
  // Номер у нас і так клікабельний там, де це доречно.
  formatDetection: { telephone: false, address: false, email: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: SITE_NAME,
    title: "Kotova Taping — студія естетичного тейпування",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kotova Taping — студія естетичного тейпування",
    description: SITE_DESCRIPTION,
  },
  /**
   * `max-image-preview:large` — щоб у видачі показувалась велика картинка, а
   * не мініатюра: для візуальної послуги це прямо впливає на клікабельність.
   * Решта знімає обмеження на довжину сніпета.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  /**
   * Код підтвердження прав у Search Console. Задається змінною оточення —
   * поки її немає, тег просто не виводиться, і це не помилка: підтвердити
   * права можна й через DNS, не чіпаючи код.
   */
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  // iOS не читає icons з маніфесту — потрібен окремий apple-touch-icon.
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Kotova",
    statusBarStyle: "default",
  },
};

/**
 * `themeColor` живе тут, а не в `metadata`: у metadata він застарілий із
 * Next 14. Колір той самий, що фон сторінки, — так адресний рядок на телефоні
 * зливається зі сторінкою замість білої смуги над нею.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning — лише для <html>: розширення браузера
  // (LanguageTool, Grammarly тощо) дописують сюди свої атрибути ще до
  // гідратації, і React лається на різницю, якої в нашому коді немає.
  // Прапорець діє на атрибути самого тега, не на вміст сторінки.
  return (
    <html lang="uk" className={grotesque.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Preloader />
        {/*
          Пропустити навігацію.

          Видимий лише у фокусі: той, хто йде з клавіатури, інакше щоразу
          протискає всю шапку, щоб дістатись вмісту. Мишею його не видно, тож
          на макет він не впливає.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-6 focus:py-3 focus:text-[15px] focus:text-white"
        >
          Перейти до вмісту
        </a>
        {children}
      </body>

      {/*
        Google Analytics.

        Офіційний компонент Next замість пари <script> із довідки Google: той
        сніпет написано для звичайного HTML, у JSX він не збирається, а
        головне — рахував би лише перший екран. У App Router перехід між
        сторінками не перезавантажує документ, тож `gtag('config')`, виконаний
        один раз, більше не спрацював би. Компонент відстежує такі переходи
        сам і вантажить gtag.js після гідратації, не змагаючись із героєм за
        канал.

        Поруч живуть Vercel Web Analytics і Speed Insights — див.
        `analytics.tsx`, там же пояснено, навіщо два лічильники. Умову на
        GA_ID знято саме тому: без неї Vercel-аналітика не вмикалася б доти,
        доки не заданий ключ Google, хоч вона від нього не залежить. Порожній
        `NEXT_PUBLIC_GA_ID` тепер гасить лише сам gtag. Адмінку виключає
        обгортка.
      */}
      <Analytics gaId={GA_ID} />
    </html>
  );
}
