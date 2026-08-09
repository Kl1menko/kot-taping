"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Нижній лист. Використовує нативний `<dialog>`: він дає модальність, фокус-пастку
 * й Esc без власного коду — і працює, навіть якщо гідратація запізнилась.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Сторінка під листом не має прокручуватись разом із ним.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Клік по підкладці (сам dialog) закриває; клік усередині — ні.
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={[
        "m-0 mt-auto w-full max-w-[560px] rounded-t-[28px] bg-canvas p-0 sm:mx-auto sm:mb-auto sm:mt-[6vh] sm:rounded-[28px]",
        "backdrop:bg-black/40 open:animate-[sheet-in_240ms_var(--ease-out-soft)]",
      ].join(" ")}
    >
      <div className="max-h-[86dvh] overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-canvas px-5 pb-2 pt-4">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden"
          />
          <h2 className="mt-2 text-[15px] text-ink-muted sm:mt-0">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-sand"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-8">{children}</div>
      </div>
    </dialog>
  );
}
