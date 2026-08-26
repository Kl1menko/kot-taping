import Image from "next/image";
import { Card, SectionLabel } from "./ui";
import type { Dictionary } from "@/lib/dictionary";

export function About({ t }: { t: Dictionary }) {
  return (
    <Card as="section" id="about">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="relative min-h-[420px] bg-clay lg:min-h-[620px]">
          <Image
            src="/images/about-portrait.jpg"
            alt={t.about.portraitAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover object-center"
          />
        </div>

        <div className="flex flex-col justify-center px-5 py-16 md:px-14 md:py-20 lg:pr-[var(--gutter-edge-lg)]">
          <SectionLabel>{t.about.label}</SectionLabel>

          <h2 className="mt-8 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px] lg:text-[44px]">
            {t.about.title}
          </h2>

          <div className="mt-8 max-w-[52ch] space-y-4 text-[17px] leading-relaxed text-ink-muted">
            {t.about.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-8 text-center sm:text-left">
            {t.about.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="tnum block text-[30px] leading-none sm:text-[36px]">
                    {fact.value}
                  </span>
                  <span className="mt-2 block text-[14px] text-ink-muted">
                    {fact.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}
