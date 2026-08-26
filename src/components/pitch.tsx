import { Container } from "./ui";
import { BookNowButton } from "./book-now-button";
import type { Dictionary } from "@/lib/dictionary";

export function Pitch({ t }: { t: Dictionary }) {
  return (
    <section className="bg-ink py-20 text-white md:py-28">
      <Container>
      <p className="text-[15px] text-white/60">
        <span aria-hidden="true">/ </span>
        {t.pitch.label}
      </p>

      <h2 className="mt-8 max-w-[20ch] text-[30px] leading-[1.12] sm:text-[42px] lg:text-[52px]">
        {t.pitch.title}
      </h2>

      <dl className="mt-14 grid gap-8 border-t border-white/15 pt-10 md:grid-cols-3">
        {t.pitch.points.map((point) => (
          <div key={point.title}>
            <dt className="text-[19px]">{point.title}</dt>
            <dd className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-white/60">
              {point.text}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12">
        <BookNowButton tone="light">{t.pitch.cta}</BookNowButton>
      </div>
      </Container>
    </section>
  );
}
