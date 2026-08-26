import { Card, Container, SectionLabel } from "./ui";
import type { Dictionary } from "@/lib/dictionary";

export function Faq({ t }: { t: Dictionary }) {
  return (
    <Card as="section" id="faq" tone="canvas" className="py-20 md:py-28">
      <Container>
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionLabel>{t.faq.label}</SectionLabel>
          <h2 className="mt-8 max-w-[16ch] text-[30px] leading-[1.15] sm:text-[38px]">
            {t.faq.title}
          </h2>
        </div>

        <div className="divide-y divide-line border-t border-line">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[18px] leading-snug [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-transform duration-200 group-open:rotate-45"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-muted">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
      </Container>
    </Card>
  );
}
