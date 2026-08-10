/**
 * Обчислення аналітики — чисті функції над списком записів.
 *
 * Без React і без БД: усе рахується з того, що вже прочитала сторінка, тож
 * логіку можна перевірити тестами, не піднімаючи базу.
 */

// Розширення `.ts` обов'язкове: цей модуль виконується і в Next, і напряму в
// Node під час тестів, а голий Node не добудовує розширення сам.
import {
  WORK_END_HOUR,
  WORK_START_HOUR,
  dateKey,
  minutesOfDay,
} from "./calendar.ts";

export type Countable = {
  starts_at: string;
  duration_min: number;
  price: number;
  status: string;
  client_id: string;
  service_id: string;
  source: string;
  /**
   * Кабінет. Не обов'язкове поле в типі, бо частина запитів (наприклад, карта
   * перших візитів) його не читає — але для розбивки по містах воно потрібне.
   */
  location_id?: string;
};

/**
 * Дохід рахуємо лише за виконаними візитами.
 *
 * Заплановані — ще не гроші, скасовані й неявки — не гроші взагалі. Інакше
 * виручка показувала б бажане замість дійсного.
 */
export function isEarned(item: { status: string }): boolean {
  return item.status === "done";
}

export type Totals = {
  appointments: number;
  revenue: number;
  averageCheck: number;
  /** Година з найбільшою кількістю записів, або null на порожньому періоді. */
  peakHour: number | null;
};

export function totals(items: Countable[]): Totals {
  const earned = items.filter(isEarned);
  const revenue = earned.reduce((sum, a) => sum + a.price, 0);

  const byHour = new Map<number, number>();
  for (const a of items) {
    if (a.status === "cancelled") continue;
    const hour = new Date(a.starts_at).getHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }

  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [hour, count] of byHour) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  }

  return {
    appointments: earned.length,
    revenue,
    // Середній чек — по виконаних: ділити виручку на скасовані безглуздо.
    averageCheck: earned.length ? Math.round(revenue / earned.length) : 0,
    peakHour,
  };
}

/** Зміна у відсотках проти попереднього періоду; null — коли ділити нема на що. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type DayBucket = { key: string; date: Date; revenue: number; count: number };

/** Виручка по днях періоду — включно з порожніми днями, щоб тренд не брехав. */
export function revenueByDay(
  items: Countable[],
  start: Date,
  end: Date,
): DayBucket[] {
  const buckets = new Map<string, DayBucket>();

  for (
    let d = new Date(start);
    d < end;
    d = new Date(d.getTime() + 24 * 60 * 60_000)
  ) {
    const key = dateKey(d);
    buckets.set(key, { key, date: new Date(d), revenue: 0, count: 0 });
  }

  for (const a of items) {
    const key = dateKey(new Date(a.starts_at));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    if (isEarned(a)) bucket.revenue += a.price;
  }

  return [...buckets.values()];
}

export type ServiceStat = {
  id: string;
  title: string;
  count: number;
  revenue: number;
  averageCheck: number;
  /** Частка у виручці, 0–100. */
  share: number;
};

