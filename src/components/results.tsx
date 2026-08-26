"use client";

import { useRef } from "react";
import Image from "next/image";
import { Card, SectionLabel } from "./ui";

/**
 * Готові колажі «до/після» — картинка вже містить обидва кадри й підписи,
 * тому компонент лише розкладає їх стрічкою, не будуючи порівняння сам.
 */
const RESULTS = [
  { src: "neck", alt: "Підборіддя та шия до і після курсу тейпування" },
  { src: "face-profile", alt: "Овал обличчя в профіль до і після тейпування" },
  { src: "belly", alt: "Живіт до і після лімфодренажного тейпування" },
  { src: "legs-back", alt: "Задня поверхня стегон до і після тейпування" },
  { src: "legs-side", alt: "Гомілки до і після лімфодренажного тейпування" },
] as const;

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

/** Кругла стрілка гортання — та сама форма, що й у стрічці наборів. */
function ScrollButton({
  onClick,
  label,
  back,
}: {
  onClick: () => void;
  label: string;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 cursor-pointer place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-4 ${back ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export function Results() {
  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * Крок гортання беремо з реальної ширини картки, а не з константи: вона
   * різна на брейкпоінтах, і зашите число розійшлося б із версткою.
   */
  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <Card as="section" id="results" tone="canvas" className="py-20 md:py-28">
      <div className="mx-auto w-full max-w-[1360px] px-5 md:px-10">
        <SectionLabel>Результати</SectionLabel>

        <h2 className="mx-auto mt-10 max-w-[26ch] text-center text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
          Фото «до» та «після» — з дозволу клієнтів
        </h2>

        {/* Один рядок із горизонтальним гортанням, а не сітка: колажі
            вертикальні, і в сітці п'ять таких плиток розтягували б секцію на
            кілька екранів.

            Bleed у гутер (`-mx-*` + `px-*`) дає крайнім карткам лягти врівень
            із краєм екрана під час гортання; `overscroll-x-contain` не пускає
            свайп за межу далі в документ. Пропорція 9:16 — колажі зроблені під
            сторіз, інша обрізала б підписи «before/after» на самій картинці. */}
        <div
          ref={trackRef}
          className={[
            "mt-12 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2",
            "overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:-mx-10 md:px-10",
          ].join(" ")}
        >
          {RESULTS.map((item) => (
            <div
              key={item.src}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
            >
              <div className="relative aspect-[9/16] overflow-hidden rounded-[var(--radius-tile)] bg-sand">
                <Image
                  src={`/images/results/${item.src}.webp`}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 78vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Стрілки лише з десктопа: на телефоні гортають пальцем. */}
        <div aria-hidden="true" className="mt-5 hidden justify-end gap-2 lg:flex">
          <ScrollButton onClick={() => scrollBy(-1)} label="Назад" back />
          <ScrollButton onClick={() => scrollBy(1)} label="Далі" />
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
      </div>
    </Card>
  );
}
