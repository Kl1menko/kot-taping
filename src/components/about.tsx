import Image from "next/image";
import { Card, SectionLabel } from "./ui";

const FACTS = [
  { value: "6", label: "років практики" },
  { value: "900+", label: "проведених сеансів" },
  { value: "4", label: "профільні сертифікації" },
];

export function About() {
  return (
    <Card as="section" id="about">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="relative min-h-[420px] bg-clay lg:min-h-[620px]">
          <Image
            src="/images/about-portrait.jpg"
            alt="Моделююче тейпування нижньої третини обличчя"
            fill
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover object-center"
          />
        </div>

        <div className="flex flex-col justify-center px-5 py-16 md:px-14 md:py-20 lg:pr-[var(--gutter-edge-lg)]">
          <SectionLabel>Про мене</SectionLabel>

          <h2 className="mt-8 max-w-[20ch] text-[30px] leading-[1.15] sm:text-[38px] lg:text-[44px]">
            Працюю з обличчям як з системою, а не набором зморшок
          </h2>

          <div className="mt-8 max-w-[52ch] space-y-4 text-[17px] leading-relaxed text-ink-muted">
            <p>
              Тейпування — це не про «наклеїти стрічку». Це робота з лімфотоком,
              тонусом м&#39;язів і фасціями. Перед першим сеансом ми розбираємо
              вашу історію: набряки, сон, навантаження, попередні процедури.
            </p>
            <p>
              На основі цього я збираю індивідуальну схему й показую, як
              підтримувати результат удома між візитами.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-8">
            {FACTS.map((fact) => (
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
