import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/page-shell";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { CatalogStructuredData } from "@/components/structured-data";
import { BookNowButton } from "@/components/book-now-button";
import { Card, Container, SectionLabel } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { listPublicSchedule } from "@/lib/db/working-days";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";
import { categorySeo, pageMetadata } from "@/lib/seo";
import { cityLabel, getDictionary, type Dictionary } from "@/lib/dictionary";
import {
  formatNumber,
  isLocale,
  localePath,
  pluralForm,
  type Locale,
} from "@/lib/i18n";
import { notFound } from "next/navigation";

/** Той самий інтервал, що й на головній: прайс приходить із бази. */
export const revalidate = 3600;

/** Опис каталогу для кожної мови — в `<meta>` і в OG-прев'ю. */
const CATALOG_SEO: Record<Locale, { description: string; keywords: string[] }> =
  {
    uk: {
      description:
        "Повний прайс студії Kotova Taping: лімфодренаж обличчя й тіла, " +
        "моделювання, м'язеві та неврологічні корекції. Ціни, тривалість " +
        "носіння тейпу, запис у Львові та Києві.",
      keywords: [
        "тейпування ціни",
        "прайс тейпування",
        "естетичне тейпування послуги",
        "лімфодренажне тейпування ціна",
      ],
    },
    en: {
      description:
        "The full Kotova Taping price list: face and body lymphatic " +
        "drainage, contouring, muscle and neurological support. Prices, wear " +
        "time, booking in Lviv and Kyiv.",
      keywords: [
        "taping prices",
        "kinesio taping price list",
        "aesthetic taping services",
        "lymphatic drainage taping cost",
      ],
    },
  };

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/poslugy">): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "uk";
  const t = getDictionary(locale);

  return pageMetadata({
    locale,
    title: t.pages.services.eyebrow,
    description: CATALOG_SEO[locale].description,
    path: "/poslugy",
    keywords: CATALOG_SEO[locale].keywords,
  });
}

