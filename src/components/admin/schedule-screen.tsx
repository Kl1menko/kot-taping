"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bulkSetWorkingDays,
  setDayNote,
  setDaySlots,
  toggleWorkingDay,
} from "@/app/admin/schedule/actions";
import {
  addDays,
  dateKey,
  dayTitle,
  monthGrid,
  monthTitle,
  startOfDay,
} from "@/lib/calendar";
import { PREFERRED_TIMES } from "@/lib/intake";
import {
  countInMonth,
  isWorkingDay,
  slotsFor,
  toSchedule,
  type WorkingDay,
} from "@/lib/schedule";
import type { LocationRow } from "@/lib/db/types";
import { Sheet } from "./sheet";
import { Button, EmptyState } from "./ui";
import { INPUT_CLS } from "@/lib/form";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/**
 * Графік роботи: які дні відкриті для запису в кожному кабінеті.
 *
 * Основна взаємодія — тап по числу: відкрити день або закрити. Проміжки дня
 * (ранок/день/вечір) звужуються окремо, у листі, бо потрібні рідко: типовий
 * робочий день відкритий цілком.
 */
export function ScheduleScreen({
  locations,
  activeLocation,
  month,
  days,
}: {
  locations: LocationRow[];
  activeLocation: LocationRow | null;
  month: Date;
  days: WorkingDay[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openDay, setOpenDay] = useState<string | null>(null);

  const schedule = useMemo(() => toSchedule(days), [days]);
  const grid = useMemo(() => monthGrid(month), [month]);
  const today = dateKey(startOfDay(new Date()));

  /** Навігація місяцями й кабінетами — через URL, щоб стан переживав оновлення. */
  const go = (next: { month?: string; location?: string }) => {
    const q = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) q.set(key, value);
    router.push(`/admin/schedule?${q}`, { scroll: false });
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    go({
      month: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    });
  };

  if (!activeLocation) {
    return (
      <EmptyState
        title="Немає жодного кабінету"
        hint="Графік прив'язаний до кабінету — спершу додайте його в базу."
      />
    );
  }

  const locationId = activeLocation.id;

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  /**
   * Дні цього місяця в сітці — саме вони беруть участь у масових діях.
   * Клітинки сусідніх місяців редагуються поштучно, але «відкрити всі
   * суботи» не має тихо чіпати чужий місяць.
   */
  const ownDays = grid.filter((d) => d.getMonth() === month.getMonth());

  /** «Усі суботи», «весь місяць» — інакше графік складався б із 20 тапів. */
  const openWeekday = (weekday: number) => {
    const target = ownDays.filter((d) => (d.getDay() + 6) % 7 === weekday);
    const keys = target.map(dateKey);
    // Усі вже відкриті — тап по тому самому підпису закриває їх.
    const allOpen = keys.every((k) => isWorkingDay(schedule, k));
    run(() => bulkSetWorkingDays(locationId, keys, !allOpen));
  };

  const openCount = countInMonth(schedule, month);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Графік</h1>
        <span className="tnum shrink-0 text-[14px] text-ink-muted">
          {openCount} робочих днів
        </span>
      </div>

      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">
        Відкриті дні клієнт бачить у формі запису як доступні. День поза
        графіком обрати не можна.
      </p>

      {locations.length > 1 && (
        <div className="mt-5 flex gap-2 overflow-x-auto">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => go({ location: l.slug })}
              aria-current={l.id === activeLocation.id ? "true" : undefined}
              className={[
                "min-h-[44px] shrink-0 cursor-pointer whitespace-nowrap rounded-full px-5 text-[14px]",
                "transition-colors duration-200",
                l.id === activeLocation.id
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {l.city}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-[var(--radius-tile)] bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Попередній місяць"
            className="grid size-11 cursor-pointer place-items-center rounded-full bg-canvas transition-colors duration-200 hover:bg-sand"
          >
            <Arrow dir="left" />
          </button>

          <p className="text-[16px]">{monthTitle(month)}</p>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Наступний місяць"
            className="grid size-11 cursor-pointer place-items-center rounded-full bg-canvas transition-colors duration-200 hover:bg-sand"
          >
            <Arrow dir="right" />
          </button>
        </div>

        {/* Підпис дня тижня — заразом кнопка «усі понеділки». */}
        <div className="mt-5 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => openWeekday(i)}
              title={`Відкрити або закрити всі ${label} цього місяця`}
              className="cursor-pointer rounded-lg py-1.5 text-[12px] text-ink-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const key = dateKey(date);
            const working = isWorkingDay(schedule, key);
            const slots = slotsFor(schedule, key);
            const outside = date.getMonth() !== month.getMonth();
            const past = key < today;
            // Звужений день має відрізнятись від повного: інакше «лише ранок»
            // виглядає як звичайний робочий, і майстриня про це забуває.
            const partial = working && slots.length < PREFERRED_TIMES.length;

            return (
              <button
                key={key}
                type="button"
                disabled={pending}
                onClick={() => run(() => toggleWorkingDay(locationId, key))}
                onContextMenu={(e) => {
                  // Правий клік / довгий тап — проміжки й нотатка.
                  e.preventDefault();
                  if (working) setOpenDay(key);
                }}
                aria-pressed={working}
                aria-label={`${dayTitle(date)} — ${working ? "робочий" : "вихідний"}`}
                className={[
                  "tnum relative aspect-square cursor-pointer rounded-xl text-[15px]",
                  "transition-colors duration-200 disabled:cursor-wait",
                  working
                    ? "bg-ink text-white hover:bg-[#2a2a2a]"
                    : "bg-canvas text-ink hover:bg-sand",
                  outside ? "opacity-40" : "",
                  past && !working ? "text-ink-muted" : "",
                  key === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "",
                ].join(" ")}
              >
                {date.getDate()}
                {partial && (
                  <span
                    aria-hidden="true"
                    title="Відкрито не весь день"
                    className="absolute inset-x-0 bottom-1.5 mx-auto block size-1.5 rounded-full bg-white/70"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <Button
            tone="light"
            onClick={() =>
              run(() =>
                bulkSetWorkingDays(locationId, ownDays.map(dateKey), true),
              )
            }
            disabled={pending}
          >
            Відкрити весь місяць
          </Button>
          <Button
            tone="light"
            onClick={() =>
              run(() =>
                bulkSetWorkingDays(locationId, ownDays.map(dateKey), false),
              )
            }
            disabled={pending}
          >
            Закрити весь місяць
          </Button>
          <Button
            tone="light"
            onClick={() => {
              // Наступні 7 днів від сьогодні — найчастіша дія «відкрити тиждень».
              const from = startOfDay(new Date());
              const week = Array.from({ length: 7 }, (_, i) =>
                dateKey(addDays(from, i)),
              );
              run(() => bulkSetWorkingDays(locationId, week, true));
            }}
            disabled={pending}
          >
            Відкрити тиждень
          </Button>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Тап по числу відкриває або закриває день. Довгий тап (правий клік) на
          відкритому дні — щоб звузити проміжки чи додати нотатку. Тап по
          підпису дня тижня перемикає всі такі дні місяця.
        </p>
      </div>

      {openDay && (
        <DaySheet
          day={openDay}
          slots={slotsFor(schedule, openDay)}
          note={days.find((d) => d.day === openDay)?.note ?? ""}
          pending={pending}
          onClose={() => setOpenDay(null)}
          onSaveSlots={(next) =>
            run(() => setDaySlots(locationId, openDay, next))
          }
          onSaveNote={(note) => run(() => setDayNote(locationId, openDay, note))}
        />
      )}
    </>
  );
}

/** Проміжки й нотатка одного дня. */
function DaySheet({
  day,
  slots,
  note,
  pending,
  onClose,
  onSaveSlots,
  onSaveNote,
}: {
  day: string;
  slots: string[];
  note: string;
  pending: boolean;
  onClose: () => void;
  onSaveSlots: (slots: string[]) => void;
  onSaveNote: (note: string) => void;
}) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const [draftNote, setDraftNote] = useState(note);

  const toggle = (id: string) => {
    const next = slots.includes(id)
      ? slots.filter((s) => s !== id)
      : [...slots, id];
    onSaveSlots(next);
  };

  return (
    <Sheet open onClose={onClose} title={dayTitle(date)}>
      <p className="text-[15px] text-ink-muted">
        Клієнт бачить лише відмічені проміжки. Знімете всі — день стане
        вихідним.
      </p>

      <div className="mt-5 space-y-2">
        {PREFERRED_TIMES.map((t) => (
          <label
            key={t.id}
            className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl bg-surface px-5"
          >
            <input
              type="checkbox"
              checked={slots.includes(t.id)}
              disabled={pending}
              onChange={() => toggle(t.id)}
              className="size-5 shrink-0 cursor-pointer accent-[#111111]"
            />
            <span className="text-[16px]">
              {t.label}
              <span className="ml-2 text-[14px] text-ink-muted">{t.range}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <label className="block">
          <span className="text-[14px] text-ink-muted">
            Нотатка (клієнт не бачить)
          </span>
          <input
            type="text"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Наприклад: лише курси"
            className={INPUT_CLS}
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          full
          disabled={pending || draftNote === note}
          onClick={() => {
            onSaveNote(draftNote);
            onClose();
          }}
        >
          Зберегти
        </Button>
        <Button tone="light" onClick={onClose}>
          Закрити
        </Button>
      </div>
    </Sheet>
  );
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
