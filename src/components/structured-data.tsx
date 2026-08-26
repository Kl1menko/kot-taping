import type { Service } from "@/lib/services";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { SITE_URL } from "@/lib/site";
import { getDictionary } from "@/lib/dictionary";
import { DEFAULT_LOCALE, localePath, type Locale } from "@/lib/i18n";

/**
 * Мова розмітки у форматі BCP 47.
 *
 * Розмітка описує конкретну версію сторінки, тож англійська сторінка з
 * `uk-UA` у JSON-LD суперечила б власному `<html lang>` — а суперечливі
 * сигнали Google просто ігнорує.
 */
const JSONLD_LANG: Record<Locale, string> = { uk: "uk-UA", en: "en-US" };
import { categorySeo, cityBySlug, SITE_NAME, categoryLabel } from "@/lib/seo";
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
function businessNode(locale: Locale) {
  return {
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: getDictionary(locale).meta.business,
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
function websiteNode(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: JSONLD_LANG[locale],
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

/**
 * Хлібні крихти — Google показує їх замість голого URL у сніпеті.
 *
 * Шляхи приходять без мовного префікса, а додає його ця функція: інакше
 * крихти англійської сторінки вели б на українські адреси, і Google бачив би
 * ланцюжок, що виходить за межі мовної версії.
 */
function breadcrumbNode(
  trail: { name: string; path: string }[],
  locale: Locale,
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${localePath(locale, item.path)}`,
    })),
  };
}

function faqNode(locale: Locale) {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}${localePath(locale, "/")}#faq`,
    inLanguage: JSONLD_LANG[locale],
    mainEntity: getDictionary(locale).faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// — Розмітка сторінок —

/** Головна: бізнес, сайт, каталог послуг і FAQ. */
export function StructuredData({
  services,
  locale = DEFAULT_LOCALE,
}: {
  services: Service[];
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const catalog = {
    "@type": "OfferCatalog",
    "@id": `${SITE_URL}${localePath(locale, "/")}#catalog`,
    name: t.services.label,
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
        businessNode(locale),
        websiteNode(locale),
        { ...catalog, provider: { "@id": BUSINESS_ID } },
        faqNode(locale),
      ]}
    />
  );
}

/** Сторінка категорії: список послуг + хлібні крихти. */
export function CategoryStructuredData({
  category,
  services,
  locale = DEFAULT_LOCALE,
}: {
  category: ServiceCategory;
  services: Service[];
  locale?: Locale;
}) {
  const path = `/poslugy/${category}`;
  const url = `${SITE_URL}${localePath(locale, path)}`;
  const seo = categorySeo(category, locale);

  return (
    <JsonLd
      graph={[
        websiteNode(locale),
        {
          "@type": "CollectionPage",
          "@id": `${url}#page`,
          url,
          name: seo.heading,
          description: seo.description,
          inLanguage: JSONLD_LANG[locale],
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: getDictionary(locale).pages.home, path: "/" },
          { name: getDictionary(locale).nav.services, path: "/poslugy" },
          { name: categoryLabel(category, locale), path },
        ], locale),
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
export function CatalogStructuredData({
  counts,
  locale = DEFAULT_LOCALE,
}: {
  counts: Record<string, number>;
  locale?: Locale;
}) {
  const path = "/poslugy";
  const url = `${SITE_URL}${localePath(locale, path)}`;

  return (
    <JsonLd
      graph={[
        websiteNode(locale),
        {
          "@type": "CollectionPage",
          "@id": `${url}#page`,
          url,
          name: getDictionary(locale).pages.services.eyebrow,
          inLanguage: JSONLD_LANG[locale],
          isPartOf: { "@id": WEBSITE_ID },
          about: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: getDictionary(locale).pages.home, path: "/" },
          { name: getDictionary(locale).nav.services, path },
        ], locale),
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
export function CityStructuredData({
  slug,
  locale = DEFAULT_LOCALE,
}: {
  slug: string;
  locale?: Locale;
}) {
  // `cityBySlug` уже зводить адресу з текстами й віддає назву міста потрібною
  // мовою — окремий пошук по LOCATIONS тут лише дублював би цю логіку.
  const place = cityBySlug(slug, locale);
  if (!place) return null;

  const path = `/mistsya/${slug}`;
  const url = `${SITE_URL}${localePath(locale, path)}`;

  return (
    <JsonLd
      graph={[
        websiteNode(locale),
        {
          "@type": "HealthAndBeautyBusiness",
          "@id": departmentId(slug),
          name: `${SITE_NAME} — ${place.city}`,
          url,
          description: place.description,
          email: CONTACTS.email,
          telephone: CONTACTS.phone,
          image: `${SITE_URL}/opengraph-image`,
          sameAs: SOCIALS.map((s) => s.href),
          priceRange: "₴₴",
          currenciesAccepted: "UAH",
          openingHoursSpecification: OPENING_HOURS,
          address: address(place),
          areaServed: { "@type": "City", name: place.city },
          parentOrganization: { "@id": BUSINESS_ID },
        },
        breadcrumbNode([
          { name: getDictionary(locale).pages.home, path: "/" },
          { name: place.city, path },
        ], locale),
      ]}
    />
  );
}
