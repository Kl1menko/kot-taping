"use client";

import { useMemo, useState } from "react";
import {
  dateKey,
  dayTitle,
  monthGrid,
  monthTitle,
  startOfDay,
} from "@/lib/calendar";
import {
  initialMonth,
  isBookable,
  isWorkingDay,
  type Schedule,
} from "@/lib/schedule";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/**
 * Вибір дати з тих, що майстриня справді відкрила.
 *
 * До цього тут стояв `<input type="date">`, який приймав будь-який день у
 * майбутньому. Клієнтка обирала неділю чи львівський день, коли майстриня в
 * Києві, — і заявка приходила лише щоб її переузгодили листуванням. Тепер
 * недоступні дні не клікаються, і сказати «неможливо» треба до відправки,
 * а не після.
 *
 * Значення віддаємо прихованим полем: Server Action читає ту саму `date`, що
 * й раніше, і про заміну віджета не знає.
 */
export function DatePicker({
  name,
  schedule,
  defaultValue = "",
  onSelect,
  invalid,
  /** Кабінет ще не обрано — показуємо підказку замість порожньої сітки. */
  awaitingLocation,
}: {
  name: string;
  schedule: Schedule;
  defaultValue?: string;
  /** Форма слухає вибір: від дати залежать доступні проміжки часу. */
  onSelect?: (day: string) => void;
  invalid?: boolean;
  awaitingLocation?: boolean;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);

  // Місяць із найближчим відкритим днем, а не поточний: у кінці серпня, коли
  // всі дні вже минули, клієнтка бачила б порожню сітку й не здогадалась
  // гортати далі.
  const [month, setMonth] = useState(() => {
    if (defaultValue) {
      const [y, m] = defaultValue.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return initialMonth(schedule, today);
  });

  const [selected, setSelected] = useState(defaultValue);

  const grid = useMemo(() => monthGrid(month), [month]);
  const todayKey = dateKey(today);

  const shift = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  // Гортати в минуле немає сенсу: там нічого не обереш.
  const atFirstMonth =
    month.getFullYear() === today.getFullYear() &&
    month.getMonth() === today.getMonth();

  const hasAny = schedule.size > 0;

  return (
    <div>
      {/* Значення для Server Action. Сітка кнопок сама по собі нічого не шле. */}
      <input type="hidden" name={name} value={selected} />

      <div
        aria-invalid={invalid || undefined}
        className={[
          "mt-2 rounded-2xl border bg-canvas p-3 sm:p-4",
          invalid ? "border-[#b3261e]" : "border-line",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={atFirstMonth}
            aria-label="Попередній місяць"
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-surface transition-colors duration-200 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Arrow dir="left" />
          </button>

          <p aria-live="polite" className="text-[15px]">
            {monthTitle(month)}
          </p>

          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Наступний місяць"
            className="grid size-10 cursor-pointer place-items-center rounded-full bg-surface transition-colors duration-200 hover:bg-sand"
          >
            <Arrow dir="right" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((label) => (
            <span
              key={label}
              aria-hidden="true"
              className="py-1 text-center text-[12px] text-ink-muted"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label="Оберіть дату">
          {grid.map((date) => {
            const key = dateKey(date);
            const outside = date.getMonth() !== month.getMonth();
            const available =
              isBookable(key, today) && isWorkingDay(schedule, key);
            const isSelected = key === selected;

            return (
              <button
                key={key}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSelected(key);
                  onSelect?.(key);
                }}
                aria-pressed={isSelected}
                aria-label={
                  available
                    ? dayTitle(date)
                    : `${dayTitle(date)} — недоступно`
                }
                className={[
                  "tnum aspect-square rounded-xl text-[15px] transition-colors duration-200",
                  available
                    ? "cursor-pointer bg-surface text-ink hover:bg-sand"
                    : // Недоступний день лишається видимим, але явно
                      // погашеним: порожня клітинка читалась би як діра в
                      // сітці, а не як зайнятий день.
                      "cursor-not-allowed bg-transparent text-ink-muted/40",
                  isSelected ? "!bg-ink !text-white" : "",
                  outside ? "opacity-50" : "",
                  key === todayKey && !isSelected
                    ? "ring-1 ring-line"
                    : "",
                ].join(" ")}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {awaitingLocation ? (
        <span className="mt-1.5 block text-[13px] text-ink-muted">
          Оберіть кабінет — покажу вільні дати саме для нього.
        </span>
      ) : !hasAny ? (
        <span className="mt-1.5 block text-[13px] text-ink-muted">
          Найближчим часом вільних дат немає. Напишіть у Telegram чи Instagram —
          підберемо час окремо.
        </span>
      ) : selected ? (
        <span className="mt-1.5 block text-[13px] text-ink-muted">
          Обрано: {formatSelected(selected)}
        </span>
      ) : (
        <span className="mt-1.5 block text-[13px] text-ink-muted">
          Доступні дати виділені — оберіть зручну.
        </span>
      )}
    </div>
  );
}

function formatSelected(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayTitle(new Date(y, m - 1, d));
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
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
      <path d={dir === "left" ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"} />
    </svg>
  );
}
