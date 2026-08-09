import { test } from "node:test";
import assert from "node:assert/strict";
import {
  byService,
  change,
  clientSplit,
  conversion,
  loadByWeekday,
  revenueByDay,
  totals,
  type Countable,
} from "./analytics.ts";

function appt(over: Partial<Countable> = {}): Countable {
  return {
    starts_at: new Date(2026, 7, 8, 10, 0).toISOString(),
    duration_min: 60,
    price: 1000,
    status: "done",
    client_id: "c1",
    service_id: "s1",
    source: "manual",
    ...over,
  };
}

test("виручка рахує лише виконані візити", () => {
  const t = totals([
    appt({ price: 1000, status: "done" }),
    appt({ price: 5000, status: "planned" }),
    appt({ price: 3000, status: "cancelled" }),
    appt({ price: 2000, status: "no_show" }),
  ]);
  assert.equal(t.revenue, 1000, "заплановані й скасовані — не гроші");
  assert.equal(t.appointments, 1);
});

test("середній чек ділиться на виконані, а не на всі", () => {
  const t = totals([
    appt({ price: 1000 }),
    appt({ price: 2000 }),
    appt({ price: 9000, status: "cancelled" }),
  ]);
  assert.equal(t.averageCheck, 1500);
});

test("порожній період не ділить на нуль", () => {
  const t = totals([]);
  assert.equal(t.revenue, 0);
  assert.equal(t.averageCheck, 0);
  assert.equal(t.peakHour, null);
});

test("пікова година — найзавантаженіша", () => {
  const t = totals([
    appt({ starts_at: new Date(2026, 7, 8, 12, 0).toISOString() }),
    appt({ starts_at: new Date(2026, 7, 8, 12, 30).toISOString() }),
    appt({ starts_at: new Date(2026, 7, 8, 15, 0).toISOString() }),
  ]);
  assert.equal(t.peakHour, 12);
});

test("зміна проти нуля не вигадує відсотків", () => {
  assert.equal(change(100, 0), null, "зростання з нуля не є відсотковим");
  assert.equal(change(150, 100), 50);
  assert.equal(change(50, 100), -50);
});

test("тренд включає порожні дні", () => {
  const start = new Date(2026, 7, 1);
  const end = new Date(2026, 7, 4);
  const days = revenueByDay(
    [appt({ starts_at: new Date(2026, 7, 2, 10, 0).toISOString(), price: 800 })],
    start,
    end,
  );
  assert.equal(days.length, 3, "три доби в періоді");
  assert.deepEqual(
    days.map((d) => d.revenue),
    [0, 800, 0],
  );
});

test("частки послуг рахуються від виручки", () => {
  const stats = byService(
    [
      appt({ service_id: "a", price: 750 }),
      appt({ service_id: "b", price: 250 }),
    ],
    new Map([
      ["a", "Обличчя"],
      ["b", "Холка"],
    ]),
  );
  assert.equal(stats[0].title, "Обличчя", "сортування за виручкою");
  assert.equal(stats[0].share, 75);
  assert.equal(stats[1].share, 25);
});

test("новим вважається клієнт за всією історією, а не за періодом", () => {
  const start = new Date(2026, 7, 1);
  const end = new Date(2026, 8, 1);

  const split = clientSplit(
    [appt({ client_id: "old" }), appt({ client_id: "new" })],
    new Map([
      // Ходить із травня — у серпні вона не «нова».
      ["old", new Date(2026, 4, 3).toISOString()],
      ["new", new Date(2026, 7, 8).toISOString()],
    ]),
    start,
    end,
  );

  assert.equal(split.fresh, 1);
  assert.equal(split.returning, 1);
  assert.equal(split.total, 2);
});

test("клієнт із двома візитами рахується один раз", () => {
  const split = clientSplit(
    [appt({ client_id: "c1" }), appt({ client_id: "c1" })],
    new Map([["c1", new Date(2026, 7, 8).toISOString()]]),
    new Date(2026, 7, 1),
    new Date(2026, 8, 1),
  );
  assert.equal(split.total, 1);
});

test("конверсія заявок", () => {
  const c = conversion([
    { status: "converted" },
    { status: "converted" },
    { status: "declined" },
    { status: "new" },
  ]);
  assert.equal(c.rate, 50);
  assert.equal(c.pending, 1);
});

test("конверсія без заявок не ділить на нуль", () => {
  assert.equal(conversion([]).rate, 0);
});

test("завантаженість нормалізується на кількість таких днів тижня", () => {
  // Два понеділки в періоді, зайнято по 11 годин у кожен — 100%.
  const start = new Date(2026, 7, 3); // понеділок
  const end = new Date(2026, 7, 17);

  const load = loadByWeekday(
    [
      appt({
        starts_at: new Date(2026, 7, 3, 9, 0).toISOString(),
        duration_min: 660,
      }),
      appt({
        starts_at: new Date(2026, 7, 10, 9, 0).toISOString(),
        duration_min: 660,
      }),
    ],
    start,
    end,
  );

  const monday = load.find((l) => l.weekday === 1)!;
  assert.equal(monday.percent, 100);
});

test("завантаженість не перевищує 100% при накладках", () => {
  const start = new Date(2026, 7, 3);
  const end = new Date(2026, 7, 4);

  const load = loadByWeekday(
    [
      appt({ starts_at: new Date(2026, 7, 3, 9, 0).toISOString(), duration_min: 660 }),
      appt({ starts_at: new Date(2026, 7, 3, 9, 0).toISOString(), duration_min: 660 }),
    ],
    start,
    end,
  );

  assert.equal(load.find((l) => l.weekday === 1)!.percent, 100);
});

test("запис поза робочим вікном не роздуває завантаженість", () => {
  const start = new Date(2026, 7, 3);
  const end = new Date(2026, 7, 4);

  // 06:00–08:00 — повністю до відкриття, внесок нульовий.
  const load = loadByWeekday(
    [appt({ starts_at: new Date(2026, 7, 3, 6, 0).toISOString(), duration_min: 120 })],
    start,
    end,
  );

  assert.equal(load.find((l) => l.weekday === 1)!.percent, 0);
});
