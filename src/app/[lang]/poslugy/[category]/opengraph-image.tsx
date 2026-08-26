import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { categorySeo } from "@/lib/seo";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/i18n";

/**
 * Прев'ю сторінки категорії.
 *
 * `opengraph-image` не успадковується вниз по дереву маршрутів, тож без цього
 * файлу посилання на категорію в Telegram виглядало б як посилання на головну.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    CATEGORIES.map((c) => ({ lang, category: c.id })),
  );
}

/** Тексти прев'ю тією ж мовою, що й сама сторінка. */
function seoFor(lang: string, category: string) {
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const known = CATEGORIES.some((c) => c.id === category);
  return known ? categorySeo(category as ServiceCategory, locale) : null;
}

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ lang: string; category: string }>;
}) {
  const { lang, category } = await params;
  const seo = seoFor(lang, category);
  return [
    {
      id: "og",
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
      alt: seo ? `${seo.heading} — Kotova Taping` : "Kotova Taping",
    },
  ];
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; category: string }>;
}) {
  const { lang, category } = await params;
  const seo = seoFor(lang, category);

  // Заголовок ріжемо по словах у два рядки: Satori не переносить сам, а
  // довгі назви категорій («Лімфодренажне тейпування обличчя та шиї») в один
  // рядок не лягають.
  const words = (
    seo?.heading ?? (lang === "en" ? "Taping" : "Тейпування")
  ).split(" ");
  const mid = Math.ceil(words.length / 2);
  const title =
    words.length > 3
      ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")]
      : [words.join(" ")];

  return ogImage({ title });
}
