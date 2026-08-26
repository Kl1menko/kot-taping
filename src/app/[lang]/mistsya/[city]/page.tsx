import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { CityStructuredData } from "@/components/structured-data";
import { BookNowButton } from "@/components/book-now-button";
import { SocialIcon } from "@/components/social-icons";
import { Card, Container, SectionLabel } from "@/components/ui";
import { listPublicServices } from "@/lib/db/public-services";
import { listPublicSchedule } from "@/lib/db/working-days";
import { CATEGORIES } from "@/lib/services";
import { CONTACTS, LOCATIONS, SOCIALS } from "@/lib/contacts";
import { categorySeo, cityBySlug, pageMetadata } from "@/lib/seo";
import { cityLabel, getDictionary } from "@/lib/dictionary";
import { LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n";

export const revalidate = 3600;

/** Кабінети відомі з коду — обидві сторінки прередеряться, решта дає 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    LOCATIONS.map((l) => ({ lang, city: l.slug })),
  );
}

export async function generateMetadata(
  props: PageProps<"/[lang]/mistsya/[city]">,
): Promise<Metadata> {
  const { lang, city } = await props.params;
  const locale: Locale = isLocale(lang) ? lang : "uk";
  const place = cityBySlug(city, locale);
  if (!place) return {};

  return pageMetadata({
    locale,
    // Місто в заголовку — те, за чим шукають: «тейпування Львів».
    title: getDictionary(locale).pages.city.metaTitle.replace(
      "{locative}",
      place.locative,
    ),
    description: place.description,
    path: `/mistsya/${city}`,
    keywords: place.keywords,
  });
}

export default async function CityPage(
  props: PageProps<"/[lang]/mistsya/[city]">,
) {
  const { lang, city } = await props.params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const tc = t.pages.city;

  const place = cityBySlug(city, lang);
  if (!place) notFound();

  const [services, schedule] = await Promise.all([
    listPublicServices(lang),
    listPublicSchedule(),
  ]);
  const present = CATEGORIES.filter((cat) =>
    services.some((s) => s.category === cat.id),
  );

  const other = LOCATIONS.find((l) => l.slug !== city);

  return (
    <>
      <CityStructuredData slug={city} locale={lang} />

      <PageShell services={services} schedule={schedule} t={t} locale={lang}>
        <PageHero
          trailLabel={t.a11y.breadcrumbs}
          eyebrow={place.city}
          title={tc.heroTitle.replace("{locative}", place.locative)}
          lead={place.intro}
          trail={[
            { name: t.pages.home, path: localePath(lang, "/") },
            {
              name: place.city,
              path: localePath(lang, `/mistsya/${city}`),
            },
          ]}
          media={{
            src: "/images/about-portrait.jpg",
            alt: tc.mediaAlt,
            caption: tc.mediaCaption.replace("{address}", place.address),
          }}
        >
          {/* Адреса й години — те, за чим приходять на локальну сторінку.
              У героєві вони відповідають на «де» ще до першого прокруту, а
              нижче йдуть картками разом із рештою контактів. */}
          <dl className="mt-12 grid max-w-[38rem] gap-4 border-t border-line pt-8 sm:grid-cols-2">
            <div>
              <dt className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
                {tc.addressLabel}
              </dt>
              <dd className="mt-3 text-[17px] leading-relaxed">
                {place.address}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
                {tc.hoursLabel}
              </dt>
              <dd className="tnum mt-3 text-[17px] leading-relaxed">
                {tc.hours}
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <BookNowButton size="lg">{t.booking.cta}</BookNowButton>
          </div>
        </PageHero>

        {/* Контакти — головна відповідь локальної сторінки, тож вони йдуть
            одразу після героя, а не губляться у футері. Картками, а не голим
            списком означень: адресу й телефон шукають очима, і кожен має бути
            окремим об'єктом на екрані. */}
        <Reveal>
          <Card as="section" tone="canvas" className="py-20 md:py-24">
            <Container>
              <SectionLabel>{tc.studioLabel}</SectionLabel>
              <h2 className="mt-6 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px]">
                {tc.findUs.replace("{locative}", place.locative)}
              </h2>

              <address className="mt-12 not-italic">
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Адреса повторюється з героя навмисно: там вона — відповідь
                      на «де», тут — частина повного набору контактів, який
                      Google читає як NAP (name-address-phone). Розірвати його
                      заради відсутності повтору означало б послабити локальну
                      видачу. */}
                  <ContactTile label={tc.addressLabel}>
                    {place.address}
                    <br />
                    {place.city}
                  </ContactTile>

                  <ContactTile label={tc.phoneLabel}>
                    <a
                      href={`tel:${CONTACTS.phone}`}
                      className="underline-offset-4 transition-colors hover:underline"
                    >
                      {CONTACTS.phoneDisplay}
                    </a>
                  </ContactTile>

                  <ContactTile label={tc.emailLabel}>
                    <a
                      href={`mailto:${CONTACTS.email}`}
                      className="break-words underline-offset-4 transition-colors hover:underline"
                    >
                      {CONTACTS.email}
                    </a>
                  </ContactTile>

                  <ContactTile label={tc.hoursLabel}>
                    {tc.hours}
                    <span className="mt-1 block text-[14px] text-ink-muted">
                      {tc.byAppointment}
                    </span>
                  </ContactTile>
                </ul>
              </address>

              <nav
                aria-label={t.nav.socials}
                className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-8"
              >
                <span className="mr-2 text-[15px] text-ink-muted">
                  <span aria-hidden="true">/ </span>
                  {tc.write}
                </span>
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
            </Container>
          </Card>
        </Reveal>

        <Reveal>
          <Card as="section" className="py-20 md:py-28">
            <Container>
              <SectionLabel>{t.nav.services}</SectionLabel>

              <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
                <h2 className="max-w-[20ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
                  {tc.whatWeDo.replace("{locative}", place.locative)}
                </h2>
                <p className="max-w-[48ch] text-[16px] leading-relaxed text-ink-muted lg:pb-2">
                  {tc.samePrice}
                </p>
              </div>

              <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {present.map((cat, i) => (
                  <li key={cat.id}>
                    <Link
                      href={localePath(lang, `/poslugy/${cat.id}`)}
                      className="group flex h-full flex-col rounded-[26px] bg-canvas p-6 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none md:p-8"
                    >
                      <span className="tnum text-[13px] text-ink-muted">
                        0{i + 1}
                      </span>
                      <h3 className="mt-4 text-[21px] leading-snug">
                        {t.categories[cat.id].label}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                        {categorySeo(cat.id, lang).description}
                      </p>

                      <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5 text-[14px] text-ink-muted">
                        {tc.pricesLink}
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
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
          </Card>
        </Reveal>

        {other && (
          <Reveal>
            <Card as="section" tone="blush" className="py-20 md:py-24">
              <Container>
                <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-center">
                  <div>
                    <SectionLabel>{tc.otherStudio}</SectionLabel>
                    <h2 className="mt-6 max-w-[18ch] text-[30px] leading-[1.15] sm:text-[38px]">
                      {tc.otherTitle}
                    </h2>
                    <p className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-ink-muted">
                      {tc.otherText}
                    </p>
                  </div>

                  <Link
                    href={localePath(lang, `/mistsya/${other.slug}`)}
                    className="group flex items-center justify-between gap-6 rounded-[26px] bg-surface p-8 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none"
                  >
                    <span>
                      <span className="block text-[26px] leading-tight sm:text-[32px]">
                        {cityLabel(t, other.slug).city || other.city}
                      </span>
                      <span className="mt-3 block text-[15px] text-ink-muted">
                        {cityLabel(t, other.slug).address || other.address}
                      </span>
                    </span>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-canvas text-ink transition-[transform,background-color,color] duration-200 group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5"
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
                </div>
              </Container>
            </Card>
          </Reveal>
        )}
      </PageShell>
    </>
  );
}

/**
 * Плитка контакту.
 *
 * `<li>` з міткою й значенням замість пари `<dt>/<dt>`: список означень
 * усередині `<address>` семантично не хибний, але візуально він розповзався в
 * дві колонки тексту без жодної межі між пунктами.
 */
function ContactTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col rounded-[22px] bg-surface p-6">
      <span className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
      <span className="mt-4 text-[17px] leading-relaxed">{children}</span>
    </li>
  );
}
