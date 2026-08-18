import type { Service } from "@/lib/services";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { FAQ_ITEMS } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { CATEGORY_SEO, CITY_SEO, SITE_NAME, categoryLabel } from "@/lib/seo";
import type { ServiceCategory } from "@/lib/services";

/**
 * Schema.org markup.
 *
 * Один граф на сторінку замість купки незалежних блоків: сутності зшиті через
 * `@id`, тож пошуковик бачить, що послуга належить саме цьому бізнесу, а
 * хлібні крихти ведуть саме на цю сторінку. Розрізнені `<script>` він теж
 * прочитає, але зв'язків між ними не збудує.
 *
 * Кабінетів два, тому кожен описано окремим `department` зі своєю адресою —
 * а не однією `address` на весь бізнес. Для локальної видачі це суттєво:
 * Львів і Київ мають знаходитись незалежно.
 *
 * Геокоординат тут свідомо немає: точних не маємо, а вигадані відправили б
 * людину не за тією адресою.
 */

/** Один `<script>` на весь граф — див. коментар вище. */
function JsonLd({ graph }: { graph: unknown[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}

const BUSINESS_ID = `${SITE_URL}/#business`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Години роботи в машиночитному вигляді — Google показує їх у картці. */
const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    opens: "10:00",
    closes: "19:00",
  },
];

/** Адреса кабінету — та сама форма для бізнесу й для сторінки міста. */
function address(location: (typeof LOCATIONS)[number]) {
  return {
    "@type": "PostalAddress",
    streetAddress: location.address,
    addressLocality: location.city,
    addressCountry: "UA",
  };
}

function departmentId(slug: string) {
  return `${SITE_URL}/mistsya/${slug}#business`;
}

/**
 * Сам бізнес. `HealthAndBeautyBusiness` — підтип `LocalBusiness`, саме він
 * дає право на локальну картку у видачі.
 */
function businessNode() {
  return {
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Студія естетичного та лімфодренажного тейпування обличчя і тіла.",
    email: CONTACTS.email,
    telephone: CONTACTS.phone,
    image: `${SITE_URL}/opengraph-image`,
    sameAs: SOCIALS.map((s) => s.href),
    priceRange: "₴₴",
    currenciesAccepted: "UAH",
    openingHoursSpecification: OPENING_HOURS,
    areaServed: LOCATIONS.map((l) => ({ "@type": "City", name: l.city })),
    availableLanguage: ["uk", "en"],
    department: LOCATIONS.map((location) => ({
      "@type": "HealthAndBeautyBusiness",
      "@id": departmentId(location.slug),
      name: `${SITE_NAME} — ${location.city}`,
      url: `${SITE_URL}/mistsya/${location.slug}`,
      telephone: CONTACTS.phone,
      email: CONTACTS.email,
      priceRange: "₴₴",
      openingHoursSpecification: OPENING_HOURS,
      address: address(location),
    })),
  };
}

/** Сайт як сутність — зв'язує сторінки з бізнесом і дає назву в видачі. */
function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "uk-UA",
    publisher: { "@id": BUSINESS_ID },
  };
}

/**
 * Послуга як окрема сутність.
 *
 * «від X ₴» — нижня межа, а не фіксована ціна, тож оголошуємо саме так:
 * `minPrice` замість `price`. Інакше Google показав би у видачі точну суму,
 * якої людина не отримає.
 */
function serviceNode(service: Service, url: string) {
  return {
    "@type": "Service",
    "@id": `${url}#${service.slug}`,
    name: service.title,
    description: service.summary,
    serviceType: categoryLabel(service.category),
    url,
    provider: { "@id": BUSINESS_ID },
    areaServed: LOCATIONS.map((l) => ({ "@type": "City", name: l.city })),
    offers: {
      "@type": "Offer",
      priceCurrency: "UAH",
      availability: "https://schema.org/InStock",
      ...(service.priceFrom
        ? {
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "UAH",
              minPrice: service.price,
            },
          }
        : { price: service.price }),
    },
  };
}

