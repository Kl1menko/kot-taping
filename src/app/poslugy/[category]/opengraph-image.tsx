import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { CATEGORY_SEO } from "@/lib/seo";

/**
 * Прев'ю сторінки категорії.
 *
 * `opengraph-image` не успадковується вниз по дереву маршрутів, тож без цього
 * файлу посилання на категорію в Telegram виглядало б як посилання на головну.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const seo = CATEGORY_SEO[category as ServiceCategory];
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
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const seo = CATEGORY_SEO[category as ServiceCategory];

  // Заголовок ріжемо по словах у два рядки: Satori не переносить сам, а
  // довгі назви категорій («Лімфодренажне тейпування обличчя та шиї») в один
  // рядок не лягають.
  const words = (seo?.heading ?? "Тейпування").split(" ");
  const mid = Math.ceil(words.length / 2);
  const title =
    words.length > 3
      ? [words.slice(0, mid).join(" "), words.slice(mid).join(" ")]
      : [words.join(" ")];

  return ogImage({ title });
}
