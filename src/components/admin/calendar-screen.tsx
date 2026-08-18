"use client";

import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  dateKey,
  dayTitle,
  isRangeLoaded,
  isSameDay,
  isToday,
  monthGrid,
  monthTitle,
  nextVisitStart,
} from "@/lib/calendar";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import type { LocationRow, ServiceRow } from "@/lib/db/types";
import { AppointmentCard } from "./appointment-card";
import { AppointmentDetails } from "./appointment-details";
import { AppointmentForm } from "./appointment-form";
import { DateStrip, ModeSwitch, type CalendarMode } from "./date-strip";
import { DayGrid } from "./day-grid";
import { WeekGrid } from "./week-grid";
import { Sheet } from "./sheet";
import { Button, EmptyState, formatMoney } from "./ui";

type SheetState =
  | { kind: "closed" }
  | { kind: "details"; appointment: AppointmentWithRefs }
  | {
      kind: "form";
      appointment?: AppointmentWithRefs;
      /** Заготовка з попереднього запису — режим «наступний запис». */
      repeatOf?: AppointmentWithRefs;
      start?: Date;
    };

export function CalendarScreen({
  appointments,
  services,
  locations,
  selectedDate,
  selectedLocation,
}: {
  /** Записи вже за потрібний період — вибірку робить сервер. */
  appointments: AppointmentWithRefs[];
  services: ServiceRow[];
  locations: LocationRow[];
  selectedDate: Date;
  /** Slug активного кабінету; порожньо — усі. */
  selectedLocation: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>("list");
  const [sheet, setSheet] = useState<SheetState>({ kind: "closed" });
  const [isPending, startTransition] = useTransition();

  const closeSheet = useCallback(() => setSheet({ kind: "closed" }), []);

  /**
   * Дата живе в URL (стан переживає перезавантаження), але сторінка
   * `force-dynamic`, тож `router.push` малює нову дату лише після відповіді
   * сервера з двома запитами в базу. Стрічка через це відгукувалась на дотик
   * із затримкою — здавалось, що кнопка не спрацювала, і люди тиснули ще раз.
   *
   * Тому активний день тримаємо ще й локально: клік перемальовує стрічку
   * миттєво, а URL і дані підтягуються слідом.
   *
   * Саме `useOptimistic`, а не звичайний стан: він сам повертається до
   * серверного значення, коли перехід завершився. Ручна синхронізація через
   * ефект робила б зайвий каскадний рендер і ламалась би на «назад».
   */
  const [optimisticDate, setOptimisticDate] = useOptimistic(selectedDate);

  /**
   * Крок у межах уже завантаженого діапазону не турбує сервер, тож показану
   * дату тримаємо тут. Разом із нею запам'ятовуємо серверну дату, від якої
   * крок робився: щойно сервер віддасть інший період (перехід через межу
   * місяця, зміна кабінету, кнопка «назад»), пара перестає збігатись і
   * локальне значення саме себе скасовує — без ефектів і ручного скидання.
   */
  const [local, setLocal] = useState<{ date: Date; base: Date } | null>(null);
  const shownDate =
    local && dateKey(local.base) === dateKey(selectedDate)
      ? local.date
      : optimisticDate;

  const buildHref = (d: Date, location: string) => {
    const params = new URLSearchParams({ date: dateKey(d) });
    if (location) params.set("location", location);
    return `/admin/calendar?${params}`;
  };

  /**
   * Дата й кабінет живуть в URL — стан переживає перезавантаження.
   *
   * Сервер віддає цілий місяць плюс тиждень навколо, тож крок стрілкою майже
   * завжди потрапляє в дані, які вже лежать у пам'яті. У такому разі запит не
   * потрібен зовсім: міняємо дату локально й лише підправляємо адресу через
   * `history.replaceState` — на відміну від `router.push`, він не перезапускає
   * серверний рендер. Перемикання стає миттєвим замість двох запитів у базу.
   */
  const navigate = (d: Date, location = selectedLocation) => {
    const href = buildHref(d, location);

    if (location === selectedLocation && isRangeLoaded(d, selectedDate)) {
      setLocal({ date: d, base: selectedDate });
      // Саме `replaceState`, а не `router.replace`: адреса оновлюється, але
      // серверний рендер не перезапускається — заради цього все й робиться.
      window.history.replaceState(null, "", href);
      return;
    }

    setLocal(null);
    startTransition(() => {
      // Всередині переходу — інакше React відкине оптимістичне значення.
      setOptimisticDate(d);
      router.push(href, { scroll: false });
    });
  };

  const selectDate = (d: Date) => navigate(d);

  /**
   * Крок стрілок відповідає тому, що людина бачить: у місячній сітці гортаємо
   * місяць, у решті режимів — тиждень. Інакше стрілка в «Місяці» рухала б
   * виділення всередині того самого екрана.
   */
  const step = (direction: -1 | 1) => {
    // Рахуємо від показаної дати, а не від серверної: інакше два швидкі
    // дотики поспіль дали б один крок — другий стартував би з тієї ж дати.
    const from = shownDate;

    if (mode === "month") {
      const next = new Date(from);
      // Спершу 1-ше число: інакше 31 березня − 1 місяць дало б 3 березня.
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
      // Тримаємось того ж числа, якщо воно існує в новому місяці.
      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      next.setDate(Math.min(from.getDate(), lastDay));
      selectDate(next);
      return;
    }

    selectDate(addDays(from, direction * 7));
  };

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithRefs[]>();
    for (const a of appointments) {
      const key = dateKey(new Date(a.starts_at));
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return map;
  }, [appointments]);

  const counts = useMemo(
    () => Object.fromEntries([...byDay].map(([k, v]) => [k, v.length])),
    [byDay],
  );

  const dayList = byDay.get(dateKey(shownDate)) ?? [];

  // Підсумок дня — майстер бачить завантаження й гроші, не рахуючи в голові.
  const dayTotal = dayList
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + a.price, 0);

  const openDetails = (a: AppointmentWithRefs) =>
    setSheet({ kind: "details", appointment: a });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-[19px] leading-tight sm:text-[22px]">
          {monthTitle(shownDate)}
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          {!isToday(shownDate) && (
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="cursor-pointer rounded-full border border-line px-4 py-2 text-[14px] whitespace-nowrap transition-colors duration-200 hover:border-ink"
            >
              Сьогодні
            </button>
          )}

          <DatePicker value={shownDate} onPick={selectDate} />
        </div>
      </div>

      {/* Фільтр кабінетів — лише коли їх справді кілька. */}
      {locations.length > 1 && (
        <div className="mt-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LocationChip
            label="Усі кабінети"
            active={selectedLocation === ""}
            onClick={() => navigate(shownDate, "")}
          />
          {locations.map((l) => (
            <LocationChip
              key={l.id}
              label={l.city}
              active={selectedLocation === l.slug}
              onClick={() => navigate(shownDate, l.slug)}
            />
          ))}
        </div>
      )}

      <div className="mt-5">
        <DateStrip
          selected={shownDate}
          onSelect={selectDate}
          onStep={step}
          stepLabel={mode === "month" ? "місяць" : "тиждень"}
          counts={counts}
          pending={isPending}
        />
      </div>

      <div className="mt-4">
        <ModeSwitch mode={mode} onChange={setMode} />
      </div>

      {(mode === "list" || mode === "day") && (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[16px]">
            {dayTitle(shownDate)}
            {isToday(shownDate) && (
              <span className="ml-2 text-[14px] text-ink-muted">сьогодні</span>
            )}
          </p>
          {dayList.length > 0 && (
            <p className="tnum text-[14px] text-ink-muted">
              {dayList.length}{" "}
              {dayList.length === 1
                ? "запис"
                : dayList.length < 5
                  ? "записи"
                  : "записів"}
              {dayTotal > 0 && ` · ${formatMoney(dayTotal)}`}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        {mode === "list" && (
          <ListView list={dayList} onOpen={openDetails} onCreate={() => setSheet({ kind: "form", start: shownDate })} />
        )}
        {mode === "day" && (
          <DayGrid
            list={dayList}
            date={shownDate}
            onOpen={openDetails}
            onSlot={(start) => setSheet({ kind: "form", start })}
          />
        )}
        {mode === "week" && (
          <WeekGrid
            byDay={byDay}
            date={shownDate}
            onOpen={openDetails}
            onPickDay={selectDate}
          />
        )}
        {mode === "month" && (
          <MonthView
            byDay={byDay}
            date={shownDate}
            onPickDay={(d) => {
              selectDate(d);
              setMode("list");
            }}
          />
        )}
      </div>

      {/* Плаваюча кнопка — головна дія екрана, доступна в будь-якому режимі. */}
      <button
        type="button"
        onClick={() => setSheet({ kind: "form", start: shownDate })}
        aria-label="Новий запис"
        className="fixed bottom-24 right-5 z-30 grid size-14 cursor-pointer place-items-center rounded-full bg-ink text-white shadow-lg transition-transform duration-200 hover:scale-105 md:bottom-8 md:right-8"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <Sheet
        open={sheet.kind !== "closed"}
        onClose={closeSheet}
        title={
          sheet.kind === "details"
            ? "Запис"
            : sheet.kind === "form" && sheet.appointment
              ? "Редагування запису"
              : sheet.kind === "form" && sheet.repeatOf
                ? "Наступний запис"
                : "Новий запис"
        }
      >
        {sheet.kind === "details" && (
          <AppointmentDetails
            appointment={sheet.appointment}
            onEdit={(a) => setSheet({ kind: "form", appointment: a })}
            onRepeat={(a) =>
              // Наступний візит курсу зазвичай за тиждень — з нього й
              // починаємо, майстриня поправить дату на місці.
              setSheet({
                kind: "form",
                repeatOf: a,
                start: nextVisitStart(new Date(a.starts_at)),
              })
            }
            onClose={closeSheet}
          />
        )}
        {sheet.kind === "form" && (
          <AppointmentForm
            services={services}
            locations={locations}
            appointment={sheet.appointment}
            repeatOf={sheet.repeatOf}
            defaultStart={sheet.start}
            onDone={closeSheet}
          />
        )}
      </Sheet>
    </>
  );
}

function LocationChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "shrink-0 cursor-pointer rounded-full px-4 py-2 text-[14px] whitespace-nowrap",
        "transition-colors duration-200",
        active
          ? "bg-ink text-white"
          : "bg-surface text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/**
 * Вибір дати іконкою-календарем.
 *
 * Під іконкою лежить прозорий `<input type="date">`: нативний пікер уже вміє
 * все потрібне (місяці, роки, локаль, керування з клавіатури), а на телефоні
 * відкриває звичний системний вибір. Власна реалізація дала б гірший результат
 * за більший код.
 */
function DatePicker({
  value,
  onPick,
}: {
  value: Date;
  onPick: (d: Date) => void;
}) {
  return (
    <label
      className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-line text-ink-muted transition-colors duration-200 hover:border-ink hover:text-ink"
      title="Обрати дату"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </svg>

      <input
        type="date"
        value={dateKey(value)}
        onChange={(e) => {
          if (!e.target.value) return;
          const [y, m, d] = e.target.value.split("-").map(Number);
          onPick(new Date(y, m - 1, d));
        }}
        aria-label="Обрати дату"
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function ListView({
  list,
  onOpen,
  onCreate,
}: {
  list: AppointmentWithRefs[];
  onOpen: (a: AppointmentWithRefs) => void;
  onCreate: () => void;
}) {
  if (list.length === 0) {
    return (
      <EmptyState
        title="Вільний день"
        hint="Записів немає. Оберіть інший день угорі або поставте запис на цей."
        action={<Button onClick={onCreate}>Створити запис</Button>}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((a) => (
        <li key={a.id}>
          <AppointmentCard appointment={a} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function MonthView({
  byDay,
  date,
  onPickDay,
}: {
  byDay: Map<string, AppointmentWithRefs[]>;
  date: Date;
  onPickDay: (d: Date) => void;
}) {
  const grid = monthGrid(date);

  return (
    <div className="rounded-[var(--radius-tile)] bg-surface p-3">
      <div className="grid grid-cols-7 gap-1">
        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"].map((d) => (
          <span
            key={d}
            className="py-2 text-center text-[12px] uppercase tracking-[0.1em] text-ink-muted"
          >
            {d}
          </span>
        ))}

        {grid.map((day) => {
          const key = dateKey(day);
          const list = byDay.get(key) ?? [];
          const live = list.filter((a) => a.status !== "cancelled");
          const outside = day.getMonth() !== date.getMonth();
          const active = isSameDay(day, date);
          const today = isToday(day);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={`${day.getDate()}, записів: ${live.length}`}
              className={[
                "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200",
                active
                  ? "bg-ink text-white"
                  : today
                    ? "bg-sand"
                    : "hover:bg-canvas",
                outside && !active ? "opacity-30" : "",
              ].join(" ")}
            >
              <span className="tnum text-[14px] leading-none">
                {day.getDate()}
              </span>

              {/* Крапки замість чисел: щільність місяця читається одним
                  поглядом, а двоцифрові лічильники не тісняться в клітинці. */}
              <span aria-hidden="true" className="flex h-1 items-center gap-0.5">
                {live.slice(0, 3).map((_, i) => (
                  <span
                    key={i}
                    className={`size-1 rounded-full ${active ? "bg-white/80" : "bg-ink-muted/50"}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
