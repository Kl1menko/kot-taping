"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Card, SectionLabel } from "./ui";
import { SocialIcon } from "./social-icons";
import { SOCIALS } from "@/lib/contacts";
import { KitForm } from "./kit-form";
import { formatKitPrice, type Kit } from "@/lib/kits";
import { Sheet } from "./kit-sheet";
import type { Dictionary } from "@/lib/dictionary";

/** Фони плиток по колу — та сама палітра, що й у картках послуг. */
const TILE_TONES = ["bg-blush", "bg-sand", "bg-clay"];

/** Кругла стрілка гортання — та сама форма, що й у решті кнопок сайту. */
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
      className="grid size-11 cursor-pointer place-items-center rounded-full bg-canvas text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
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

/**
 * Набори для самотейпування вдома.
 *
 * Секція навмисно не називається «Набори»: у прайсі послуг уже є категорія
 * «Набори» — курси процедур у студії. Дві різні речі під одним словом на одній
 * сторінці читалися б як одна.
 *
 * Тло `canvas`, а не типове для `Card` `surface`: секція стоїть перед «Про
 * мене», і на однаковому тлі стик між ними зникав би — два екрани зливалися в
 * одну суцільну площину.
 */
export function Kits({ kits, t }: { kits: Kit[]; t: Dictionary }) {
  const [openKit, setOpenKit] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * Гортання на ширину однієї картки.
   *
   * Крок беремо з реальної ширини першої картки, а не з константи: вона різна
   * на трьох брейкпоінтах, і зашите число розсинхронізувалося б із версткою
   * при першій же правці.
   */
  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (kits.length === 0) return null;

  return (
    <Card as="section" id="kits" tone="canvas">
      <div className="px-5 py-16 md:px-14 md:py-20 lg:px-[var(--gutter-edge-lg)]">
        <div className="max-w-[52ch]">
          <SectionLabel>{t.kitForm.sectionLabel}</SectionLabel>
          <h2 className="mt-8 text-[30px] leading-[1.15] sm:text-[38px] lg:text-[42px]">
            {t.kitForm.sectionTitle}
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-muted">
            {t.kitForm.sectionText}
          </p>
        </div>

        {/* Слайдер, а не сітка.
            Наборів п'ять — на телефоні сітка витягувалася б у довгий стовпчик,
            через який доводиться прокручувати всю секцію. Горизонтальна стрічка
            показує, що варіантів більше, одним поглядом.

            Bleed у гутер (`-mx-*` + `px-*`) дає першій і останній картці лягти
            врівень із краєм екрана під час гортання; `overscroll-x-contain`
            не пускає свайп за межу далі в документ — обидва прийоми вже
            використані у стрічці категорій послуг. */}
        <div
          ref={trackRef}
          className={[
            "mt-12 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2",
            "overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "md:-mx-14 md:px-14 lg:-mx-[var(--gutter-edge-lg)] lg:px-[var(--gutter-edge-lg)]",
          ].join(" ")}
        >
          {kits.map((kit, i) => (
            <div
              key={kit.slug}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
            >
              <button
                type="button"
                onClick={() => setOpenKit(kit.slug)}
                aria-label={t.kitForm.orderAria.replace("{kit}", kit.title)}
                className={[
                  "group flex h-full w-full cursor-pointer flex-col rounded-[26px] bg-surface p-3 text-left",
                  "transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)]",
                  "hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]",
                  "motion-reduce:transform-none",
                ].join(" ")}
              >
                {/* Фото зони, розкроєної під набір. Тон під ним лишається
                    запасним тлом: поки знімок вантажиться, картка не блимає
                    сірим прямокутником. */}
                <span
                  className={`relative block aspect-[16/10] overflow-hidden rounded-[20px] ${TILE_TONES[i % TILE_TONES.length]}`}
                >
                  <Image
                    src={`/images/kits/${kit.slug}.jpg`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 78vw"
                    className="object-cover"
                  />
                </span>

                <span className="flex flex-1 flex-col px-3 pb-2 pt-5">
                  <span className="text-[20px] leading-snug">{kit.title}</span>
                  <span className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-muted">
                    {kit.summary}
                  </span>

                  <span className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-[15px] text-ink-muted">
                      {formatKitPrice(kit)}
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Стрілки лише з десктопа: на телефоні гортають пальцем, і кнопки там
            тільки з'їдали б місце. `aria-hidden` — бо сама стрічка вже
            доступна з клавіатури прокруткою. */}
        <div aria-hidden="true" className="mt-5 hidden justify-end gap-2 lg:flex">
          <ScrollButton onClick={() => scrollBy(-1)} label={t.kits.prev} back />
          <ScrollButton onClick={() => scrollBy(1)} label={t.kits.next} />
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setOpenKit(kits[0].slug)}
            className="min-h-[56px] cursor-pointer rounded-full bg-ink px-8 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
          >
            {t.kitForm.orderCta}
          </button>

          {/* Спосіб 1 з маршруту: хто не любить форми — пише напряму. */}
          <div className="flex items-center gap-3">
            <span className="text-[15px] text-ink-muted">
              {t.kitForm.orDirect}
            </span>
            <nav aria-label={t.nav.socials} className="flex gap-2">
              {SOCIALS.filter((s) => s.id !== "facebook").map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${s.label} — ${s.handle}`}
                  className="grid size-11 place-items-center rounded-full bg-canvas text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
                >
                  <SocialIcon id={s.id} />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <Sheet
        open={openKit !== null}
        onClose={() => setOpenKit(null)}
        title={t.kits.orderTitle}
        eyebrow={t.kitForm.kitLabel}
        closeLabel={t.kitForm.close}
      >
        {openKit && (
          <KitForm t={t}
            kits={kits}
            preselected={openKit}
            onDone={() => setOpenKit(null)}
          />
        )}
      </Sheet>
    </Card>
  );
}
