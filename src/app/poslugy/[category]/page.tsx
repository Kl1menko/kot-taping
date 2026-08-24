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
import { plural } from "@/lib/agenda";
import { CATEGORY_SEO, categoryLabel, pageMetadata } from "@/lib/seo";

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
  return CATEGORIES.map((c) => ({ category: c.id }));
}

function seoFor(category: string) {
  return CATEGORY_SEO[category as ServiceCategory] ?? null;
}

export async function generateMetadata(
  props: PageProps<"/poslugy/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  const seo = seoFor(category);
  if (!seo) return {};

  return pageMetadata({
    title: seo.heading,
    description: seo.description,
    path: `/poslugy/${category}`,
    keywords: seo.keywords,
  });
}

export default async function CategoryPage(
  props: PageProps<"/poslugy/[category]">,
) {
  const { category } = await props.params;
  const seo = seoFor(category);
  if (!seo) notFound();

  const [all, schedule] = await Promise.all([
    listPublicServices(),
    listPublicSchedule(),
  ]);
  const services = all.filter((s) => s.category === category);

  // Категорію могли вимкнути в адмінці цілком: показувати заголовок над
  // порожнечею гірше, ніж чесна 404.
  if (services.length === 0) notFound();

  const label = categoryLabel(category as ServiceCategory);

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
      />

      <PageShell services={all} schedule={schedule}>
        <PageHero
          eyebrow={label}
          title={seo.heading}
          lead={seo.intro}
          trail={[
            { name: "Головна", path: "/" },
            { name: "Послуги", path: "/poslugy" },
            { name: label, path: `/poslugy/${category}` },
          ]}
          media={{
            src: `/images/services/${category}.jpg`,
            alt: `${label} — аплікація тейпів`,
            caption: LOCATIONS.map((l) => l.city).join(" · "),
          }}
        >
          <dl className="tnum mt-12 grid max-w-[38rem] grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-3">
            <div>
              <dt className="sr-only">Позицій у групі</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {services.length}
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {plural(services.length, "послуга", "послуги", "послуг")}
                </span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Ціни від</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {floor.toLocaleString("uk-UA")} ₴
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  нижня межа
                </span>
              </dd>
            </div>
            {wear && (
              <div>
                <dt className="sr-only">Тейп тримається</dt>
                <dd>
                  <span className="block text-[28px] leading-none sm:text-[34px]">
                    {wear}
                  </span>
                  <span className="mt-2 block text-[14px] text-ink-muted">
                    носіння тейпу
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-10">
            <BookNowButton size="lg">Записатись на сеанс</BookNowButton>
          </div>
        </PageHero>

        <Reveal>
          <Card as="section" tone="canvas" className="py-20 md:py-28">
            <Container>
              <SectionLabel>Прайс</SectionLabel>

              <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
                <h2 className="max-w-[18ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
                  {label}: ціни
                </h2>
                <p className="max-w-[52ch] text-[16px] leading-relaxed text-ink-muted lg:pb-2">
                  Ціна залежить від зони та обсягу роботи. «Від» означає, що
                  остаточну суму визначаємо на місці після огляду — без
                  сюрпризів уже після процедури.
                </p>
              </div>

              <div className="mt-14">
                <ServiceList services={services} />
              </div>
            </Container>
          </Card>
        </Reveal>

        {/* Кабінети — сторінка категорії має відповідати й на «а де це». */}
        <Reveal>
          <Card as="section" tone="blush" className="py-20 md:py-24">
            <Container>
              <SectionLabel>Кабінети</SectionLabel>
              <h2 className="mt-6 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px]">
                Де записатись
              </h2>

              <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                {LOCATIONS.map((location) => (
                  <li key={location.slug}>
                    <Link
                      href={`/mistsya/${location.slug}`}
                      className="group flex h-full items-center justify-between gap-6 rounded-[22px] bg-surface p-6 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none md:p-8"
                    >
                      <span>
                        <span className="block text-[22px]">
                          {location.city}
                        </span>
                        <span className="mt-2 block text-[15px] text-ink-muted">
                          {location.address}
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
                <SectionLabel>Інші напрями</SectionLabel>
                <h2 className="mt-6 max-w-[22ch] text-[30px] leading-[1.15] sm:text-[38px]">
                  З чим ще працюю
                </h2>

                <ul className="mt-10 flex flex-wrap gap-3">
                  {others.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/poslugy/${c.id}`}
                        className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-canvas pl-6 pr-2 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                      >
                        {c.label}
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