/** Хлібні крихти — Google показує їх замість голого URL у сніпеті. */
function breadcrumbNode(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

function faqNode() {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// — Розмітка сторінок —

/** Головна: бізнес, сайт, каталог послуг і FAQ. */
export function StructuredData({ services }: { services: Service[] }) {
  const catalog = {
    "@type": "OfferCatalog",
    "@id": `${SITE_URL}/#catalog`,
    name: "Послуги тейпування",
    itemListElement: services.map((service) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: service.title },
      priceCurrency: "UAH",
      ...(service.priceFrom
        ? {
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "UAH",
              minPrice: service.price,
            },
          }
        : { price: service.price }),
    })),
  };

  return (
    <JsonLd
      graph={[
        businessNode(),
        websiteNode(),
        { ...catalog, provider: { "@id": BUSINESS_ID } },
        faqNode(),
      ]}
    />
  );
}

/** Сторінка категорії: список послуг + хлібні крихти. */
export function CategoryStructuredData({
  category,
  services,
}: {
  category: ServiceCategory;
  services: Service[];
}) {
  const path = `/poslugy/${category}`;
  const url = `${SITE_URL}${path}`;
  const seo = CATEGORY_SEO[category];

  return (
    <JsonLd
      graph={[
        websiteNode(),
        {
          "@type": "CollectionPage",
          "@id": `${url}#page`,
          url,
          name: seo.heading,
          description: seo.description,
          inLanguage: "uk-UA",
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: "Головна", path: "/" },
          { name: "Послуги", path: "/poslugy" },
          { name: categoryLabel(category), path },
        ]),
        // Порядок у списку — той самий, що на сторінці: Google звіряє розмітку
        // з видимим текстом і не любить розбіжностей.
        {
          "@type": "ItemList",
          "@id": `${url}#list`,
          numberOfItems: services.length,
          itemListElement: services.map((service, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: serviceNode(service, url),
          })),
        },
      ]}
    />
  );
}

/** Каталог послуг: перелік категорій. */
export function CatalogStructuredData({ counts }: { counts: Record<string, number> }) {
  const path = "/poslugy";
  const url = `${SITE_URL}${path}`;

  return (
    <JsonLd
      graph={[
        websiteNode(),
        {
          "@type": "CollectionPage",
          "@id": `${url}#page`,
          url,
          name: "Послуги та ціни",
          inLanguage: "uk-UA",
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: "Головна", path: "/" },
          { name: "Послуги", path },
        ]),
        {
          "@type": "ItemList",
          "@id": `${url}#list`,
          itemListElement: Object.entries(counts).map(([id, count], i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: categoryLabel(id as ServiceCategory),
            url: `${SITE_URL}/poslugy/${id}`,
            description: `${count} послуг у категорії`,
          })),
        },
      ]}
    />
  );
}

/**
 * Сторінка міста.
 *
 * Головна сутність тут — кабінет (`department`), а не бізнес загалом: сторінка
 * відповідає на «де у Львові», і саме кабінет має потрапити в локальну видачу.
 * Через `@id` він той самий вузол, що й у графі головної, — не дубль.
 */
export function CityStructuredData({ slug }: { slug: string }) {
  const location = LOCATIONS.find((l) => l.slug === slug);
  const seo = CITY_SEO[slug];
  if (!location || !seo) return null;

  const path = `/mistsya/${slug}`;
  const url = `${SITE_URL}${path}`;

  return (
    <JsonLd
      graph={[
        websiteNode(),
        {
          "@type": "HealthAndBeautyBusiness",
          "@id": departmentId(slug),
          name: `${SITE_NAME} — ${location.city}`,
          url,
          description: seo.description,
          email: CONTACTS.email,
          telephone: CONTACTS.phone,
          image: `${SITE_URL}/opengraph-image`,
          sameAs: SOCIALS.map((s) => s.href),
          priceRange: "₴₴",
          currenciesAccepted: "UAH",
          openingHoursSpecification: OPENING_HOURS,
          address: address(location),
          areaServed: { "@type": "City", name: location.city },
          parentOrganization: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: "Головна", path: "/" },
          { name: location.city, path },
        ]),
      ]}
    />
  );
}
