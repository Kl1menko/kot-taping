"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Модальний лист для публічного сайту — те саме вікно, що й у запису, але без
 * прив'язки до конкретної форми.
 *
 * Механіка (пастка фокуса, Escape, блокування скролу за листом) повторює
 * `booking-modal.tsx`. Там вона вплетена в провайдер із контекстом і прайсом,
 * тож переиспользовать її як є не вийшло — а копіювати саме поведінку, від якої
 * залежить доступність, найгірший варіант. Тому вона живе тут окремо, і
 * модалка запису може згодом переїхати на цей самий компонент.
 *
 * Рендериться через портал у `body`, і це не косметика. Лист відкривається
 * зсередини секції, а секцію загортає `Reveal` із `translate-y` — будь-який
 * `transform` у предка робить себе точкою відліку для `position: fixed`, тож
 * «на весь екран» перетворювалося на «на всю секцію»: вікно обрізалося знизу, а
 * замість його вмісту прокручувалася сторінка за ним.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow = "Набір",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Куди повернути фокус після закриття — інакше він падає на початок сторінки.
  const restoreRef = useRef<HTMLElement | null>(null);


  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    // Фокус на першому полі: із клавіатури форма має бути готова до вводу.
    dialogRef.current?.querySelector<HTMLElement>("select, input")?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  // На сервері `document` немає, а лист і так відкривається лише з кліку —
  // тобто вже в браузері. Перевірка замість стану: піднімати рендер заради
  // прапорця «змонтовано» тут нічого не дає.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />

      <div className="absolute inset-0 flex justify-center sm:items-center sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kit-sheet-title"
          className="relative flex h-dvh w-full flex-col bg-surface sm:h-auto sm:max-h-[92dvh] sm:max-w-[560px] sm:rounded-[28px] sm:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.45)]"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
            <div>
              <p className="text-[15px] text-ink-muted">
                <span aria-hidden="true">/ </span>
                {eyebrow}
              </p>
              <h2
                id="kit-sheet-title"
                className="mt-2 text-[24px] leading-tight sm:text-[28px]"
              >
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-canvas text-ink transition-colors duration-200 hover:bg-line"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
