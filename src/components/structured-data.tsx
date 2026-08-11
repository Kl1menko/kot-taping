import type { Service } from "@/lib/services";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { FAQ_ITEMS } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/**
 * Schema.org markup.
 *
 * Кабінетів два, тому кожен описано окремим `department` зі своєю адресою —
 * а не однією `address` на весь бізнес. Для локальної видачі це суттєво:
 * Львів і Київ мають знаходитись незалежно.
 *
 * Геокоординат тут свідомо немає: точних не маємо, а вигадані відправили б
 * людину не за тією адресою.
 */
export function StructuredData({ services }: { services: Service[] }) {
  const business = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": `${SITE_URL}/#business`,
    name: "Kotova Taping",
    url: SITE_URL,
    description:
      "Студія естетичного та лімфодренажного тейпування обличчя і тіла.",
    email: CONTACTS.email,
    telephone: CONTACTS.phone,
    sameAs: SOCIALS.map((s) => s.href),
    priceRange: "₴₴",
    openingHours: "Mo-Sa 10:00-19:00",
    department: LOCATIONS.map((location) => ({
      "@type": "HealthAndBeautyBusiness",
      name: `Kotova Taping — ${location.city}`,
      telephone: CONTACTS.phone,
      priceRange: "₴₴",
      openingHours: "Mo-Sa 10:00-19:00",
      address: {
        "@type": "PostalAddress",
        streetAddress: location.address,
        addressLocality: location.city,
        addressCountry: "UA",
      },
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Послуги тейпування",
      itemListElement: services.map((service) => ({
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