export function byService(
  items: Countable[],
  titles: Map<string, string>,
): ServiceStat[] {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const a of items) {
    if (!isEarned(a)) continue;
    const entry = map.get(a.service_id) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += a.price;
    map.set(a.service_id, entry);
  }

  const total = [...map.values()].reduce((sum, e) => sum + e.revenue, 0);

  return [...map]
    .map(([id, e]) => ({
      id,
      title: titles.get(id) ?? "—",
      count: e.count,
      revenue: e.revenue,
      averageCheck: Math.round(e.revenue / e.count),
      share: total ? Math.round((e.revenue / total) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type ClientSplit = {
  /** Клієнти, чий перший візит стався всередині періоду. */
  fresh: number;
  returning: number;
  total: number;
};

/**
 * Нові проти повторних.
 *
 * «Новий» визначається за всією історією, а не за періодом: клієнтка, яка
 * ходить рік, не стає новою від того, що ми дивимось на серпень. Тому
 * потрібен `firstVisitByClient` — карта перших візитів за весь час.
 */
export function clientSplit(
  items: Countable[],
  firstVisitByClient: Map<string, string>,
  start: Date,
  end: Date,
): ClientSplit {
  const seen = new Set<string>();
  let fresh = 0;

  for (const a of items) {
    if (!isEarned(a)) continue;
    if (seen.has(a.client_id)) continue;
    seen.add(a.client_id);

    const first = firstVisitByClient.get(a.client_id);
    if (!first) continue;

    const firstAt = new Date(first);
    if (firstAt >= start && firstAt < end) fresh += 1;
  }

  return { fresh, returning: seen.size - fresh, total: seen.size };
}

export type Conversion = {
  requests: number;
  converted: number;
  declined: number;
  pending: number;
  /** Відсоток заявок, що стали записами. */
  rate: number;
};

export function conversion(
  requests: { status: string }[],
): Conversion {
  const converted = requests.filter((r) => r.status === "converted").length;
  const declined = requests.filter((r) => r.status === "declined").length;
  const pending = requests.filter((r) => r.status === "new").length;

  return {
    requests: requests.length,
    converted,
    declined,
    pending,
    rate: requests.length
      ? Math.round((converted / requests.length) * 100)
      : 0,
  };
}

export type WeekdayLoad = { weekday: number; label: string; percent: number };

const WEEKDAY_LABEL = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/**
 * Завантаженість по днях тижня — частка зайнятих хвилин від робочого вікна.
 *
 * Рахуємо лише дні, що справді були в періоді: інакше місяць із п'ятьма
 * понеділками й чотирма вівторками давав би перекос не через роботу, а через
 * календар.
 */
export function loadByWeekday(
  items: Countable[],
  start: Date,
  end: Date,
): WeekdayLoad[] {
  const windowMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60;

  const daysPerWeekday = new Array(7).fill(0);
  for (
    let d = new Date(start);
    d < end;
    d = new Date(d.getTime() + 24 * 60 * 60_000)
  ) {
    daysPerWeekday[d.getDay()] += 1;
  }

  const busyPerWeekday = new Array(7).fill(0);
  for (const a of items) {
    if (a.status === "cancelled") continue;
    const at = new Date(a.starts_at);
    // Записи поза робочим вікном не роздувають знаменник — обрізаємо внесок.
    const from = Math.max(minutesOfDay(at), WORK_START_HOUR * 60);
    const to = Math.min(
      minutesOfDay(at) + a.duration_min,
      WORK_END_HOUR * 60,
    );
    if (to > from) busyPerWeekday[at.getDay()] += to - from;
  }

  return WEEKDAY_LABEL.map((label, weekday) => ({
    weekday,
    label,
    percent: daysPerWeekday[weekday]
      ? Math.min(
          Math.round(
            (busyPerWeekday[weekday] /
              (daysPerWeekday[weekday] * windowMinutes)) *
              100,
          ),
          100,
        )
      : 0,
  }));
}

/** Розподіл записів по годинах робочого вікна. */
export function byHour(items: Countable[]): { hour: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const a of items) {
    if (a.status === "cancelled") continue;
    const hour = new Date(a.starts_at).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return Array.from(
    { length: WORK_END_HOUR - WORK_START_HOUR },
    (_, i) => WORK_START_HOUR + i,
  ).map((hour) => ({ hour, count: counts.get(hour) ?? 0 }));
}

export type LocationStat = {
  id: string;
  city: string;
  count: number;
  revenue: number;
  averageCheck: number;
  /** Частка у виручці періоду, 0–100. */
  share: number;
};

/**
 * Розбивка по кабінетах.
 *
 * Кабінети показуємо всі, навіть із нулем: порожній Київ — це теж факт, і він
 * має бути видимим, а не зникати зі звіту разом із питанням «чому там нуль».
 */
export function byLocation(
  items: Countable[],
  cities: Map<string, string>,
): LocationStat[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const id of cities.keys()) map.set(id, { count: 0, revenue: 0 });

  for (const a of items) {
    if (!isEarned(a)) continue;
    if (!a.location_id) continue;
    const entry = map.get(a.location_id) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += a.price;
    map.set(a.location_id, entry);
  }

  const total = [...map.values()].reduce((sum, e) => sum + e.revenue, 0);

  return [...map]
    .map(([id, e]) => ({
      id,
      city: cities.get(id) ?? "—",
      count: e.count,
      revenue: e.revenue,
      averageCheck: e.count ? Math.round(e.revenue / e.count) : 0,
      share: total ? Math.round((e.revenue / total) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type MonthBucket = {
  /** 0–11 — індекс місяця в році. */
  month: number;
  year: number;
  revenue: number;
  count: number;
};

/**
 * Виручка по місяцях року — стовпчики для режиму «Рік».
 *
 * Порожні місяці лишаємо: без них графік сезонності показував би суцільний
 * ряд, і провал у лютому виглядав би так само, як робочий лютий.
 */
export function revenueByMonth(items: Countable[], year: number): MonthBucket[] {
  const buckets: MonthBucket[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    year,
    revenue: 0,
    count: 0,
  }));

  for (const a of items) {
    const at = new Date(a.starts_at);
    if (at.getFullYear() !== year) continue;
    const bucket = buckets[at.getMonth()];
    bucket.count += 1;
    if (isEarned(a)) bucket.revenue += a.price;
  }

  return buckets;
}
