import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Preloader } from "@/components/preloader";
import { SITE_URL } from "@/lib/site";

const grotesque = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-grotesque",
  display: "swap",
});

const DESCRIPTION =
  "Естетичне та лімфодренажне тейпування обличчя і тіла. Індивідуальний підбір схем, гіпоалергенні матеріали, видимий результат після першого сеансу.";

export const metadata: Metadata = {
  // Без цього OG-картинка і canonical лишаються відносними шляхами, а
  // Facebook/Telegram такі не резолвлять — прев'ю при шері виходить порожнім.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kotova Taping — студія естетичного тейпування",
    template: "%s · Kotova Taping",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  keywords: [
    "тейпування обличчя",
    "лімфодренажне тейпування",
    "естетичне тейпування",
    "ліфтинг тейпування",
    "тейпування тіла",
  ],
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: "Kotova Taping",
    title: "Kotova Taping — студія естетичного тейпування",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Kotova Taping — студія естетичного тейпування",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
        {children}
      </body>
    </html>
  );
}
