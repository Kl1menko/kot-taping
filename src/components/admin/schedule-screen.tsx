"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bulkSetWorkingDays,
  setDayHours,
  setDayNote,
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
import {
  countInMonth,
  formatTime,
  hoursFor,
  hoursLabel,
  isWorkingDay,
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
            const hours = hoursFor(schedule, key);
            const outside = date.getMonth() !== month.getMonth();
            const past = key < today;

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
                aria-label={
                  hours
                    ? `${dayTitle(date)} — ${hoursLabel(hours)}`
                    : `${dayTitle(date)} — вихідний`
                }
                className={[
                  "tnum relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl text-[15px]",
                  "transition-colors duration-200 disabled:cursor-wait",
                  working
                    ? "bg-ink text-white hover:bg-[#2a2a2a]"
                    : "bg-canvas text-ink hover:bg-sand",
                  outside ? "opacity-40" : "",
                  past && !working ? "text-ink-muted" : "",
                  key === today ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "",
                ].join(" ")}
              >
                <span>{date.getDate()}</span>
                {/* Години просто в клітинці: майстриня має бачити розклад
                    місяця цілком, не відкриваючи кожен день окремо. На
                    вузькому екрані вони не влазять — там лишається саме
                    число, а години видно в листі дня. */}
                {hours && (
                  <span className="mt-0.5 hidden text-[9px] leading-none opacity-70 sm:block">
                    {formatTime(hours.opensAt)}
                  </span>
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
          Тап по числу відкриває або закриває день (типово 10:00–18:00).
          Довгий тап (правий клік) на відкритому дні — щоб змінити години чи
          додати нотатку. Тап по підпису дня тижня перемикає всі такі дні
          місяця.
        </p>
      </div>

      {openDay && hoursFor(schedule, openDay) && (
        <DaySheet
          day={openDay}
          hours={hoursFor(schedule, openDay)!}
          note={days.find((d) => d.day === openDay)?.note ?? ""}
          pending={pending}
          onClose={() => setOpenDay(null)}
          locationId={locationId}
          onDone={() => {
            setOpenDay(null);
            router.refresh();
          }}
          onSaveNote={(note) => run(() => setDayNote(locationId, openDay, note))}
        />
      )}
    </>
  );
}

/** Години й нотатка одного дня. */
function DaySheet({
  day,
  hours,
  note,
  pending,
  locationId,
  onClose,
  onDone,
  onSaveNote,
}: {
  day: string;
  hours: { opensAt: number; closesAt: number };
  note: string;
  pending: boolean;
  locationId: string;
  onClose: () => void;
  onDone: () => void;
  onSaveNote: (note: string) => void;
}) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const [opens, setOpens] = useState(formatTime(hours.opensAt));
  const [closes, setCloses] = useState(formatTime(hours.closesAt));
  const [draftNote, setDraftNote] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const save = () => {
    setError(null);
    startSaving(async () => {
      const result = await setDayHours(locationId, day, opens, closes);
      if (!result.ok) {
        setError(result.message ?? "Не вдалося зберегти.");
        return;
      }
      if (draftNote !== note) onSaveNote(draftNote);
      onDone();
    });
  };

  return (
    <Sheet open onClose={onClose} title={dayTitle(date)}>
      <p className="text-[15px] text-ink-muted">
        Клієнт бачить час на запис у цих межах, із кроком 30 хвилин.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[14px] text-ink-muted">Початок</span>
          <input
            type="time"
            value={opens}
            step={1800}
            disabled={pending || saving}
            onChange={(e) => setOpens(e.target.value)}
            className={`${INPUT_CLS} cursor-pointer`}
          />
        </label>
        <label className="block">
          <span className="text-[14px] text-ink-muted">Кінець</span>
          <input
            type="time"
            value={closes}
            step={1800}
            disabled={pending || saving}
            onChange={(e) => setCloses(e.target.value)}
            className={`${INPUT_CLS} cursor-pointer`}
          />
        </label>
      </div>

      {/* Найчастіші розклади одним тапом: набирати 10:00 і 18:00 вручну
          двадцять разів на місяць — саме та робота, від якої графік мав
          позбавити. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["10:00", "18:00"],
          ["09:00", "20:00"],
          ["12:00", "20:00"],
        ].map(([from, to]) => (
          <button
            key={`${from}-${to}`}
            type="button"
            disabled={pending || saving}
            onClick={() => {
              setOpens(from);
              setCloses(to);
            }}
            className="cursor-pointer rounded-full bg-canvas px-4 py-2 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
          >
            {from}–{to}
          </button>
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

      {error && (
        <p role="alert" className="mt-3 text-[14px] text-[#b3261e]">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Button full disabled={pending || saving} onClick={save}>
          {saving ? "Зберігаю…" : "Зберегти"}
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
