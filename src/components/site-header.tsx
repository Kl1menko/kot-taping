"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBookingModal } from "./booking-modal";
import { SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";

/**
 * «Послуги» ведуть на окрему сторінку, а не на якір: це справжній маршрут із
 * власною видачею, і посилання з кожної сторінки сайту — те, чим краулер
 * міряє його вагу. Решта лишаються якорями головної, тому href абсолютний
 * («/#about»), інакше з внутрішньої сторінки вони б нікуди не вели.
 *
 * «Запис» тут більше немає: за якорем `#booking` лежить не анкета, а заклик із
 * кнопкою, тож пункт меню вів до другої кнопки замість форми — а з внутрішньої
 * сторінки ще й викидав на головну. Запис відкривається модалкою, і в меню він
 * стоїть окремою кнопкою, а не рядком серед якорів.
 */
const NAV = [
  { href: "/poslugy", label: "Послуги" },
  { href: "/#about", label: "Про мене" },
  { href: "/#results", label: "Результати" },
  { href: "/#faq", label: "Питання" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { open: openBooking } = useBookingModal();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Lock the page behind the overlay and wire up Esc.
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Move focus into the panel so the sheet is reachable from the keyboard.
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="relative z-50 flex items-center justify-between px-5 py-6 md:px-10 md:py-8 lg:pl-[var(--gutter-edge-sm)]">
      <Link href="/" className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <path d="M12 3v18M3.8 7.5l16.4 9M20.2 7.5l-16.4 9" />
          </svg>
        </span>
        <span className="text-[15px] leading-tight">
          Kotova
          <br />
          Taping
        </span>
      </Link>

      {/* Соцмережі в десктопному меню не дублюємо — вони лишаються у
          мобільній панелі та у футері. */}
      <div className="hidden items-center gap-8 md:flex">
        <nav aria-label="Головне меню" className="flex items-center gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => openBooking()}
            className="cursor-pointer text-[15px] text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            Запис
          </button>
        </nav>
      </div>

      {/* Burger — solid ink pill so it reads against the white hero, with the
          two bars morphing into a cross rather than swapping icons. */}
      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? "Закрити меню" : "Відкрити меню"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-white transition-colors duration-200 hover:bg-[#2a2a2a] md:hidden"
      >
        <span aria-hidden="true" className="relative block h-3 w-[18px]">
          <span
            className={[
              "absolute left-0 block h-[1.5px] w-full rounded-full bg-current",
              "transition-transform duration-300 ease-[var(--ease-out-soft)]",
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
            ].join(" ")}
          />
          <span
            className={[
              "absolute left-0 block h-[1.5px] w-full rounded-full bg-current",
              "transition-transform duration-300 ease-[var(--ease-out-soft)]",
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-full -translate-y-full",
            ].join(" ")}
          />
        </span>
      </button>

      {/* Scrim — tapping outside the sheet closes it. */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          "fixed inset-0 z-40 bg-ink/25 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <div
        ref={panelRef}
        id="mobile-nav"
        className={[
          "fixed inset-x-3 top-3 z-40 max-h-[calc(100dvh-1.5rem)] origin-top overflow-y-auto rounded-[28px] bg-surface",
          "shadow-[0_28px_60px_-20px_rgba(0,0,0,0.45)] md:hidden",
          "transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]",
          open
            ? "opacity-100 translate-y-0"
            : "pointer-events-none -translate-y-3 opacity-0",
        ].join(" ")}
      >
        {/* Brand repeated inside the sheet — the header logo sits behind it. */}
        <div className="flex items-center gap-3 px-6 pt-6">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
            >
              <path d="M12 3v18M3.8 7.5l16.4 9M20.2 7.5l-16.4 9" />
            </svg>
          </span>
          <span className="text-[15px] leading-tight">
            Kotova
            <br />
            Taping
          </span>
        </div>

        <nav aria-label="Мобільне меню" className="mt-8 px-3">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={open ? undefined : -1}
              onClick={() => setOpen(false)}
              className="flex min-h-[68px] items-center justify-between gap-4 rounded-2xl border-b border-line px-4 text-[24px] transition-colors duration-200 last:border-b-0 active:bg-canvas"
            >
              {item.label}
              <span className="tnum text-[12px] text-ink-muted">
                0{i + 1}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-6 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            tabIndex={open ? undefined : -1}
            onClick={() => {
              setOpen(false);
              openBooking();
            }}
            className="flex w-full min-h-[56px] cursor-pointer items-center justify-between gap-4 rounded-full bg-ink py-2 pl-6 pr-2 text-[16px] text-white"
          >
            Записатись на сеанс
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>

          <nav
            aria-label="Соцмережі"
            className="mt-5 flex flex-wrap justify-center gap-2 pb-1"
          >
            {SOCIALS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={open ? undefined : -1}
                aria-label={`${s.label} — ${s.handle}`}
                className="grid size-11 place-items-center rounded-full bg-canvas text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
              >
                <SocialIcon id={s.id} />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
