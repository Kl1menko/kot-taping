"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Модальне вікно розділів адмінки — на телефоні на весь екран, на десктопі
 * картка посередині.
 *
 * Нативний `<dialog>`: він дає модальність, фокус-пастку й Esc без власного
 * коду — і працює, навіть якщо гідратація запізнилась.
 *
 * Раніше це був нижній лист на 86% висоти. На телефоні він програвав саме там,
 * де потрібен найбільше: у заявці з протипоказаннями та розкроєм видимим
 * лишався хвіст попереднього блока, шапка з'їдала рядок, а смуга сторінки за
 * листом плутала з його власною прокруткою. Повний екран знімає це — контент
 * отримує всю висоту, а кнопки дій стоять на своєму місці внизу.
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
        // Телефон: вікно на весь екран, без кутів і зазорів. Десктоп (sm+):
        // картка посередині з обмеженою висотою.
        "m-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0",
        "sm:mx-auto sm:my-[6vh] sm:h-auto sm:max-h-[88dvh] sm:max-w-[560px] sm:rounded-[28px]",
        "backdrop:bg-black/40 open:animate-[sheet-in_240ms_var(--ease-out-soft)]",
      ].join(" ")}
    >
      {/* Колонка на всю висоту: шапка й підвал не їдуть, прокручується лише
          вміст між ними. */}
      <div className="flex h-full flex-col sm:max-h-[88dvh]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-canvas px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
          {/*
            `autoFocus` на заголовку, а не на кнопці закриття.

            `showModal()` сам фокусує перший фокусований елемент, і ним був
            хрестик. Відкрите з тапу вікно браузер на телефоні все одно
            зараховує як фокус із клавіатури, тож хрестик зустрічав чорною
            обвідкою — вона читається як «вибрано», хоч ніхто нічого не
            вибирав.
            
            Прибирати обвідку не можна: вона потрібна тим, хто йде з
            клавіатури. Тому фокус переїжджає на заголовок — читачі з екрана
            заразом одразу чують, що саме відкрилось, а `tabIndex={-1}` лишає
            його поза обходом по Tab.
          */}
          <h2 autoFocus tabIndex={-1} className="text-[15px] text-ink-muted outline-none">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-sand"
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
