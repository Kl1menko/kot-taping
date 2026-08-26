import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { LOCATIONS } from "@/lib/contacts";
import { cityBySlug } from "@/lib/seo";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";

/** Прев'ю сторінки кабінету — з містом і адресою замість спільного слогана. */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    LOCATIONS.map((l) => ({ lang, city: l.slug })),
  );
}

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ lang: string; city: string }>;
}) {
  const { lang, city } = await params;
  const place = cityBySlug(city, isLocale(lang) ? lang : DEFAULT_LOCALE);
  return [
    {
      id: "og",
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
      alt: place
        ? `Kotova Taping ${place.locative} — ${place.address}`
        : "Kotova Taping",
    },
  ];
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; city: string }>;
}) {
  const { lang, city } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const place = cityBySlug(city, locale);
  const heading = getDictionary(locale).hero.eyebrow;

  return ogImage({
    title: place ? [heading, place.locative] : [heading],
    // Адреса замість загального слогана: сторінку міста шерять саме щоб
    // показати, де це.
    subtitle: place ? place.address : undefined,
  });
}
