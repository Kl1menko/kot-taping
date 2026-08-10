/**
 * Спільні елементи адмінки.
 *
 * Модуль свідомо БЕЗ "use client": тут лише розмітка й форматування, жодних
 * обробників. Директива на весь файл робила ці утиліти недоступними серверним
 * компонентам — виклик `formatMoney()` із сервера падав у рантаймі, хоча
 * збірка проходила. Інтерактивний `Button` тепер живе в ./button.tsx і
 * ре-експортується звідси, щоб наявні імпорти лишились робочими.
 */

import type { ReactNode } from "react";
import type { AppointmentStatus } from "@/lib/db/types";

export { Button } from "./button";

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
