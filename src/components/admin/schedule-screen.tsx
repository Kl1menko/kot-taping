"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bulkSetWorkingDays,
  setDayIntervals,
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
  intervalsFor,
  isWorkingDay,
  parseTime,
  toSchedule,
  type Interval,
  type Schedule,
  type WorkingDay,
} from "@/lib/schedule";
import type { LocationRow } from "@/lib/db/types";
import { Sheet } from "./sheet";
import { Button, EmptyState } from "./ui";
import { INPUT_CLS } from "@/lib/form";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/**
 * Години, якими день малюється одразу після тапу, поки сервер не відповів.
 * Дзеркалять DEFAULT_OPENS/DEFAULT_CLOSES з actions.ts: тут вони потрібні лише
 * щоб намалювати клітинку, а справжнє значення приїде з наступним рендером.
 */
const OPTIMISTIC_OPENS = 10 * 60;
const OPTIMISTIC_CLOSES = 18 * 60;

/** Типові розклади дня одним тапом — зокрема з перервою на обід. */
const PRESETS: { label: string; parts: [string, string][] }[] = [
  { label: "10:00–18:00", parts: [["10:00", "18:00"]] },
  { label: "09:00–20:00", parts: [["09:00", "20:00"]] },
  {
    label: "З перервою",
    parts: [
      ["10:00", "14:00"],
      ["15:00", "19:00"],
    ],
  },
];

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

  const serverSchedule = useMemo(() => toSchedule(days), [days]);

  /**
   * Графік з уже врахованими, але ще не підтвердженими тапами.
   *
   * Кожен тап раніше чекав на сервер: запис, `revalidatePath`, `router.refresh`
   * — і лише тоді число ставало чорним. На проставлянні місяця це двадцять
   * послідовних пауз, через які здавалось, що адмінка гальмує. Тепер клітинка
   * перемикається одразу, а запис їде слідом; розійдись вони — наступний
   * `refresh` поверне стан бази.
   */
  const [schedule, applyOptimistic] = useOptimistic(
    serverSchedule,
    (current: Schedule, change: { days: string[]; open: boolean }) => {
      const next = new Map(current);
      for (const day of change.days) {
        if (change.open) {
          next.set(
            day,
            next.get(day) ?? [
              { opensAt: OPTIMISTIC_OPENS, closesAt: OPTIMISTIC_CLOSES },
            ],
          );
        } else {
          next.delete(day);
        }
      }
      return next;
    },
  );

  const grid = useMemo(() => monthGrid(month), [month]);
  const today = dateKey(startOfDay(new Date()));

  /**
   * Малювання протягуванням: провести пальцем по числах — відкрити їх разом.
   *
   * Проставити місяць двадцятьма окремими тапами означало двадцять записів,
   * двадцять скидів кешу й двадцять пауз. Протягування збирає їх в одну масову
   * дію, яка їде одним запитом уже після того, як палець відпустили.
   */
  const [painted, setPainted] = useState<Set<string> | null>(null);
  const painting = painted !== null;

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

  /**
   * Дія над графіком: спершу малюємо результат, потім пишемо.
   *
   * `applyOptimistic` має бути викликаний усередині транзиції — інакше React
   * відкине зміну одразу ж, ще до відповіді сервера.
   */
  const run = (change: { days: string[]; open: boolean }, fn: () => Promise<void>) => {
    startTransition(async () => {
      applyOptimistic(change);
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
    run({ days: keys, open: !allOpen }, () =>
      bulkSetWorkingDays(locationId, keys, !allOpen),
    );
  };

  /** Веде палець від першого числа: набір росте, поки кнопку не відпустили. */
  const startPaint = (key: string) => setPainted(new Set([key]));

  const extendPaint = (key: string) => {
    setPainted((current) => {
      if (!current || current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

  /**
   * Палець відпустили. Один день — це звичайний тап (відкрити або відкрити
   * лист); кілька — масова дія одним запитом.
   */
  const commitPaint = () => {
    if (!painted) return;
    setPainted(null);

    const keys = [...painted].sort();
    if (keys.length === 1) {
      const [key] = keys;
      if (isWorkingDay(schedule, key)) {
        setOpenDay(key);
      } else {
        run({ days: keys, open: true }, () =>
          toggleWorkingDay(locationId, key, false),
        );
      }
      return;
    }

    // Провели по числах — відкриваємо всі. Закриття лишається за підписом дня
    // тижня й кнопкою місяця: протягування частіше означає «працюю ці дні».
    run({ days: keys, open: true }, () =>
      bulkSetWorkingDays(locationId, keys, true),
    );
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

        {/* `touch-none`, щоб протягування по числах малювало, а не гортало
            сторінку; `onPointerUp` на контейнері — палець може піднятись і
            між клітинками. */}
        <div
          className="mt-1 grid touch-none grid-cols-7 gap-1"
          onPointerUp={commitPaint}
          onPointerLeave={commitPaint}
          onPointerCancel={() => setPainted(null)}
        >
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
                // `disabled={pending}` тут не стоїть навмисно: він глушив усі
                // 42 клітинки на час запису, тож швидкі тапи поспіль губились
                // і доводилось чекати після кожного числа. Записи незалежні —
                // кожен по своїй даті, — а стан клітинки й так уже намальовано.
                // Закритий день тап відкриває типовими годинами; відкритий —
                // веде в лист, де ці години правлять. Довгий тап тут був
                // єдиним шляхом до годин, і на телефоні його немає: браузер
                // не шле `contextmenu` по утриманню кнопки, тож години
                // лишались недосяжними всюди, крім десктопа з мишею.
                // Дію робить не `onClick`, а підняття пальця (`commitPaint`):
                // інакше протягування по числах давало б і серію кліків, і
                // масову дію поверх них.
                onPointerDown={(e) => {
                  // Захоплення заважає `pointerenter` на сусідніх клітинках —
                  // без цього браузер шле всі події лише першій кнопці.
                  e.currentTarget.releasePointerCapture?.(e.pointerId);
                  startPaint(key);
                }}
                onPointerEnter={() => painting && extendPaint(key)}
                // Клавіатура подій вказівника не шле, тож Enter/Space лишились
                // би без дії. `detail === 0` відрізняє їх від кліку мишею,
                // який уже опрацьовано підняттям пальця.
                onClick={(e) => {
                  if (e.detail !== 0) return;
                  if (working) setOpenDay(key);
                  else
                    run({ days: [key], open: true }, () =>
                      toggleWorkingDay(locationId, key, false),
                    );
                }}
                aria-pressed={working}
                aria-label={
                  hours
                    ? `${dayTitle(date)} — ${intervalsFor(schedule, key)
                        .map(hoursLabel)
                        .join(", ")}, змінити години`
                    : `${dayTitle(date)} — вихідний, відкрити день`
                }
                className={[
                  "tnum relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl text-[15px]",
                  "transition-colors duration-200",
                  // Утримання пальця на числі більше нічого не робить, але
                  // браузер на телефоні все одно виділяв би цифру й показував
                  // лупу з «копіювати» — шум там, де чекають на тап.
                  "touch-manipulation select-none",
                  working || painted?.has(key)
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
                {/* Крапка — ознака перерви: день 10:00–19:00 з обідом і без
                    нього виглядали б однаково, а це різний розклад. */}
                {intervalsFor(schedule, key).length > 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 size-1 rounded-full bg-current opacity-70"
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
              run({ days: ownDays.map(dateKey), open: true }, () =>
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
              run({ days: ownDays.map(dateKey), open: false }, () =>
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
              run({ days: week, open: true }, () =>
                bulkSetWorkingDays(locationId, week, true),
              );
            }}
            disabled={pending}
          >
            Відкрити тиждень
          </Button>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          Тап по закритому числу відкриває день (типово 10:00–18:00). Тап по
          відкритому — лист, де правляться години, нотатка і де день можна
          закрити. Тап по підпису дня тижня перемикає всі такі дні місяця.
        </p>
      </div>

      {openDay && hoursFor(schedule, openDay) && (
        <DaySheet
          // Ключ по даті: поля годин ініціалізуються з `useState` при
          // монтуванні, і без цього другий відкритий день перевикористав би
          // той самий інстанс — у формі стояли б години попереднього дня.
          key={openDay}
          day={openDay}
          intervals={intervalsFor(schedule, openDay)}
          note={days.find((d) => d.day === openDay)?.note ?? ""}
          pending={pending}
          onClose={() => setOpenDay(null)}
          locationId={locationId}
          onDone={() => {
            setOpenDay(null);
            router.refresh();
          }}
          onCloseDay={() => {
            setOpenDay(null);
            run({ days: [openDay], open: false }, () =>
              toggleWorkingDay(locationId, openDay, true),
            );
          }}
        />
      )}
    </>
  );
}

/** Відрізки часу й нотатка одного дня. */
function DaySheet({
  day,
  intervals,
  note,
  pending,
  locationId,
  onClose,
  onDone,
  onCloseDay,
}: {
  day: string;
  intervals: Interval[];
  note: string;
  pending: boolean;
  locationId: string;
  onClose: () => void;
  onDone: () => void;
  onCloseDay: () => void;
}) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  /** Чернетка відрізків — рядками, бо саме так їх віддає `<input type="time">`. */
  const [draft, setDraft] = useState(() =>
    intervals.map((i) => ({
      opens: formatTime(i.opensAt),
      closes: formatTime(i.closesAt),
    })),
  );
  const [draftNote, setDraftNote] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const busy = pending || saving;

  const patch = (index: number, key: "opens" | "closes", value: string) => {
    setDraft((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  };

  /**
   * Новий відрізок починається там, де скінчився останній, плюс година
   * перерви: найчастіший намір — «а потім ще ввечері», і пропонувати для
   * нього порожні поля означало б набирати час, який і так очевидний.
   */
  const addInterval = () => {
    setDraft((current) => {
      const last = current[current.length - 1];
      const from = last ? (parseTime(last.closes) ?? 14 * 60) + 60 : 10 * 60;
      const start = Math.min(from, 22 * 60);
      return [
        ...current,
        { opens: formatTime(start), closes: formatTime(Math.min(start + 120, 23 * 60 + 30)) },
      ];
    });
  };

  const removeInterval = (index: number) => {
    setDraft((current) => current.filter((_, i) => i !== index));
  };

  const save = () => {
    setError(null);
    startSaving(async () => {
      const result = await setDayIntervals(
        locationId,
        day,
        draft.map((row) => ({ opensAt: row.opens, closesAt: row.closes })),
      );
      if (!result.ok) {
        setError(result.message ?? "Не вдалося зберегти.");
        return;
      }
      // Нотатку чекаємо тут, а не лишаємо окремій транзиції: лист закривався
      // одразу після годин, і запис нотатки летів у вже розмонтований
      // компонент — зміна мовчки губилась.
      if (draftNote !== note) {
        await setDayNote(locationId, day, draftNote);
      }
      onDone();
    });
  };

  return (
    <Sheet open onClose={onClose} title={dayTitle(date)}>
      <p className="text-[15px] text-ink-muted">
        Клієнт бачить час на запис у цих відрізках, із кроком 30 хвилин. Кілька
        відрізків — це перерва між ними: обід, виїзд, дорога.
      </p>

      <div className="mt-5 space-y-3">
        {draft.map((row, index) => (
          <div key={index} className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="text-[14px] text-ink-muted">Початок</span>
              <input
                type="time"
                value={row.opens}
                step={1800}
                disabled={busy}
                onChange={(e) => patch(index, "opens", e.target.value)}
                className={`${INPUT_CLS} cursor-pointer`}
              />
            </label>
            <label className="block flex-1">
              <span className="text-[14px] text-ink-muted">Кінець</span>
              <input
                type="time"
                value={row.closes}
                step={1800}
                disabled={busy}
                onChange={(e) => patch(index, "closes", e.target.value)}
                className={`${INPUT_CLS} cursor-pointer`}
              />
            </label>

            {/* Останній відрізок прибрати не можна: день без жодного виглядав
                би відкритим, але записатись у нього не було б як. Щоб зовсім
                не працювати — «Зробити вихідним» нижче. */}
            <button
              type="button"
              disabled={busy || draft.length === 1}
              onClick={() => removeInterval(index)}
              aria-label={`Прибрати відрізок ${row.opens}–${row.closes}`}
              className="mb-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-canvas text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 12h12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={addInterval}
        className="mt-3 min-h-[44px] cursor-pointer rounded-full bg-canvas px-5 text-[14px] text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
      >
        + Ще відрізок
      </button>

      {/* Найчастіші розклади одним тапом: набирати їх вручну двадцять разів на
          місяць — саме та робота, від якої графік мав позбавити. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={busy}
            onClick={() => setDraft(preset.parts.map(([opens, closes]) => ({ opens, closes })))}
            className="cursor-pointer rounded-full bg-canvas px-4 py-2 text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
          >
            {preset.label}
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
        <Button full disabled={busy} onClick={save}>
          {saving ? "Зберігаю…" : "Зберегти"}
        </Button>
        <Button tone="light" onClick={onClose}>
          Скасувати
        </Button>
      </div>

      {/* Тап по відкритому числу тепер веде сюди, тож зробити день вихідним
          можна лише звідси — інакше закритий день не було б як повернути. */}
      <button
        type="button"
        disabled={busy}
        onClick={onCloseDay}
        className="mt-4 w-full cursor-pointer rounded-full py-3 text-[14px] text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
      >
        Зробити вихідним
      </button>
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
