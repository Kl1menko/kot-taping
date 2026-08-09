"use client";

import Link from "next/link";
import type {
  ClientSplit,
  Conversion,
  DayBucket,
  ServiceStat,
  Totals,
  WeekdayLoad,
} from "@/lib/analytics";
import { WORK_END_HOUR, WORK_START_HOUR } from "@/lib/calendar";
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
  totals: Totals;
  changes: {
    appointments: number | null;
    revenue: number | null;
    averageCheck: number | null;
  };
  days: DayBucket[];
  services: ServiceStat[];
  clients: ClientSplit;
  conversion: Conversion;
  load: WeekdayLoad[];
  hours: { hour: number; count: number }[];
  workDays: number;
};

export function AnalyticsScreen({ data }: { data: AnalyticsData }) {
  const empty = data.totals.appointments === 0;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Аналітика</h1>
      </div>

      <nav className="mt-5 flex gap-1 rounded-full bg-surface p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/admin/analytics?period=${p.id}`}
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

      <p className="mt-5 text-[15px] text-ink-muted">{data.title}</p>

      {empty ? (
        <Panel className="mt-4 px-6 py-16 text-center">
          <p className="text-[18px]">Даних за цей період немає</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ink-muted">
            Аналітика рахує лише виконані візити. Позначайте записи як
            «Виконано» в календарі — і цифри з’являться.
          </p>
        </Panel>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  {s.count} {s.count === 1 ? "візит" : s.count < 5 ? "візити" : "візитів"}
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
    <Panel className="p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="tnum text-[28px] leading-none">{value}</span>
        {change !== null && change !== undefined && (
          <span
            className={[
              "tnum rounded-full px-2 py-0.5 text-[13px]",
              change >= 0 ? "bg-sand text-ink" : "bg-blush text-ink",
            ].join(" ")}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-[14px] text-ink-muted">{label}</p>
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

const MONTH_ABBR = [
  "січ", "лют", "бер", "кві", "тра", "чер",
  "лип", "сер", "вер", "жов", "лис", "гру",
];

/**
 * Підпис смуги. У межах тижня/місяця це число місяця; у річному розрізі —
 * скорочена назва місяця.
 */
function dayLabel(date: Date, period: Period): string {
  if (period === "year") return MONTH_ABBR[date.getMonth()];
  return String(date.getDate());
}

/** Що саме нумерують підписи — щоб «3» не читалось як порядковий номер. */
function periodUnit(period: Period): string {
  return period === "year" ? "місяці" : "числа місяця";
}

export { PERIOD_NOUN };
