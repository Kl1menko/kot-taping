"use client";

import Link from "next/link";
import type {
  ClientSplit,
  Conversion,
  DayBucket,
  LocationStat,
  MonthBucket,
  ServiceStat,
  Totals,
  WeekdayLoad,
} from "@/lib/analytics";
import {
  MONTHS_SHORT,
  WORK_END_HOUR,
  WORK_START_HOUR,
} from "@/lib/calendar";
import { Panel, formatMoney } from "./ui";

export type Period = "week" | "month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Тиждень" },
  { id: "month", label: "Місяць" },
  { id: "year", label: "Рік" },
];

const PERIOD_NOUN: Record<Period, string> = {
  week: "тиждень",
  month: "місяць",
  year: "рік",
};

export type AnalyticsData = {
  period: Period;
  title: string;
  /** `2026-03` або `2026` — якір періоду для посилань «назад/вперед». */
  anchor: string;
  locations: { slug: string; city: string }[];
  /** Порожньо — «Усі кабінети». */
  activeLocation: string;
  totals: Totals;
  changes: {
    appointments: number | null;
    revenue: number | null;
    averageCheck: number | null;
  };
  /** Той самий період торік — сезонність важливіша за «проти минулого місяця». */
  lastYear: {
    totals: Totals;
    revenue: number | null;
    appointments: number | null;
  };
  days: DayBucket[];
  months: MonthBucket[];
  byLocation: LocationStat[];
  services: ServiceStat[];
  clients: ClientSplit;
  conversion: Conversion;
  load: WeekdayLoad[];
  hours: { hour: number; count: number }[];
  workDays: number;
};

/**
 * Зсув якоря на `delta` періодів.
 *
 * Для тижня рухаємось помісячно — окремого якоря для тижня немає, і це свідомо:
 * перемикач періоду тримає одну шкалу «місяць/рік», а тиждень усередині місяця
 * майстриня обирає в календарі.
 */
