import { Eyebrow, PillButton } from "./ui";
import { BookNowButton } from "./book-now-button";
import { SiteHeader } from "./site-header";
import { HeroVideo } from "./hero-video";

export function Hero() {
  return (
    <section className="bg-surface">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
        {/* Left: header + headline + CTA */}
        <div className="flex flex-col">
          <SiteHeader />

          <div className="flex flex-1 flex-col justify-center px-5 pb-14 pt-10 md:px-10 md:pb-20 md:pt-16 lg:pl-[var(--gutter-edge-sm)]">
            <Eyebrow>Естетичне тейпування</Eyebrow>
            <h1 className="mt-6 text-[40px] leading-[1.05] sm:text-[54px] lg:text-[68px]">
              Повертаємо тілу свіжість без ін&#39;єкцій
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-muted">
              Лімфодренажні та ліфтингові схеми, підібрані індивідуально під
              ваш запит. Гіпоалергенні тейпи, помітний результат уже після
              першого сеансу.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
              <BookNowButton size="lg">Записатись</BookNowButton>
              <PillButton
                href="#services"
                tone="light"
                size="lg"
                className="ring-1 ring-inset ring-line"
              >
                Послуги та ціни
              </PillButton>
            </div>
          </div>
        </div>

        {/* Right: video block, full-bleed to the screen edge */}
        <div className="relative min-h-[420px] overflow-hidden bg-sand lg:min-h-0">
          <HeroVideo />

          {/* Scrim so the caption stays legible over any frame */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 via-black/45 to-transparent"
          />

          <p className="absolute bottom-8 right-5 z-10 max-w-[30ch] text-right text-[15px] leading-relaxed text-white md:right-10">
            <span aria-hidden="true">/ </span>
            Тейп працює 24 години на добу — навіть уві сні.
          </p>
        </div>
      </div>
    </section>
  );
}
