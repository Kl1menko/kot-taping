"use client";

import { dateKey, isToday, weekDays } from "@/lib/calendar";

const WEEKDAY_LETTER = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

/**
 * Тиждень Пн–Нд у сімох рівних колонках.
 *
 * Раніше тут була довга стрічка з горизонтальною прокруткою — вона не давала
 * побачити тиждень цілком і вимагала гортання, щоб зрозуміти, де ти. Фіксовані
 * сім колонок читаються як календар, а стрілки перегортають тиждень.
 */
export function DateStrip({
  selected,
  onSelect,
  onStep,
  stepLabel,
  counts,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Крок стрілок — тиждень чи місяць, залежно від режиму перегляду. */
  onStep: (direction: -1 | 1) => void;
  stepLabel: string;
  /** dateKey → скільки записів того дня; малює крапки-індикатори. */
  counts?: Record<string, number>;
}) {
  const days = weekDays(selected);

  return (
    <div className="flex items-center gap-1">
      <Arrow
        direction="prev"
        onClick={() => onStep(-1)}
        label={`Попередній ${stepLabel}`}
      />

      <div className="grid min-w-0 flex-1 grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = dateKey(day);
          const active = key === dateKey(selected);
          const today = isToday(day);
          const count = counts?.[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              aria-current={active ? "date" : undefined}
              aria-label={`${day.getDate()} ${WEEKDAY_LETTER[(day.getDay() + 6) % 7]}${count ? `, записів: ${count}` : ", вільно"}`}
              className="group flex cursor-pointer flex-col items-center gap-1 rounded-2xl py-2"
            >
              <span
                className={`text-[11px] uppercase tracking-[0.06em] ${active ? "text-ink" : "text-ink-muted"}`}
              >
                {WEEKDAY_LETTER[(day.getDay() + 6) % 7]}
              </span>

              <span
                className={[
                  "tnum grid size-9 place-items-center rounded-full text-[16px] transition-colors duration-200",
                  active
                    ? "bg-ink text-white"
                    : today
                      ? "bg-sand text-ink"
                      : "text-ink group-hover:bg-canvas",
                ].join(" ")}
              >
                {day.getDate()}
              </span>

              {/* До трьох крапок — щільність дня видно, не читаючи чисел.
                  Місце тримається завжди, щоб колонки не стрибали. */}
              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                {count > 0 &&
                  Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={`size-1 rounded-full ${active ? "bg-ink" : "bg-ink-muted/50"}`}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>

      <Arrow
        direction="next"
        onClick={() => onStep(1)}
        label={`Наступний ${stepLabel}`}
      />
    </div>
  );
}

function Arrow({
  direction,
  onClick,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-surface hover:text-ink"
    >
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
        <path d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

export type CalendarMode = "day" | "week" | "month" | "list";

const MODES: { id: CalendarMode; label: string }[] = [
  { id: "day", label: "День" },
  { id: "week", label: "Тиждень" },
  { id: "month", label: "Місяць" },
  { id: "list", label: "Список" },
];

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: CalendarMode;
  onChange: (m: CalendarMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Режим перегляду"
      className="flex gap-1 rounded-full bg-surface p-1"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          type="button"
          aria-selected={mode === m.id}
          onClick={() => onChange(m.id)}
          className={[
            // min-w-0 обов'язковий: без нього flex-1 не дає кнопці стиснутись
            // вужче за текст, і четверта вкладка виштовхує рядок за екран.
            "min-w-0 flex-1 cursor-pointer rounded-full px-2 py-2.5 text-[14px] whitespace-nowrap sm:px-4",
            "transition-colors duration-200",
            mode === m.id ? "bg-ink text-white" : "text-ink-muted hover:text-ink",
          ].join(" ")}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
