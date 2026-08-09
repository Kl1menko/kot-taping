"use client";

import type { ReactNode } from "react";
import type { AppointmentStatus } from "@/lib/db/types";

/** Панель — базова поверхня адмінки поверх сірого полотна. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[var(--radius-tile)] bg-surface ${className}`}>
      {children}
    </div>
  );
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  planned: "Заплановано",
  done: "Виконано",
  cancelled: "Скасовано",
  no_show: "Не прийшов",
};

/**
 * Статуси навмисно тихі — сірі, а не сигнальні. Кольором у списку працює
 * лише лівий кант картки, інакше екран із 15 записів рябіє.
 */
const STATUS_CLASS: Record<AppointmentStatus, string> = {
  planned: "bg-canvas text-ink-muted",
  done: "bg-sand text-ink",
  cancelled: "bg-canvas text-ink-muted line-through",
  no_show: "bg-blush text-ink",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export { STATUS_LABEL };

/** Нейтральний бейдж — тривалість, розмір, формат курсу. */
export function Chip({
  children,
  tone = "canvas",
}: {
  children: ReactNode;
  tone?: "canvas" | "sand" | "blush";
}) {
  const bg =
    tone === "sand" ? "bg-sand" : tone === "blush" ? "bg-blush" : "bg-canvas";
  return (
    <span
      className={`tnum inline-flex items-center rounded-full px-3 py-1 text-[13px] ${bg}`}
    >
      {children}
    </span>
  );
}

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
    light: "border border-line text-ink hover:border-ink",
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

/** Порожній стан — щоб екран без даних не виглядав як помилка. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-tile)] bg-surface px-6 py-16 text-center">
      <p className="text-[18px]">{title}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-[40ch] text-[15px] leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString("uk-UA")} ₴`;
}
