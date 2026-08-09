"use client";

import {
  dateKey,
  isSameDay,
  isToday,
  timeLabel,
  weekDays,
} from "@/lib/calendar";
import { CANCELLED_TONE, toneFor } from "@/lib/service-tone";
import type { AppointmentWithRefs } from "@/lib/db/appointments";

const WEEKDAY_FULL = [
  "Неділя",
  "Понеділок",
  "Вівторок",
  "Середа",
  "Четвер",
  "П'ятниця",
  "Субота",
];

const MONTH_SHORT = [
  "січ",
  "лют",
  "бер",
  "кві",
  "тра",
  "чер",
  "лип",
  "сер",
  "вер",
  "жов",
  "лис",
  "гру",
];

/** Скільки записів показати в картці дня до згортання. */
const VISIBLE = 3;

/**
 * Тиждень картками: кожен день — окремий блок із переліком записів. Дає огляд
 * усього тижня без прокрутки погодинної сітки ×7.
 */
export function WeekGrid({
  byDay,
  date,
  onOpen,
  onPickDay,
}: {
  byDay: Map<string, AppointmentWithRefs[]>;
  date: Date;
  onOpen: (a: AppointmentWithRefs) => void;
  onPickDay: (d: Date) => void;
}) {
  const days = weekDays(date);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {days.map((day) => {
        const key = dateKey(day);
        const list = byDay.get(key) ?? [];
        const selected = isSameDay(day, date);
        const today = isToday(day);
        const hidden = Math.max(list.length - VISIBLE, 0);

        return (
          <div
            key={key}
            className="overflow-hidden rounded-[var(--radius-tile)] bg-surface p-4"
          >
            <button
              type="button"
              onClick={() => onPickDay(day)}
              className="flex w-full cursor-pointer items-center gap-2 text-left"
            >
              <span
                className={[
                  "rounded-full px-3 py-1 text-[15px] transition-colors duration-200",
                  selected
                    ? "bg-ink text-white"
                    : today
                      ? "bg-sand text-ink"
                      : "text-ink hover:bg-canvas",
                ].join(" ")}
              >
                {WEEKDAY_FULL[day.getDay()]},{" "}
                <span className="tnum">
                  {day.getDate()} {MONTH_SHORT[day.getMonth()]}
                </span>
              </span>
            </button>

            {list.length === 0 ? (
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className="mt-3 w-full cursor-pointer rounded-xl bg-canvas px-3 py-2.5 text-left text-[14px] text-ink-muted transition-colors duration-200 hover:bg-sand"
              >
                Вільний день
              </button>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {list.slice(0, VISIBLE).map((a) => {
                  const cancelled = a.status === "cancelled";
                  const tone = cancelled
                    ? CANCELLED_TONE
                    : toneFor(a.service.category);

                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(a)}
                        className={[
                          "flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-left",
                          tone.bg,
                          tone.hover,
                          "transition-colors duration-200",
                          cancelled ? "opacity-55" : "",
                        ].join(" ")}
                      >
                        <span className="tnum shrink-0 text-[13px] text-ink-muted">
                          {timeLabel(new Date(a.starts_at))}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-[14px] ${cancelled ? "line-through" : ""}`}
                        >
                          {a.client.name}
                        </span>
                      </button>
                    </li>
                  );
                })}

                {hidden > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onPickDay(day)}
                      className="w-full cursor-pointer rounded-xl px-3 py-2 text-left text-[14px] text-ink-muted transition-colors duration-200 hover:bg-canvas"
                    >
                      Ще {hidden}{" "}
                      {hidden === 1
                        ? "запис"
                        : hidden < 5
                          ? "записи"
                          : "записів"}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
