import Image from "next/image";
import type { ReactNode } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { Eyebrow } from "./ui";

/**
 * Перший екран внутрішньої сторінки.
 *
 * Лендінг відкривається розворотом: текст ліворуч, тепла медіа-плитка праворуч
 * на весь край екрана. Внутрішні сторінки досі відкривались абзацом на
 * порожньому тлі — той самий контент, але без жодної точки, за яку чіпляється
 * око, тож сторінка читалась як чернетка поруч із головною.
 *
 * Тут той самий розворот, тільки нижчий: `min-h-dvh` героя головної тримає
 * перший екран цілком, а на сторінці категорії під ним одразу має починатись
 * прайс — заради нього людина й прийшла з пошуку.
 *
 * Крихти лежать усередині, а не смужкою над: окремою секцією вони висіли в
 * повітрі між шапкою й заголовком і додавали сторінці шов, якого немає на
 * головній.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  trail,
  media,
  children,
  trailLabel,
}: {
  eyebrow: string;
  /** Підпис хлібних крихт для читачів з екрана — мовою сторінки. */
  trailLabel: string;
  title: ReactNode;
  lead: ReactNode;
  trail: { name: string; path: string }[];
  /** Фото праворуч. Без нього блок лишається текстовим на всю ширину. */
  media?: { src: string; alt: string; caption?: string };
  /** Кнопки та інший підпис під ліді. */
  children?: ReactNode;
}) {
  return (
    <section className="bg-surface">
      <div
        className={`grid ${media ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}
      >
        <div className="flex flex-col justify-center px-5 pb-14 pt-8 md:px-10 md:pb-20 md:pt-10 lg:pl-[var(--gutter-edge-sm)]">
          <Breadcrumbs trail={trail} label={trailLabel} />

          <div className="mt-10">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>

          <h1 className="mt-6 max-w-[20ch] text-[36px] leading-[1.05] sm:text-[48px] lg:text-[60px]">
            {title}
          </h1>

          <div className="mt-6 max-w-[52ch] text-[17px] leading-relaxed text-ink-muted">
            {lead}
          </div>

          {children}
        </div>

        {media && (
          <div className="relative min-h-[320px] overflow-hidden bg-sand lg:min-h-[560px]">
            <Image
              src={media.src}
              alt={media.alt}
              fill
              // Ліва колонка ширша за праву, тож на десктопі фото ніколи не
              // займає половину вікна — 46vw ближче до правди, ніж 50vw.
              sizes="(max-width: 1024px) 100vw, 46vw"
              // Єдине велике фото першого екрана — воно й буде LCP.
              priority
              className="object-cover object-center"
            />

            {media.caption && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                />
                <p className="absolute bottom-6 right-5 z-10 max-w-[26ch] text-right text-[15px] leading-relaxed text-white md:right-10">
                  <span aria-hidden="true">/ </span>
                  {media.caption}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
