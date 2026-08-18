import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { CategoryStructuredData } from "@/components/structured-data";
import { ServiceList } from "@/components/service-list";
import { BookNowButton } from "@/components/book-now-button";
import { Card, Container } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";
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

  const all = await listPublicServices();
  const services = all.filter((s) => s.category === category);

  // Категорію могли вимкнути в адмінці цілком: показувати заголовок над
  // порожнечею гірше, ніж чесна 404.
  if (services.length === 0) notFound();

  const label = categoryLabel(category as ServiceCategory);

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

      <PageShell
        services={all}
        trail={[
          { name: "Головна", path: "/" },
          { name: "Послуги", path: "/poslugy" },
          { name: label, path: `/poslugy/${category}` },
        ]}
      >
        <Card as="section" tone="canvas" className="pb-16 pt-8 md:pb-20">
          <Container>
            {/* Без SectionLabel: назва категорії вже стоїть у крихтах прямо
                над заголовком — мітка повторювала б те саме слово. */}
            <h1 className="mt-4 max-w-[22ch] text-[34px] leading-[1.1] sm:text-[44px] lg:text-[52px]">
              {seo.heading}
            </h1>
            <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink-muted">
              {seo.intro}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <BookNowButton size="lg">Записатись на сеанс</BookNowButton>
              <span className="text-[15px] text-ink-muted">
                {LOCATIONS.map((l) => l.city).join(" · ")}
              </span>
            </div>
          </Container>
        </Card>

        <Card as="section" className="py-16 md:py-20">
          <Container>
            <h2 className="text-[26px] leading-tight sm:text-[32px]">
              {label}: ціни
            </h2>
            <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-ink-muted">
              Ціна залежить від зони та обсягу роботи. «Від» означає, що
              остаточну суму визначаємо на місці після огляду — без сюрпризів
              уже після процедури.
            </p>

            <div className="mt-10">
              <ServiceList services={services} />
            </div>
          </Container>
        </Card>

        {/* Кабінети — сторінка категорії має відповідати й на «а де це». */}
        <Card as="section" tone="blush" className="py-16 md:py-20">
          <Container>
            <h2 className="text-[26px] leading-tight sm:text-[32px]">
              Де записатись
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {LOCATIONS.map((location) => (
                <li key={location.slug}>
                  <Link
                    href={`/mistsya/${location.slug}`}
                    className="flex h-full flex-col rounded-[22px] bg-surface p-6 transition-colors duration-200 hover:bg-canvas"
                  >
                    <span className="text-[20px]">{location.city}</span>
                    <span className="mt-2 text-[15px] text-ink-muted">
                      {location.address}
                    </span>
                    <span className="mt-4 text-[14px] text-ink-muted underline-offset-4">
                      Про кабінет →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Card>

        {others.length > 0 && (
          <Card as="section" tone="canvas" className="py-16 md:py-20">
            <Container>
              <h2 className="text-[26px] leading-tight sm:text-[32px]">
                Інші напрями
              </h2>
              <ul className="mt-8 flex flex-wrap gap-3">
                {others.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/poslugy/${c.id}`}
                      className="inline-flex min-h-[48px] items-center rounded-full bg-surface px-6 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
          </Card>
        )}
      </PageShell>
    </>
  );
}
