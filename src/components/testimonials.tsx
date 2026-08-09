import { Card, Container, SectionLabel } from "./ui";
import { TESTIMONIALS as REVIEWS } from "@/lib/content";

export function Testimonials() {
  return (
    <Card as="section" className="py-20 md:py-28">
      <Container>
      <SectionLabel>Відгуки</SectionLabel>

      <h2 className="mx-auto mt-10 max-w-[22ch] text-center text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
        Що кажуть клієнти після курсу
      </h2>

      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <li
            key={review.author}
            className="flex flex-col rounded-[var(--radius-tile)] bg-canvas p-6 md:p-8"
          >
            <figure className="flex h-full flex-col">
              <span
                aria-hidden="true"
                className="text-[44px] leading-none text-ink-muted"
              >
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-[18px] leading-relaxed">
                {review.quote}
              </blockquote>
              <figcaption className="mt-8 border-t border-line pt-5 text-[15px]">
                {review.author}
                <span className="text-ink-muted"> — {review.detail}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      </Container>
    </Card>
  );
}
