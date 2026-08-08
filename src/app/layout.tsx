import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Preloader } from "@/components/preloader";

const grotesque = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-grotesque",
  display: "swap",
});

const DESCRIPTION =
  "Естетичне та лімфодренажне тейпування обличчя і тіла. Індивідуальний підбір схем, гіпоалергенні матеріали, видимий результат після першого сеансу.";

export const metadata: Metadata = {
  title: {
    default: "Kotova Taping — студія естетичного тейпування",
    template: "%s · Kotova Taping",
  },
  description: DESCRIPTION,
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={grotesque.variable}>
      <body className="min-h-dvh antialiased">
        <Preloader />
        {children}
      </body>
    </html>
  );
}
