import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listLocations } from "@/lib/db/appointments";
import {
  byHour,
  byLocation,
  byService,
  change,
  clientSplit,
  conversion,
  loadByWeekday,
  revenueByDay,
  revenueByMonth,
  totals,
  type Countable,
} from "@/lib/analytics";
import { dayTitle, monthTitle, weekRange } from "@/lib/calendar";
import {
  AnalyticsScreen,
  type AnalyticsData,
  type Period,
} from "@/components/admin/analytics-screen";

export const metadata = { title: "Аналітика" };
export const dynamic = "force-dynamic";

function parsePeriod(raw: string | undefined): Period {
  return raw === "week" || raw === "year" ? raw : "month";
}

/**
 * Якірна дата періоду з URL (`?at=2026-03`).
 *
 * Саме вона дає змогу дивитись не лише на поточний місяць: `?period=month&
 * at=2026-03` відкриє березень. Некоректне значення мовчки ігноруємо й
 * показуємо сьогодення — зіпсоване посилання не має ламати екран.
 */
function parseAnchor(raw: string | undefined, now: Date): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (m >= 1 && m <= 12) return new Date(y, m - 1, 1);
  }
  if (raw && /^\d{4}$/.test(raw)) {
    return new Date(Number(raw), 0, 1);
  }
  return now;
}

/**
 * Межі періоду, попереднього такої ж тривалості й того самого періоду торік.
 *
 * Торішній потрібен окремо від «попереднього»: у сезонному бізнесі падіння
 * серпня проти липня нічого не означає, а серпень проти серпня — означає.
 */
function ranges(period: Period, anchor: Date) {
  if (period === "week") {
    const { start, end } = weekRange(anchor);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);

    const yearStart = new Date(start);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    const yearEnd = new Date(end);
    yearEnd.setFullYear(yearEnd.getFullYear() - 1);

    return { start, end, prevStart, prevEnd: start, yearStart, yearEnd };
  }

  if (period === "year") {
    const year = anchor.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return {
      start,
      end,
      prevStart: new Date(year - 1, 0, 1),
      prevEnd: start,
      // Для року «попередній» і «торік» — це те саме; другий блок не потрібен.
      yearStart: new Date(year - 1, 0, 1),
      yearEnd: start,
    };
  }

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
    prevStart: new Date(year, month - 1, 1),
    prevEnd: new Date(year, month, 1),
    yearStart: new Date(year - 1, month, 1),
    yearEnd: new Date(year - 1, month + 1, 1),
  };
}

function periodTitle(period: Period, start: Date, end: Date): string {
  if (period === "week") {
    const last = new Date(end.getTime() - 1);
    return `${dayTitle(start)} — ${dayTitle(last)}`;
  }
  if (period === "year") return `${start.getFullYear()} рік`;
  return monthTitle(start);
}

