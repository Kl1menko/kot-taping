import { Suspense } from "react";
import { Hero } from "@/components/hero";
import { Services } from "@/components/services";
import { Pitch } from "@/components/pitch";
import { About } from "@/components/about";
import { Results } from "@/components/results";
import { Testimonials } from "@/components/testimonials";
import { Faq } from "@/components/faq";
import { Booking } from "@/components/booking";
import { SiteFooter } from "@/components/site-footer";
import { MobileCta } from "@/components/mobile-cta";
import { Reveal } from "@/components/reveal";
import { StructuredData } from "@/components/structured-data";
import { BookingModalProvider } from "@/components/booking-modal";

export default function Home() {
  return (
    <BookingModalProvider>
      <StructuredData />
      <main className="pb-24 md:pb-0">
        <Hero />
        <Reveal>
          <Services />
        </Reveal>
        <Reveal>
          <Pitch />
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
          <Faq />
        </Reveal>
        <Reveal>
          <Suspense fallback={null}>
            <Booking />
          </Suspense>
        </Reveal>
        <SiteFooter />
      </main>
      <MobileCta />
    </BookingModalProvider>
  );
}
