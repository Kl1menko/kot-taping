"use client";

import { useEffect, useRef, useState } from "react";
import {
  WORK_END_HOUR,
  WORK_START_HOUR,
  isToday,
  layoutDay,
  minutesOfDay,
  timeLabel,
} from "@/lib/calendar";
import { CANCELLED_TONE, toneFor } from "@/lib/service-tone";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import { formatMoney } from "./ui";

/** Висота хвилини. Година ≈ 72px — рядок 30 хв лишається читабельним. */
const PX_PER_MIN = 1.2;
const HOUR_HEIGHT = 60 * PX_PER_MIN;

/**
 * Денна сітка з пропорційною шкалою: блок займає висоту, що відповідає
 * тривалості, і стоїть точно на своїй хвилині. Колір картки — за категорією
 * послуги, тож тип роботи впізнається без читання.
 */
export function DayGrid({
  list,
  date,
  onOpen,
  onSlot,
}: {
  list: AppointmentWithRefs[];
  date: Date;
  onOpen: (a: AppointmentWithRefs) => void;
  onSlot: (start: Date) => void;
}) {
  const hours = Array.from(
    { length: WORK_END_HOUR - WORK_START_HOUR + 1 },
    (_, i) => WORK_START_HOUR + i,
  );

  const gridHeight = (WORK_END_HOUR - WORK_START_HOUR) * HOUR_HEIGHT;

  // Скасовані не займають місця в сітці — інакше вони розсували б живі записи
  // по колонках. Показуємо їх окремим списком під сіткою.
  const active = list.filter((a) => a.status !== "cancelled");
  const cancelled = list.filter((a) => a.status === "cancelled");

  const placed = layoutDay(
    active,
    (a) => new Date(a.starts_at),
    (a) => a.duration_min,
    PX_PER_MIN,
    WORK_START_HOUR,
  );

  const nowOffset = useNowOffset(date);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Відкриваємо день на актуальній частині: сьогодні — біля «зараз», інакше —
  // біля першого запису, щоб не дивитись на порожній ранок.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    const target =
      nowOffset ?? (placed.length > 0 ? Math.min(...placed.map((p) => p.top)) : null);

    if (target === null) return;
    box.scrollTo({ top: Math.max(target - 100, 0), behavior: "smooth" });
    // Прокручуємо при зміні дня, а не на кожен рендер списку.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, nowOffset]);

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[68dvh] overflow-y-auto overscroll-contain rounded-[var(--radius-tile)] bg-surface"
      >
        <div className="relative flex px-4 py-4">
          {/* Шкала годин */}
          <div className="w-11 shrink-0">
            {hours.map((hour) => (
              <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative">
                <span className="tnum absolute -top-[7px] text-[12px] tabular-nums text-ink-muted">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1" style={{ height: gridHeight }}>
            {/* Лінії годин і півгодин: півгодинна світліша, щоб не сперечалась */}
            {hours.map((hour, i) => (
              <div key={hour}>
                <div
                  style={{ top: i * HOUR_HEIGHT }}
                  className="absolute inset-x-0 border-t border-line"
                />
                {i < hours.length - 1 && (
                  <div
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    className="absolute inset-x-0 border-t border-dashed border-line/50"
                  />
                )}
              </div>
            ))}

            {/* Порожні півгодини клікабельні — швидкий шлях створити запис */}
            {hours.slice(0, -1).flatMap((hour, i) =>
              [0, 30].map((minute) => {
                const slotStart = new Date(date);
                slotStart.setHours(hour, minute, 0, 0);
                return (
                  <button
                    key={`${hour}-${minute}`}
                    type="button"
                    onClick={() => onSlot(slotStart)}
                    aria-label={`Створити запис на ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
                    style={{
                      top: i * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT,
                      height: HOUR_HEIGHT / 2,
                    }}
                    className="group absolute inset-x-0 cursor-pointer"
                  >
                    <span className="mx-0.5 flex h-full items-center justify-center rounded-lg text-[12px] text-transparent transition-colors duration-150 group-hover:bg-canvas group-hover:text-ink-muted">
                      + {String(hour).padStart(2, "0")}:
                      {String(minute).padStart(2, "0")}
                    </span>
                  </button>
                );
              }),
            )}

            {placed.map(({ item, top, height, column, columns }) => {
              const start = new Date(item.starts_at);
              const tone = toneFor(item.service.category);
              const gap = 3;
              const widthPct = 100 / columns;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item)}
                  style={{
                    top,
                    height,
                    left: `calc(${column * widthPct}% + ${gap}px)`,
                    width: `calc(${widthPct}% - ${gap * 2}px)`,
                  }}
                  className={[
                    "absolute flex overflow-hidden rounded-xl text-left",
                    tone.bg,
                    tone.hover,
                    "transition-colors duration-150",
                    item.status === "no_show" ? "opacity-70" : "",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={`w-[3px] shrink-0 ${tone.bar}`}
                  />

                  <span className="min-w-0 flex-1 px-2.5 py-1.5">
                    <span className="flex items-baseline gap-1.5">
                      <span className="tnum shrink-0 text-[11px] text-ink-muted">
                        {timeLabel(start)}
                      </span>
                      {item.status === "done" && (
                        <span
                          aria-label="виконано"
                          className="shrink-0 text-[10px] text-ink-muted"
                        >
                          ✓
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 block truncate text-[13px] leading-tight">
                      {item.client.name}
                    </span>

                    {/* Послуга й ціна з'являються, коли блок досить високий */}
                    {height >= 58 && (
                      <span className="mt-0.5 block truncate text-[11px] leading-tight text-ink-muted">
                        {item.service.title}
                      </span>
                    )}
                    {height >= 80 && item.price > 0 && (
                      <span className="tnum mt-1 block text-[11px] text-ink-muted">
                        {formatMoney(item.price)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {/* Лінія «зараз» */}
            {nowOffset !== null && (
              <div
                aria-hidden="true"
                style={{ top: nowOffset }}
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              >
                <span className="-ml-[3px] size-1.5 shrink-0 rounded-full bg-[#b3261e]" />
                <span className="h-px flex-1 bg-[#b3261e]/70" />
                <span className="tnum ml-1 shrink-0 rounded bg-[#b3261e] px-1 py-px text-[10px] text-white">
                  {timeLabel(new Date())}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {cancelled.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-tile)] bg-surface px-4 py-3">
          <p className="text-[13px] text-ink-muted">
            Скасовані: {cancelled.length}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {cancelled.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpen(a)}
                  className={`tnum cursor-pointer rounded-full px-3 py-1 text-[13px] text-ink-muted line-through transition-colors duration-200 hover:text-ink ${CANCELLED_TONE.bg}`}
                >
                  {timeLabel(new Date(a.starts_at))} · {a.client.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * Зсув лінії «зараз» у пікселях, або null — якщо день не сьогоднішній чи час
 * поза робочим вікном. Оновлюється щохвилини.
 */
function useNowOffset(date: Date): number | null {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    const compute = () => {
      if (!isToday(date)) return setOffset(null);

      const minutes = minutesOfDay(new Date());
      if (minutes < WORK_START_HOUR * 60 || minutes > WORK_END_HOUR * 60) {
        return setOffset(null);
      }
      setOffset((minutes - WORK_START_HOUR * 60) * PX_PER_MIN);
    };

    compute();
    const timer = setInterval(compute, 60_000);
    return () => clearInterval(timer);
  }, [date]);

  return offset;
}
