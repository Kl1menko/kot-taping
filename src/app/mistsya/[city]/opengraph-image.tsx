import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { LOCATIONS } from "@/lib/contacts";
import { cityBySlug } from "@/lib/seo";

/** Прев'ю сторінки кабінету — з містом і адресою замість спільного слогана. */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return LOCATIONS.map((l) => ({ city: l.slug }));
}

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const place = cityBySlug(city);
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
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const place = cityBySlug(city);

  return ogImage({
    title: place
      ? ["Естетичне тейпування", place.locative]
      : ["Естетичне тейпування"],
    // Адреса замість загального слогана: сторінку міста шерять саме щоб
    // показати, де це.
    subtitle: place ? place.address : undefined,
  });
}
