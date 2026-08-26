import { Hero } from "@/components/hero";
import { Services } from "@/components/services";
import { Pitch } from "@/components/pitch";
import { About } from "@/components/about";
import { Results } from "@/components/results";
import { Testimonials } from "@/components/testimonials";
import { Gallery } from "@/components/gallery";
import { Faq } from "@/components/faq";
import { Kits } from "@/components/kits";
import { Booking } from "@/components/booking";
import { SiteFooter } from "@/components/site-footer";
import { MobileCta } from "@/components/mobile-cta";
import { Reveal } from "@/components/reveal";
import { StructuredData } from "@/components/structured-data";
import { BookingModalProvider } from "@/components/booking-modal";
import { listPublicServices } from "@/lib/db/public-services";
import { listPublicSchedule } from "@/lib/db/working-days";
import { listPublicKits } from "@/lib/db/public-kits";
import { getDictionary } from "@/lib/dictionary";
import { pageMetadata } from "@/lib/seo";
import { isLocale, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

/**
 * Сторінка статична, але з терміном придатності.
 *
 * Прайс тепер приходить із бази, тож назавжди прередерена сторінка показувала б
 * учорашні ціни. `revalidatePath("/")` в адмінці скидає кеш одразу після
 * правки, а цей інтервал — страховка на випадок змін повз адмінку (SQL-редактор
 * Supabase, `db:seed`): найпізніше через годину сайт наздожене базу.
 */
export const revalidate = 3600;

/**
 * Метадані головної для кожної мови.
 *
 * Заголовок і опис приходять зі словника: англійська версія з українським
 * описом у видачі виглядала б помилкою, а не двомовністю.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "uk";
  const t = getDictionary(locale);

  return pageMetadata({
    locale,
    title: t.meta.home.title,
    description: t.meta.home.description,
    path: "/",
  });
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  // Один запит на сторінку: прайс потрібен і карткам, і формі запису, і
  // schema.org — читаємо його тут і передаємо вниз, щоб не ходити в базу тричі.
  const [services, kits, schedule] = await Promise.all([
    listPublicServices(lang),
    listPublicKits(lang),
    listPublicSchedule(),
  ]);

  return (
    <BookingModalProvider
      services={services}
      schedule={schedule}
      t={t}
      locale={lang}
    >
      <StructuredData services={services} locale={lang} />
      <main id="main" className="pb-24 md:pb-0">
        <Hero t={t} locale={lang} />
        <Reveal>
          <Services services={services} t={t} locale={lang} />
        </Reveal>
        <Reveal>
          <Pitch t={t} />
        </Reveal>
        <Reveal>
          <Kits kits={kits} t={t} />
        </Reveal>
        <Reveal>
          <About t={t} />
        </Reveal>
        <Reveal>
          <Results t={t} />
        </Reveal>
        <Reveal>
          <Testimonials t={t} />
        </Reveal>
        <Reveal>
          <Gallery t={t} />
        </Reveal>
        <Reveal>
          <Faq t={t} />
        </Reveal>
        <Reveal>
          <Booking t={t} />
        </Reveal>
        <SiteFooter t={t} locale={lang} />
      </main>
      <MobileCta t={t} />
    </BookingModalProvider>
  );
}