function shiftAnchor(anchor: string, period: Period, delta: number): string {
  if (period === "year") return String(Number(anchor) + delta);

  const [y, m] = anchor.split("-").map(Number);
  const shifted = new Date(y, m - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function hrefFor(
  data: AnalyticsData,
  over: { period?: Period; anchor?: string; location?: string } = {},
): string {
  const period = over.period ?? data.period;
  // Зміна періоду скидає якір у сьогодення: «2026-03» у режимі року стало б
  // просто «2026», і користувач мовчки поїхав би не туди, куди тиснув.
  const anchor =
    over.anchor ?? (over.period && over.period !== data.period ? "" : data.anchor);
  const location = over.location ?? data.activeLocation;

  const params = new URLSearchParams({ period });
  if (anchor) params.set("at", anchor);
  if (location) params.set("location", location);
  return `/admin/analytics?${params}`;
}

export function AnalyticsScreen({ data }: { data: AnalyticsData }) {
  const empty = data.totals.appointments === 0;
  const multiLocation = data.locations.length > 1;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Аналітика</h1>
      </div>

      <nav className="mt-5 flex gap-1 rounded-full bg-surface p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={hrefFor(data, { period: p.id })}
            aria-current={data.period === p.id ? "page" : undefined}
            className={[
              "min-w-0 flex-1 rounded-full px-3 py-2.5 text-center text-[14px] whitespace-nowrap",
              "transition-colors duration-200",
              data.period === p.id
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {multiLocation && (
        <nav
          aria-label="Кабінет"
          className="mt-2 flex gap-1 rounded-full bg-surface p-1"
        >
          <Link
            href={hrefFor(data, { location: "" })}
            aria-current={data.activeLocation === "" ? "page" : undefined}
            className={tabCls(data.activeLocation === "")}
          >
            Усі кабінети
          </Link>
          {data.locations.map((l) => (
            <Link
              key={l.slug}
              href={hrefFor(data, { location: l.slug })}
              aria-current={data.activeLocation === l.slug ? "page" : undefined}
              className={tabCls(data.activeLocation === l.slug)}
            >
              {l.city}
            </Link>
          ))}
        </nav>
      )}

      {/* Стрілки дають дивитись у минуле, а не лише на поточний період. */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Link
          href={hrefFor(data, {
            anchor: shiftAnchor(data.anchor, data.period, -1),
          })}
          aria-label="Попередній період"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition-colors duration-200 hover:border-ink"
        >
          <Arrow direction="left" />
        </Link>

        <p className="min-w-0 flex-1 truncate text-center text-[15px]">
          {data.title}
        </p>

        <Link
          href={hrefFor(data, {
            anchor: shiftAnchor(data.anchor, data.period, 1),
          })}
          aria-label="Наступний період"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition-colors duration-200 hover:border-ink"
        >
          <Arrow direction="right" />
        </Link>
      </div>

      {empty ? (
        <Panel className="mt-4 px-6 py-16 text-center">
          <p className="text-[18px]">Даних за цей період немає</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">
            Аналітика рахує лише виконані візити. Позначайте записи як
            «Виконано» в календарі — і цифри з’являться.
          </p>
        </Panel>
      ) : null}

      {/* Дві колонки вже на телефоні: чотири плитки в один стовпчик займали
          майже весь екран, і графіки нижче — головне на цій сторінці —
          починались аж за межею видимості. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <Kpi
          label="всього візитів"
          value={String(data.totals.appointments)}
          change={data.changes.appointments}
        />
        <Kpi
          label="виручка"
          value={formatMoney(data.totals.revenue)}
          change={data.changes.revenue}
        />
        <Kpi
          label="середній чек"
          value={formatMoney(data.totals.averageCheck)}
          change={data.changes.averageCheck}
        />
        <Kpi
          label="пікова година"
          value={
            data.totals.peakHour === null
              ? "—"
              : `${String(data.totals.peakHour).padStart(2, "0")}:00`
          }
        />
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        ↑↓ — зміна проти попереднього періоду такої ж тривалості. Виручка
        рахується за виконаними візитами.
      </p>

      {/* Той самий період торік. Для режиму «Рік» блок не потрібен: там
          «попередній період» і «торік» — одне й те саме. */}
      {data.period !== "year" && data.lastYear.totals.appointments > 0 && (
        <Section title="Торік у цей самий період">
          <div className="grid grid-cols-2 gap-3 px-5 py-5">
            <Stat
              label="виручка торік"
              value={formatMoney(data.lastYear.totals.revenue)}
            />
            <Stat
              label="візитів торік"
              value={String(data.lastYear.totals.appointments)}
            />
          </div>
          <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-muted">
            {describeYearChange(data.lastYear.revenue)}
          </p>
        </Section>
      )}

      {multiLocation && (
        <Section title="Кабінети">
          {data.byLocation.every((l) => l.count === 0) ? (
            <p className="px-5 py-6 text-[15px] text-ink-muted">
              Виконаних візитів за період не було.
            </p>
          ) : (
            <ul className="px-5 py-5">
              {data.byLocation.map((l) => (
                <li
                  key={l.id}
                  className="border-t border-line py-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[16px]">
                      {l.city}
                    </span>
                    <span className="tnum shrink-0 text-[16px]">
                      {formatMoney(l.revenue)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${l.share}%` }}
                    />
                  </div>
                  <p className="tnum mt-2 text-[13px] text-ink-muted">
                    {l.count} {visitWord(l.count)} · {l.share}% доходу
                    {l.count > 0 &&
                      ` · середній чек ${formatMoney(l.averageCheck)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-muted">
            Кабінети завжди показані всі — незалежно від обраного фільтра.
          </p>
        </Section>
      )}

      {/* Сезонність: 12 місяців поруч. Показуємо в режимі «Рік», де це і є
          головний зріз, — у місяці такий графік лише дублював би дні. */}
      {data.period === "year" && (
        <Section title="Виручка по місяцях">
          <div className="px-5 py-5">
            <BarList
              items={data.months.map((m) => ({
                key: `${m.year}-${m.month}`,
                label: MONTHS_SHORT[m.month],
                value: m.revenue,
                display: m.revenue > 0 ? formatMoney(m.revenue) : "—",
              }))}
              emptyHint="Виконаних візитів за рік не було."
            />
          </div>
        </Section>
      )}

      {data.days.length > 1 && (
        <Section title={`Виручка по днях · ${periodUnit(data.period)}`}>
          <div className="px-5 py-5">
            <BarList
              items={data.days
                .filter((d) => d.revenue > 0)
                .map((d) => ({
                  key: d.key,
                  label: dayLabel(d.date, data.period),
                  value: d.revenue,
                  display: formatMoney(d.revenue),
                }))}
              emptyHint="Виконаних візитів за період не було."
            />
            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              Дні без виконаних візитів у списку не показані.
            </p>
          </div>
        </Section>
      )}

      <Section title="Клієнти">
        <div className="grid grid-cols-3 gap-3 px-5 py-5">
          <Stat label="усього" value={String(data.clients.total)} />
          <Stat label="нових" value={String(data.clients.fresh)} />
          <Stat label="повторних" value={String(data.clients.returning)} />
        </div>
        {data.clients.total > 0 && (
          <div className="px-5 pb-5">
            <SplitBar
              fresh={data.clients.fresh}
              returning={data.clients.returning}
            />
          </div>
        )}
      </Section>

      <Section title="Заявки з сайту">
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4">
          <Stat label="усього" value={String(data.conversion.requests)} />
          <Stat label="стали записом" value={String(data.conversion.converted)} />
          <Stat label="в очікуванні" value={String(data.conversion.pending)} />
          <Stat label="конверсія" value={`${data.conversion.rate}%`} />
        </div>
      </Section>

      <Section title="Завантаженість по днях тижня">
        <div className="px-5 py-5">
          <BarList
            items={data.load.map((l) => ({
              key: String(l.weekday),
              label: l.label,
              value: l.percent,
              display: `${l.percent}%`,
            }))}
            max={100}
          />
          <p className="mt-4 text-[13px] text-ink-muted">
            Робоче вікно {String(WORK_START_HOUR).padStart(2, "0")}:00–
            {String(WORK_END_HOUR).padStart(2, "0")}:00 · днів у періоді:{" "}
            {data.workDays}
          </p>
        </div>
      </Section>

      <Section title="Записи по годинах">
        <div className="px-5 py-5">
          <BarList
            items={data.hours.map((h) => ({
              key: String(h.hour),
              label: `${String(h.hour).padStart(2, "0")}`,
              value: h.count,
              display: String(h.count),
            }))}
          />
        </div>
      </Section>

      <Section title="Послуги">
        {data.services.length === 0 ? (
          <p className="px-5 py-6 text-[15px] text-ink-muted">
            Виконаних візитів за період не було.
          </p>
        ) : (
          <ul className="px-5 py-5">
            {data.services.map((s) => (
              <li key={s.id} className="border-t border-line py-4 first:border-t-0 first:pt-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[16px]">{s.title}</span>
                  <span className="tnum shrink-0 text-[16px]">
                    {formatMoney(s.revenue)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${s.share}%` }}
                  />
                </div>
                <p className="tnum mt-2 text-[13px] text-ink-muted">
                  {s.count} {visitWord(s.count)}
                  {" · "}
                  {s.share}% доходу · середній чек {formatMoney(s.averageCheck)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

/** Спільний вигляд вкладки в перемикачах періоду й кабінету. */
function tabCls(active: boolean): string {
  return [
    "min-w-0 flex-1 rounded-full px-3 py-2.5 text-center text-[14px] whitespace-nowrap",
    "transition-colors duration-200",
    active ? "bg-ink text-white" : "text-ink-muted hover:text-ink",
  ].join(" ");
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-[15px] text-ink-muted">
        <span aria-hidden="true">/ </span>
        {title}
      </h2>
      <Panel className="mt-3 overflow-hidden">{children}</Panel>
    </section>
  );
}

function Kpi({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number | null;
}) {
  return (
    <Panel className="p-4 sm:p-5">
      {/* Підпис зверху, число під ним: у вузькій колонці «71 300 ₴» і значок
          зміни в один рядок не вміщались, і рядок переносився — плитка росла
          вдвічі. Тепер значок стоїть біля підпису, де місця вистачає. */}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] text-ink-muted sm:text-[14px]">
          {label}
        </p>
        {change !== null && change !== undefined && (
          <span
            className={[
              "tnum shrink-0 rounded-full px-2 py-0.5 text-[12px]",
              change >= 0 ? "bg-sand text-ink" : "bg-blush text-ink",
            ].join(" ")}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="tnum mt-2 text-[22px] leading-none sm:text-[26px]">
        {value}
      </p>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tnum text-[22px] leading-none">{value}</p>
      <p className="mt-1.5 text-[13px] text-ink-muted">{label}</p>
    </div>
  );
}

/**
 * Горизонтальні смуги. Довжина відносна до максимуму в наборі — так видно
 * співвідношення, а не абсолютні числа, які й так підписані.
 */
function BarList({
  items,
  max,
  emptyHint,
}: {
  items: { key: string; label: string; value: number; display: string }[];
  max?: number;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[15px] text-ink-muted">{emptyHint ?? "Порожньо."}</p>;
  }

  const ceiling = max ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const percent = Math.round((item.value / ceiling) * 100);
        // Підпис іде всередину смуги, лише якщо там справді є місце; інакше
        // ставимо його поруч — так суми не обрізаються на коротких днях.
        const inside = percent >= 38;

        return (
          <li key={item.key} className="flex items-center gap-3">
            {/* w-9 вміщає і двоцифрове число, і скорочений місяць («сер»). */}
            <span className="tnum w-9 shrink-0 text-right text-[13px] text-ink-muted">
              {item.label}
            </span>

            <div className="flex h-7 min-w-0 flex-1 items-center gap-2">
              <div className="h-full min-w-0 flex-1 overflow-hidden rounded-lg bg-canvas">
                <div
                  className="flex h-full items-center justify-end rounded-lg bg-ink px-2.5"
                  style={{
                    // Округлюємо: інакше в розмітку йде «10.526315789473684%».
                    // 4% — щоб найменший ненульовий день лишався видимим.
                    width: `${Math.max(percent, item.value > 0 ? 4 : 0)}%`,
                  }}
                >
                  {inside && (
                    <span className="tnum truncate text-[12px] text-white">
                      {item.display}
                    </span>
                  )}
                </div>
              </div>

              {!inside && item.value > 0 && (
                <span className="tnum shrink-0 text-[12px] text-ink-muted">
                  {item.display}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SplitBar({ fresh, returning }: { fresh: number; returning: number }) {
  const total = fresh + returning;
  if (total === 0) return null;
  const freshPct = Math.round((fresh / total) * 100);

  return (
    <>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-canvas">
        <div className="bg-ink" style={{ width: `${freshPct}%` }} />
        <div className="flex-1 bg-sand" />
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">
        {freshPct}% нових · {100 - freshPct}% повторних
      </p>
    </>
  );
}

/**
 * Підпис смуги. У межах тижня/місяця це число місяця; у річному розрізі —
 * скорочена назва місяця.
 */
function dayLabel(date: Date, period: Period): string {
  if (period === "year") return MONTHS_SHORT[date.getMonth()];
  return String(date.getDate());
}

/** Що саме нумерують підписи — щоб «3» не читалось як порядковий номер. */
function periodUnit(period: Period): string {
  return period === "year" ? "місяці" : "числа місяця";
}

/** «візит / візити / візитів» — щоб цифра читалась як речення. */
function visitWord(count: number): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return "візитів";
  const mod10 = count % 10;
  if (mod10 === 1) return "візит";
  if (mod10 >= 2 && mod10 <= 4) return "візити";
  return "візитів";
}

/**
 * Словесний підсумок порівняння з торішнім періодом.
 *
 * `null` означає, що торік виручки не було взагалі — відсоток тут не рахується
 * (ділення на нуль), і чесніше сказати це словами, ніж намалювати «+∞%».
 */
function describeYearChange(percent: number | null): string {
  if (percent === null) {
    return "Торік у цей період виручки не було — порівнювати нема з чим.";
  }
  if (percent === 0) return "Виручка така сама, як торік.";
  return percent > 0
    ? `Виручка більша за торішню на ${percent}%.`
    : `Виручка менша за торішню на ${Math.abs(percent)}%.`;
}

export { PERIOD_NOUN };
