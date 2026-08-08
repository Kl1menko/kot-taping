import { SERVICES } from "@/lib/services";
import { CONTACTS, SOCIALS } from "@/lib/contacts";
import { FAQ_ITEMS } from "./faq";

/**
 * Schema.org markup. The street address is still missing — add `address` once
 * the studio location is confirmed.
 */
export function StructuredData() {
  const business = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "Kotova Taping",
    description:
      "Студія естетичного та лімфодренажного тейпування обличчя і тіла.",
    email: CONTACTS.email,
    sameAs: SOCIALS.map((s) => s.href),
    priceRange: "₴₴",
    openingHours: "Mo-Sa 10:00-19:00",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Послуги тейпування",
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service.title },
        // "від X ₴" is a lower bound, not a fixed price — declare it as such.
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "UAH",
          ...(service.priceFrom
            ? { minPrice: service.price }
            : { price: service.price }),
        },
      })),
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
