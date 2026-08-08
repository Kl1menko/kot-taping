import { Card, Container, SectionLabel } from "./ui";

const TONES = ["bg-sand", "bg-blush", "bg-clay", "bg-sand"];

const STEPS = [
  {
    n: "01",
    title: "Консультація",
    text: "Розбираємо запит, протипоказання та очікування.",
  },
  {
    n: "02",
    title: "Схема",
    text: "Підбираю аплікацію під вашу анатомію й задачу.",
  },
  {
    n: "03",
    title: "Сеанс",
    text: "Наношу тейпи, показую, як носити й знімати.",
  },
  {
    n: "04",
    title: "Підтримка",
    text: "Домашні рекомендації та план наступних візитів.",
  },
];

export function Results() {
  return (
    <Card as="section" id="results" tone="canvas" className="py-20 md:py-28">
      <Container>
      <SectionLabel>Результати</SectionLabel>

      <h2 className="mx-auto mt-10 max-w-[26ch] text-center text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
        Фото «до» та «після» — з дозволу клієнтів
      </h2>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TONES.map((tone, i) => (
          <div
            key={i}
            className={`relative aspect-[3/4] rounded-[var(--radius-tile)] ${tone}`}
          >
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-[13px] uppercase tracking-[0.18em] text-ink-muted">
                До / Після
              </span>
            </div>
          </div>
        ))}
      </div>

      <ol className="mt-16 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.n}>
            <span className="tnum text-[13px] text-ink-muted">{step.n}</span>
            <h3 className="mt-3 text-[19px]">{step.title}</h3>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-ink-muted">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
      </Container>
    </Card>
  );
}
