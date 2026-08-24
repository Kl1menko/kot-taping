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
  const [services, schedule] = await Promise.all([
    listPublicServices(),
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
      <CatalogStructuredData counts={counts} />

      <PageShell services={services} schedule={schedule}>
        <PageHero
          eyebrow="Послуги та ціни"
          title="Тейпування обличчя й тіла — усі напрями"
          lead="Шість напрямів роботи: від лімфодренажу й моделювання обличчя до м'язевих та неврологічних корекцій. Схема в кожному випадку підбирається під запит — нижче ціни й опис кожної групи, щоб було з чого починати розмову."
          trail={[
            { name: "Головна", path: "/" },
            { name: "Послуги", path: "/poslugy" },
          ]}
          media={{
            src: "/images/services/lymph-face.jpg",
            alt: "Лімфодренажна аплікація тейпів на обличчі та шиї",
            caption: "Схему підбираємо на місці — після огляду, а не за прайсом.",
          }}
        >
          {/* Три числа замість голої кнопки: скільки послуг, від якої ціни й
              де приймаємо. Це той мінімум, за яким людина вирішує, читати
              далі чи закрити вкладку. */}
          <dl className="tnum mt-12 grid max-w-[38rem] grid-cols-3 gap-4 border-t border-line pt-8">
            <div>
              <dt className="sr-only">Послуг у прайсі</dt>
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
            <div>
              <dt className="sr-only">Кабінети</dt>
              <dd>
                <span className="block text-[28px] leading-none sm:text-[34px]">
                  {LOCATIONS.length}
                </span>
                <span className="mt-2 block text-[14px] text-ink-muted">
                  {plural(LOCATIONS.length, "кабінет", "кабінети", "кабінетів")}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <BookNowButton size="lg">Записатись на сеанс</BookNowButton>
          </div>
        </PageHero>

        <Reveal>
          <Card as="section" tone="canvas" className="py-20 md:py-28">
            <Container>
              <SectionLabel>Напрями</SectionLabel>

              <h2 className="mt-6 max-w-[24ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
                Шість груп — оберіть ту, з якою прийшли
              </h2>

              <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {present.map((cat, i) => {
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
                                від {cheapest.price.toLocaleString("uk-UA")} ₴
                              </span>
                            </span>
                          </span>

                          <span className="flex flex-1 flex-col rounded-[20px] bg-canvas p-5">
                            <h3 className="text-[21px] leading-snug">
                              {cat.label}
                            </h3>
                            <span className="mt-2 block text-[15px] leading-relaxed text-ink-muted">
                              {seo.description}
                            </span>

                            <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 text-[14px] text-ink-muted">
                              <span className="tnum">
                                {inCategory.length}{" "}
                                {plural(
                                  inCategory.length,
                                  "послуга",
                                  "послуги",
                                  "послуг",
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
          <CityLinks />
        </Reveal>
      </PageShell>
    </>
  );
}

/** Два кабінети внизу сторінки — і перелінковка, і відповідь на «де». */
function CityLinks() {
  return (
    <Card as="section" tone="blush" className="py-20 md:py-24">
      <Container>
        <SectionLabel>Кабінети</SectionLabel>
        <h2 className="mt-6 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px]">
          Приймаю у двох містах
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {LOCATIONS.map((location) => (
            <li key={location.slug}>
              <Link
                href={`/mistsya/${location.slug}`}
                className="group flex h-full items-center justify-between gap-6 rounded-[22px] bg-surface p-6 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none md:p-8"
              >
                <span>
                  <span className="block text-[22px]">{location.city}</span>
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
  );
}
