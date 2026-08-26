import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { CategoryStructuredData } from "@/components/structured-data";
import { ServiceList } from "@/components/service-list";
import { BookNowButton } from "@/components/book-now-button";
import { Card, Container, SectionLabel } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { listPublicSchedule } from "@/lib/db/working-days";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";
import { categorySeo, categoryLabel, pageMetadata } from "@/lib/seo";
import { cityLabel, getDictionary } from "@/lib/dictionary";
import {
  LOCALES,
  formatNumber,
  isLocale,
  localePath,
  pluralForm,
  type Locale,
} from "@/lib/i18n";

export const revalidate = 3600;

/**
 * Шість категорій відомі з коду, тож усі сторінки прередеряться на збірці —
 * краулер отримує готовий HTML без походу в базу.
 *
 * `dynamicParams = false` закриває решту: будь-який інший слаг у URL віддасть
 * 404 одразу, а не збірку сторінки на льоту. Для SEO це важливо — вигадані
 * адреси не мають ставати «м'якими 404» зі статусом 200.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  // Обидві мови × шість категорій: усі дванадцять сторінок прередеряться.
  return LOCALES.flatMap((lang) =>
    CATEGORIES.map((c) => ({ lang, category: c.id })),
  );
}

function seoFor(category: string, locale: Locale) {
  const known = CATEGORIES.some((c) => c.id === category);
  return known ? categorySeo(category as ServiceCategory, locale) : null;
}

export async function generateMetadata(
  props: PageProps<"/[lang]/poslugy/[category]">,
): Promise<Metadata> {
  const { lang, category } = await props.params;
  const locale: Locale = isLocale(lang) ? lang : "uk";
  const seo = seoFor(category, locale);
  if (!seo) return {};

  return pageMetadata({
    locale,
    title: seo.heading,
    description: seo.description,
    path: `/poslugy/${category}`,
    keywords: seo.keywords,
  });
}

export default async function CategoryPage(
  props: PageProps<"/[lang]/poslugy/[category]">,
) {
  const { lang, category } = await props.params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const tc = t.pages.category;

  const seo = seoFor(category, lang);
  if (!seo) notFound();

  const [all, schedule] = await Promise.all([
    listPublicServices(lang),
    listPublicSchedule(),
  ]);
  const services = all.filter((s) => s.category === category);

  // Категорію могли вимкнути в адмінці цілком: показувати заголовок над
  // порожнечею гірше, ніж чесна 404.
  if (services.length === 0) notFound();

  const label = categoryLabel(category as ServiceCategory, lang);

  // Нижня межа прайсу групи й діапазон носіння — два числа, за якими людина
  // вирішує, чи читати список цілком.
  const floor = services.reduce((min, s) => (s.price < min ? s.price : min),
    services[0].price);
  const wear = services.find((s) => s.wear)?.wear;

  // Решта категорій — перелінковка внизу. Без неї кожна сторінка була б
  // тупиком: і для людини, і для краулера, який роздає вагу по посиланнях.
  const others = CATEGORIES.filter(
    (c) => c.id !== category && all.some((s) => s.category === c.id),
  );

  return (
    <>
      <CategoryStructuredData
        category={category as ServiceCategory}
        services={services}
        locale={lang}
      />

      <PageShell services={all} schedule={schedule} t={t} locale={lang}>
        <PageHero
          trailLabel={t.a11y.breadcrumbs}
          eyebrow={label}
          title={seo.heading}
          lead={seo.intro}
          trail={[
            { name: t.pages.home, path: localePath(lang, "/") },
            { name: t.nav.services, path: localePath(lang, "/poslugy") },
            {
              name: label,
              path: localePath(lang, `/poslugy/${category}`),
            },
          ]}
          media={{
            src: `/images/services/${category}.jpg`,
            alt: tc.mediaAlt.replace("{category}", label),
            caption: LOCATIONS.map(
              (l) => cityLabel(t, l.slug).city || l.city,
            ).join(" · "),
          }}
        >
          <dl className="tnum mt-12 grid max-w-[38rem] grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-3">
            <div>
              <dt className="sr-only">{tc.countLabel}</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {services.length}
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {pluralForm(
                    lang,
                    services.length,
                    t.pages.services.serviceForms,
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t.pages.services.priceLabel}</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {formatNumber(lang, floor)} ₴
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {t.pages.services.priceFloor}
                </span>
              </dd>
            </div>
            {wear && (
              <div>
                <dt className="sr-only">{tc.wearLabel}</dt>
                <dd>
                  <span className="block text-[28px] leading-none sm:text-[34px]">
                    {wear}
                  </span>
                  <span className="mt-2 block text-[14px] text-ink-muted">
                    {tc.wearCaption}
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-10">
            <BookNowButton size="lg">{t.booking.cta}</BookNowButton>
          </div>
        </PageHero>

        <Reveal>
          <Card as="section" tone="canvas" className="py-20 md:py-28">
            <Container>
              <SectionLabel>{tc.priceLabel}</SectionLabel>

              <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
                <h2 className="max-w-[18ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
                  {tc.priceTitle.replace("{category}", label)}
                </h2>
                <p className="max-w-[52ch] text-[16px] leading-relaxed text-ink-muted lg:pb-2">
                  {tc.priceNote}
                </p>
              </div>

              <div className="mt-14">
                <ServiceList services={services} t={t} />
              </div>
            </Container>
          </Card>
        </Reveal>

        {/* Кабінети — сторінка категорії має відповідати й на «а де це». */}
        <Reveal>
          <Card as="section" tone="blush" className="py-20 md:py-24">
            <Container>
              <SectionLabel>{t.pages.services.officesLabel}</SectionLabel>
              <h2 className="mt-6 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px]">
                {tc.whereTitle}
              </h2>

              <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                {LOCATIONS.map((location) => (
                  <li key={location.slug}>
                    <Link
                      href={localePath(lang, `/mistsya/${location.slug}`)}
                      className="group flex h-full items-center justify-between gap-6 rounded-[22px] bg-surface p-6 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none md:p-8"
                    >
                      <span>
                        <span className="block text-[22px]">
                          {cityLabel(t, location.slug).city || location.city}
                        </span>
                        <span className="mt-2 block text-[15px] text-ink-muted">
                          {cityLabel(t, location.slug).address ||
                            location.address}
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
        </Reveal>

        {others.length > 0 && (
          <Reveal>
            <Card as="section" className="py-20 md:py-24">
              <Container>
                <SectionLabel>{tc.othersLabel}</SectionLabel>
                <h2 className="mt-6 max-w-[22ch] text-[30px] leading-[1.15] sm:text-[38px]">
                  {tc.othersTitle}
                </h2>

                <ul className="mt-10 flex flex-wrap gap-3">
                  {others.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={localePath(lang, `/poslugy/${c.id}`)}
                        className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-canvas pl-6 pr-2 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                      >
                        {t.categories[c.id].label}
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink transition-transform duration-200 group-hover:translate-x-0.5">
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
          </Reveal>
        )}
      </PageShell>
    </>
  );
}
