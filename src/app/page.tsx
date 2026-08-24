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

/**
 * Сторінка статична, але з терміном придатності.
 *
 * Прайс тепер приходить із бази, тож назавжди прередерена сторінка показувала б
 * учорашні ціни. `revalidatePath("/")` в адмінці скидає кеш одразу після
 * правки, а цей інтервал — страховка на випадок змін повз адмінку (SQL-редактор
 * Supabase, `db:seed`): найпізніше через годину сайт наздожене базу.
 */
export const revalidate = 3600;

export default async function Home() {
  // Один запит на сторінку: прайс потрібен і карткам, і формі запису, і
  // schema.org — читаємо його тут і передаємо вниз, щоб не ходити в базу тричі.
  const [services, kits, schedule] = await Promise.all([
    listPublicServices(),
    listPublicKits(),
    listPublicSchedule(),
  ]);

  return (
    <BookingModalProvider services={services} schedule={schedule}>
      <StructuredData services={services} />
      <main id="main" className="pb-24 md:pb-0">
        <Hero />
        <Reveal>
          <Services services={services} />
        </Reveal>
        <Reveal>
          <Pitch />
        </Reveal>
        <Reveal>
          <Kits kits={kits} />
        </Reveal>
        <Reveal>
          <About />
        </Reveal>
        <Reveal>
          <Results />
        </Reveal>
        <Reveal>
          <Testimonials />
        </Reveal>
        <Reveal>
          <Gallery />
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
        <Reveal>
          <Booking />
        </Reveal>
        <SiteFooter />
      </main>
      <MobileCta />
    </BookingModalProvider>
  );
}
