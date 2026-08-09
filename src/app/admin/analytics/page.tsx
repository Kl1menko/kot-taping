import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  byHour,
  byService,
  change,
  clientSplit,
  conversion,
  loadByWeekday,
  revenueByDay,
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

/** Межі поточного та попереднього періоду такої ж тривалості. */
function ranges(period: Period, now: Date) {
  if (period === "week") {
    const { start, end } = weekRange(now);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    return { start, end, prevStart, prevEnd: start };
  }

  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return {
      start,
      end,
      prevStart: new Date(now.getFullYear() - 1, 0, 1),
      prevEnd: start,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start,
    end,
    prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    prevEnd: start,
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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireSession();

  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const { start, end, prevStart, prevEnd } = ranges(period, new Date());

  const select = "starts_at, duration_min, price, status, client_id, service_id, source";

  const [current, previous, services, firstVisits, requests] = await Promise.all([
    db().from("appointments").select(select).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    db().from("appointments").select(select).gte("starts_at", prevStart.toISOString()).lt("starts_at", prevEnd.toISOString()),
    db().from("services").select("id, title"),
    // Перші візити за всю історію: без них «новий клієнт» визначався б у межах
    // періоду, і давня клієнтка щомісяця ставала б новою.
    db().from("appointments").select("client_id, starts_at").eq("status", "done").order("starts_at"),
    db().from("requests").select("status, created_at").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
  ]);

  const failure =
    current.error ?? previous.error ?? services.error ?? firstVisits.error ?? requests.error;
  if (failure) {
    throw new Error(`Не вдалося прочитати дані: ${failure.message}`);
  }

  const items = (current.data ?? []) as Countable[];
  const prevItems = (previous.data ?? []) as Countable[];

  const firstVisitByClient = new Map<string, string>();
  for (const row of firstVisits.data ?? []) {
    // Запит відсортований за часом, тож перше входження і є перший візит.
    if (!firstVisitByClient.has(row.client_id)) {
      firstVisitByClient.set(row.client_id, row.starts_at);
    }
  }

  const currentTotals = totals(items);
  const previousTotals = totals(prevItems);

  const workDays = Math.round(
    (end.getTime() - start.getTime()) / (24 * 60 * 60_000),
  );

  const data: AnalyticsData = {
    period,
    title: periodTitle(period, start, end),
    totals: currentTotals,
    changes: {
      appointments: change(currentTotals.appointments, previousTotals.appointments),
      revenue: change(currentTotals.revenue, previousTotals.revenue),
      averageCheck: change(currentTotals.averageCheck, previousTotals.averageCheck),
    },
    days: revenueByDay(items, start, end),
    services: byService(
      items,
      new Map((services.data ?? []).map((s) => [s.id, s.title])),
    ),
    clients: clientSplit(items, firstVisitByClient, start, end),
    conversion: conversion(requests.data ?? []),
    load: loadByWeekday(items, start, end),
    hours: byHour(items),
    workDays,
  };

  return <AnalyticsScreen data={data} />;
}
