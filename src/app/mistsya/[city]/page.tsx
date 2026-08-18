import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { CityStructuredData } from "@/components/structured-data";
import { BookNowButton } from "@/components/book-now-button";
import { SocialIcon } from "@/components/social-icons";
import { Card, Container } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { CATEGORIES } from "@/lib/services";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { CATEGORY_SEO, cityBySlug, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

/** Кабінети відомі з коду — обидві сторінки прередеряться, решта дає 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCATIONS.map((l) => ({ city: l.slug }));
}

export async function generateMetadata(
  props: PageProps<"/mistsya/[city]">,
): Promise<Metadata> {
  const { city } = await props.params;
  const place = cityBySlug(city);
  if (!place) return {};

  return pageMetadata({
    // Місто в заголовку — те, за чим шукають: «тейпування Львів».
    title: `Тейпування ${place.locative}`,
    description: place.description,
    path: `/mistsya/${city}`,
    keywords: place.keywords,
  });
}

export default async function CityPage(props: PageProps<"/mistsya/[city]">) {
  const { city } = await props.params;
  const place = cityBySlug(city);
  if (!place) notFound();

  const services = await listPublicServices();
  const present = CATEGORIES.filter((cat) =>
    services.some((s) => s.category === cat.id),
  );

  const other = LOCATIONS.find((l) => l.slug !== city);

  return (
    <>
      <CityStructuredData slug={city} />

      <PageShell
        services={services}
        trail={[
          { name: "Головна", path: "/" },
          { name: place.city, path: `/mistsya/${city}` },
        ]}
      >
        <Card as="section" tone="canvas" className="pb-16 pt-8 md:pb-20">
          <Container>
            {/* Без SectionLabel: місто вже стоїть у крихтах над заголовком. */}
            <h1 className="mt-4 max-w-[22ch] text-[34px] leading-[1.1] sm:text-[44px] lg:text-[52px]">
              Естетичне тейпування {place.locative}
            </h1>
            <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-ink-muted">
              {place.intro}
            </p>

            {/* Адреса й телефон — головна відповідь локальної сторінки, тож
                вони йдуть одразу під вступом, а не в футері. */}
            <address className="mt-10 not-italic">
              <dl className="grid gap-x-10 gap-y-4 text-[16px] sm:grid-cols-[auto_1fr] sm:gap-y-3">
                <dt className="text-ink-muted">Адреса</dt>
                <dd>
                  {place.address}, {place.city}
                </dd>

                <dt className="text-ink-muted">Телефон</dt>
                <dd>
                  <a
                    href={`tel:${CONTACTS.phone}`}
                    className="underline-offset-4 transition-colors hover:underline"
                  >
                    {CONTACTS.phoneDisplay}
                  </a>
                </dd>

                <dt className="text-ink-muted">Пошта</dt>
                <dd>
                  <a
                    href={`mailto:${CONTACTS.email}`}
                    className="underline-offset-4 transition-colors hover:underline"
                  >
                    {CONTACTS.email}
                  </a>
                </dd>

                <dt className="text-ink-muted">Години</dt>
                <dd>Пн–Сб, 10:00–19:00, за попереднім записом</dd>
              </dl>
            </address>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <BookNowButton size="lg">Записатись на сеанс</BookNowButton>

              <nav aria-label="Соцмережі" className="flex flex-wrap gap-2">
                {SOCIALS.map((s) => (
                  <a
                    key={s.id}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${s.label} — ${s.handle}`}
                    className="grid size-11 place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
                  >
                    <SocialIcon id={s.id} />
                  </a>
                ))}
              </nav>
            </div>
          </Container>
        </Card>

        <Card as="section" className="py-16 md:py-20">
          <Container>
            <h2 className="text-[26px] leading-tight sm:text-[32px]">
              Що можна зробити {place.locative}
            </h2>
            <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-ink-muted">
              Обидва кабінети працюють за однаковим прайсом і однаковим
              переліком послуг.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {present.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/poslugy/${cat.id}`}
                    className="flex h-full flex-col rounded-[22px] bg-canvas p-6 transition-colors duration-200 hover:bg-sand"
                  >
                    <h3 className="text-[19px] leading-snug">{cat.label}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                      {CATEGORY_SEO[cat.id].description}
                    </p>
                    <span className="mt-auto pt-5 text-[14px] text-ink-muted">
                      Ціни та опис →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Card>

        {other && (
          <Card as="section" tone="blush" className="py-16 md:py-20">
            <Container>
              <h2 className="text-[26px] leading-tight sm:text-[32px]">
                Другий кабінет
              </h2>
              <p className="mt-4 max-w-[54ch] text-[16px] leading-relaxed text-ink-muted">
                Якщо вам зручніше в іншому місті — приймаю там за тим самим
                прайсом.
              </p>
              <div className="mt-8">
                <Link
                  href={`/mistsya/${other.slug}`}
                  className="inline-flex min-h-[56px] items-center rounded-full bg-surface px-8 text-[16px] transition-colors duration-200 hover:bg-ink hover:text-white"
                >
                  {other.city} — {other.address}
                </Link>
              </div>
            </Container>
          </Card>
        )}
      </PageShell>
    </>
  );
}