export default async function ServicesCatalog({
  params,
}: PageProps<"/[lang]/poslugy">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const tp = t.pages.services;

  const [services, schedule] = await Promise.all([
    listPublicServices(lang),
    listPublicSchedule(),
  ]);

  // Порожні категорії ховаємо: майстриня може вимкнути всю групу в адмінці, і
  // посилання на сторінку без жодної послуги було б обіцянкою, якої немає.
  const present = CATEGORIES.filter((cat) =>
    services.some((s) => s.category === cat.id),
  );

  const counts = Object.fromEntries(
    present.map((cat) => [
      cat.id,
      services.filter((s) => s.category === cat.id).length,
    ]),
  );

  // Нижня межа прайсу для підпису під героєм: перше число, яке шукають очима.
  const floor = services.reduce((min, s) => (s.price < min ? s.price : min),
    services[0]?.price ?? 0);

  return (
    <>
      <CatalogStructuredData counts={counts} locale={lang} />

      <PageShell services={services} schedule={schedule} t={t} locale={lang}>
        <PageHero
          trailLabel={t.a11y.breadcrumbs}
          eyebrow={tp.eyebrow}
          title={tp.title}
          lead={tp.lead}
          trail={[
            { name: t.pages.home, path: localePath(lang, "/") },
            { name: t.nav.services, path: localePath(lang, "/poslugy") },
          ]}
          media={{
            src: "/images/services/lymph-face.jpg",
            alt: tp.mediaAlt,
            caption: tp.mediaCaption,
          }}
        >
          {/* Три числа замість голої кнопки: скільки послуг, від якої ціни й
              де приймаємо. Це той мінімум, за яким людина вирішує, читати
              далі чи закрити вкладку. */}
          <dl className="tnum mt-12 grid max-w-[38rem] grid-cols-3 gap-4 border-t border-line pt-8">
            <div>
              <dt className="sr-only">{tp.countLabel}</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {services.length}
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {pluralForm(lang, services.length, tp.serviceForms)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{tp.priceLabel}</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {formatNumber(lang, floor)} ₴
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {tp.priceFloor}
                </span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{tp.officesLabel}</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {LOCATIONS.length}
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {pluralForm(lang, LOCATIONS.length, tp.officeForms)}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <BookNowButton size="lg">{t.booking.cta}</BookNowButton>
          </div>
        </PageHero>

        <Reveal>
          <Card as="section" tone="canvas" className="py-20 md:py-28">
            <Container>
              <SectionLabel>{tp.groupsLabel}</SectionLabel>

              <h2 className="mt-6 max-w-[24ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
                {tp.groupsTitle}
              </h2>

              <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {present.map((cat, i) => {
                  const seo = categorySeo(cat.id as ServiceCategory, lang);
                  const inCategory = services.filter(
                    (s) => s.category === cat.id,
                  );
                  // «Від скількох» — найдешевша послуга групи: це те число, яке
                  // людина шукає очима першим.
                  const cheapest = inCategory.reduce((min, s) =>
                    s.price < min.price ? s : min,
                  );

                  return (
                    <li key={cat.id}>
                      <article className="h-full">
                        <Link
                          href={localePath(lang, `/poslugy/${cat.id}`)}
                          className="group flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] motion-reduce:transform-none"
                        >
                          <span className="relative block aspect-[16/11] overflow-hidden rounded-[20px] bg-sand">
                            <Image
                              src={`/images/services/${cat.id}.jpg`}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] motion-reduce:transform-none"
                            />

                            {/* Затемнення знизу — щоб білий пілл із ціною не
                                зливався зі світлим знімком. */}
                            <span
                              aria-hidden="true"
                              className="absolute inset-x-0 bottom-0 block h-24 bg-gradient-to-t from-black/30 to-transparent"
                            />

                            <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                              <span className="tnum text-[13px] text-white/85">
                                0{i + 1}
                              </span>
                              {/* `formatPrice` сам додає «від», коли ціна
                                  нижня межа; тут «від» стоїть завжди — це
                                  найдешевша позиція групи, а не сама послуга. */}
                              <span className="tnum grid min-h-[40px] shrink-0 place-items-center whitespace-nowrap rounded-full bg-ink px-4 text-[15px] text-white">
                                {t.services.from} {formatNumber(lang, cheapest.price)} ₴
                              </span>
                            </span>
                          </span>

                          <span className="flex flex-1 flex-col rounded-[20px] bg-canvas p-5">
                            <h3 className="text-[21px] leading-snug">
                              {t.categories[cat.id].label}
                            </h3>
                            <span className="mt-2 block text-[15px] leading-relaxed text-ink-muted">
                              {seo.description}
                            </span>

                            <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 text-[14px] text-ink-muted">
                              <span className="tnum">
                                {inCategory.length}{" "}
                                {pluralForm(
                                  lang,
                                  inCategory.length,
                                  tp.serviceForms,
                                )}
                              </span>
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-white">
                                <svg
                                  viewBox="0 0 24 24"
                                  className="size-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M5 12h14M13 6l6 6-6 6" />
                                </svg>
                              </span>
                            </span>
                          </span>
                        </Link>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </Container>
          </Card>
        </Reveal>

        {/* Кабінети — каталог має відповідати й на «а де це». */}
        <Reveal>
          <CityLinks t={t} locale={lang} />
        </Reveal>
      </PageShell>
    </>
  );
}

/** Два кабінети внизу сторінки — і перелінковка, і відповідь на «де». */
function CityLinks({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <Card as="section" tone="blush" className="py-20 md:py-24">
      <Container>
        <SectionLabel>{t.pages.services.officesLabel}</SectionLabel>
        <h2 className="mt-6 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px]">
          {t.pages.services.citiesTitle}
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {LOCATIONS.map((location) => (
            <li key={location.slug}>
              <Link
                href={localePath(locale, `/mistsya/${location.slug}`)}
                className="group flex h-full items-center justify-between gap-6 rounded-[22px] bg-surface p-6 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none md:p-8"
              >
                <span>
                  <span className="block text-[22px]">
                    {cityLabel(t, location.slug).city || location.city}
                  </span>
                  <span className="mt-2 block text-[15px] text-ink-muted">
                    {cityLabel(t, location.slug).address || location.address}
                  </span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-canvas text-ink transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Card>
  );
}