/** `2026-03` для місяця й тижня, `2026` для року — формат параметра `at`. */
function anchorKey(period: Period, date: Date): string {
  if (period === "year") return String(date.getFullYear());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const SELECT =
  "starts_at, duration_min, price, status, client_id, service_id, source, location_id";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; at?: string; location?: string }>;
}) {
  await requireSession();

  const { period: rawPeriod, at, location } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const now = new Date();
  const anchor = parseAnchor(at, now);
  const { start, end, prevStart, prevEnd, yearStart, yearEnd } = ranges(
    period,
    anchor,
  );

  const locations = await listLocations();
  // Невідомий slug ігноруємо — показуємо всі кабінети, а не порожній екран.
  const activeLocation = locations.some((l) => l.slug === location)
    ? (location as string)
    : "";
  const activeLocationId =
    locations.find((l) => l.slug === activeLocation)?.id ?? null;

  /** Записи в межах періоду; фільтр кабінету застосовується там, де доречно. */
  const appointmentsIn = (from: Date, to: Date, filtered = true) => {
    let q = db()
      .from("appointments")
      .select(SELECT)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString());
    if (filtered && activeLocationId) q = q.eq("location_id", activeLocationId);
    return q;
  };

  const [
    current,
    allCabinets,
    previous,
    lastYear,
    yearWide,
    services,
    firstVisits,
    requests,
  ] = await Promise.all([
    appointmentsIn(start, end),
    // Той самий період, але без фільтра міста: секція «Кабінети» порівнює їх
    // між собою, тож із фільтром вона показувала б нулі в усіх інших містах.
    appointmentsIn(start, end, false),
    appointmentsIn(prevStart, prevEnd),
    appointmentsIn(yearStart, yearEnd),
    // Весь рік якірної дати — для стовпчиків сезонності. У режимі «Рік» це той
    // самий діапазон, що й current, але окремий запит простіший за галуження.
    appointmentsIn(
      new Date(anchor.getFullYear(), 0, 1),
      new Date(anchor.getFullYear() + 1, 0, 1),
    ),
    db().from("services").select("id, title"),
    // Перші візити за всю історію: без них «новий клієнт» визначався б у межах
    // періоду, і давня клієнтка щомісяця ставала б новою.
    //
    // Фільтр кабінету тут навмисно не застосовуємо: перший візит у Львові
    // робить клієнтку не новою і в Києві — вона вже клієнтка студії.
    db()
      .from("appointments")
      .select("client_id, starts_at")
      .eq("status", "done")
      .order("starts_at"),
    db()
      .from("requests")
      .select("status, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString()),
  ]);

  const failure =
    current.error ??
    allCabinets.error ??
    previous.error ??
    lastYear.error ??
    yearWide.error ??
    services.error ??
    firstVisits.error ??
    requests.error;
  if (failure) {
    throw new Error(`Не вдалося прочитати дані: ${failure.message}`);
  }

  const items = (current.data ?? []) as Countable[];
  const prevItems = (previous.data ?? []) as Countable[];
  const lastYearItems = (lastYear.data ?? []) as Countable[];

  const firstVisitByClient = new Map<string, string>();
  for (const row of firstVisits.data ?? []) {
    // Запит відсортований за часом, тож перше входження і є перший візит.
    if (!firstVisitByClient.has(row.client_id)) {
      firstVisitByClient.set(row.client_id, row.starts_at);
    }
  }

  const currentTotals = totals(items);
  const previousTotals = totals(prevItems);
  const lastYearTotals = totals(lastYearItems);

  const workDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60_000),
  );

  const data: AnalyticsData = {
    period,
    title: periodTitle(period, start, end),
    anchor: anchorKey(period, start),
    locations: locations.map((l) => ({ slug: l.slug, city: l.city })),
    activeLocation,
    totals: currentTotals,
    changes: {
      appointments: change(currentTotals.appointments, previousTotals.appointments),
      revenue: change(currentTotals.revenue, previousTotals.revenue),
      averageCheck: change(currentTotals.averageCheck, previousTotals.averageCheck),
    },
    lastYear: {
      totals: lastYearTotals,
      revenue: change(currentTotals.revenue, lastYearTotals.revenue),
      appointments: change(
        currentTotals.appointments,
        lastYearTotals.appointments,
      ),
    },
    days: revenueByDay(items, start, end),
    months: revenueByMonth(
      (yearWide.data ?? []) as Countable[],
      anchor.getFullYear(),
    ),
    services: byService(
      items,
      new Map((services.data ?? []).map((s) => [s.id, s.title])),
    ),
    byLocation: byLocation(
      (allCabinets.data ?? []) as Countable[],
      new Map(locations.map((l) => [l.id, l.city])),
    ),
    clients: clientSplit(items, firstVisitByClient, start, end),
    conversion: conversion(requests.data ?? []),
    load: loadByWeekday(items, start, end),
    hours: byHour(items),
    workDays,
  };

  return <AnalyticsScreen data={data} />;
}
