"use client";

import type { ReactNode } from "react";

/**
 * Єдиний по-справжньому клієнтський елемент з ui.tsx: приймає `onClick`, а
 * функцію через межу сервер→клієнт передати не можна.
 *
 * Живе окремо саме тому: доки `Button` лежав в ui.tsx, директива "use client"
 * позначала весь модуль, і серверні компоненти не могли взяти звідти навіть
 * `formatMoney` — падало з «Attempted to call formatMoney() from the server».
 */
export function Button({
  children,
  onClick,
  type = "button",
  tone = "dark",
  full,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: "dark" | "light" | "danger";
  full?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const tones = {
    dark: "bg-ink text-white hover:bg-[#2a2a2a]",
    // Межа тут своя, а не `border-line`. Світлі кнопки адмінки майже завжди
    // стоять у модальному вікні, а воно на `bg-canvas` (#ededed) — і #e4e4e4
    // на такому тлі дає контраст 1.04:1, тобто кнопка читається як текст без
    // контуру. #d4d4d4 піднімає його приблизно до 1.4:1: обрис видно, але він
    // лишається тонким і тихим, а не перетягує увагу з чорної кнопки поруч.
    light: "border border-[#d4d4d4] text-ink hover:border-ink",
    danger: "border border-[#e6c9c6] text-[#b3261e] hover:bg-blush",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[15px]",
        "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
        full ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
