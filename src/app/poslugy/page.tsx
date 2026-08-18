import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/page-shell";
import { CatalogStructuredData } from "@/components/structured-data";
import { Card, Container } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { CATEGORIES, type ServiceCategory } from "@/lib/services";
import { plural } from "@/lib/agenda";
import { CATEGORY_SEO, pageMetadata } from "@/lib/seo";

/** Той самий інтервал, що й на головній: прайс приходить із бази. */
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Послуги та ціни",
  description:
    "Повний прайс студії Kotova Taping: лімфодренаж обличчя й тіла, " +
    "моделювання, м'язеві та неврологічні корекції. Ціни, тривалість носіння " +
    "тейпу, запис у Львові та Києві.",
  path: "/poslugy",
  keywords: [
    "тейпування ціни",
    "прайс тейпування",
    "естетичне тейпування послуги",
    "лімфодренажне тейпування ціна",
  ],
});

export default async function ServicesCatalog() {
  const services = await listPublicServices();

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

  return (
    <>
      <CatalogStructuredData counts={counts} />

      <PageShell
        services={services}
        trail={[
          { name: "Головна", path: "/" },
          { name: "Послуги", path: "/poslugy" },
        ]}
      >
        <Card as="section" tone="canvas" className="pb-16 pt-8 md:pb-24">
          <Container>
            {/* Без SectionLabel: над заголовком уже стоять крихти
                «Головна / Послуги», і мітка повторювала б те саме слово. */}
            <h1 className="mt-4 max-w-[20ch] text-[34px] leading-[1.1] sm:text-[44px] lg:text-[52px]">
              Тейпування обличчя й тіла — усі напрями
            </h1>
            <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-ink-muted">
              Шість напрямів роботи: від лімфодренажу й моделювання обличчя до
              м&apos;язевих та неврологічних корекцій. Схема в кожному випадку
              підбирається під запит — нижче ціни й опис кожної групи, щоб було
              з чого починати розмову.
            </p>

            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {present.map((cat) => {
                const seo = CATEGORY_SEO[cat.id as ServiceCategory];
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
                        href={`/poslugy/${cat.id}`}
                        className="group flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] motion-reduce:transform-none"
                      >
                        <span className="relative block aspect-[16/11] overflow-hidden rounded-[20px] bg-sand">
                          <Image
                            src={`/images/services/${cat.id}.jpg`}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover"
                          />
                        </span>

                        <span className="flex flex-1 flex-col rounded-[20px] bg-canvas p-5">
                          <h2 className="text-[21px] leading-snug">
                            {cat.label}
                          </h2>
                          <span className="mt-2 block text-[15px] leading-relaxed text-ink-muted">
                            {seo.description}
                          </span>

                          <span className="tnum mt-auto flex items-center justify-between gap-3 pt-5 text-[14px] text-ink-muted">
                            <span>
                              {inCategory.length}{" "}
                              {plural(
                                inCategory.length,
                                "послуга",
                                "послуги",
                                "послуг",
                              )}
                            </span>
                            {/* `formatPrice` сам додає «від», коли ціна
                                нижня межа; тут «від» стоїть завжди — це
                                найдешевша позиція групи, а не сама послуга. */}
                            <span className="text-ink">
                              від {cheapest.price.toLocaleString("uk-UA")} ₴
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
      </PageShell>
    </>
  );
}
