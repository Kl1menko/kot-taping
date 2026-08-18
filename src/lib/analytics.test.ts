import { test } from "node:test";
import assert from "node:assert/strict";
import {
  byLocation,
  byService,
  change,
  clientSplit,
  conversion,
  loadByWeekday,
  onlinePayments,
  revenueByDay,
  revenueByMonth,
  totals,
  type Countable,
  type CountablePayment,
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

// — Розбивка по кабінетах —

const CITIES = new Map([
  ["lviv-id", "Львів"],
  ["kyiv-id", "Київ"],
]);

test("виручка ділиться між кабінетами", () => {
  const stats = byLocation(
    [
      appt({ location_id: "lviv-id", price: 2000 }),
      appt({ location_id: "lviv-id", price: 1000 }),
      appt({ location_id: "kyiv-id", price: 1000 }),
    ],
    CITIES,
  );

  const lviv = stats.find((s) => s.id === "lviv-id")!;
  const kyiv = stats.find((s) => s.id === "kyiv-id")!;

  assert.equal(lviv.revenue, 3000);
  assert.equal(lviv.count, 2);
  assert.equal(lviv.averageCheck, 1500);
  assert.equal(lviv.share, 75);
  assert.equal(kyiv.share, 25);
});

test("кабінет без візитів лишається у списку з нулем", () => {
  const stats = byLocation([appt({ location_id: "lviv-id" })], CITIES);

  const kyiv = stats.find((s) => s.id === "kyiv-id");
  assert.ok(kyiv, "порожній кабінет не має зникати зі звіту");
  assert.equal(kyiv.revenue, 0);
  assert.equal(kyiv.count, 0);
  // Ділення на нуль у середньому чеку не має давати NaN.
  assert.equal(kyiv.averageCheck, 0);
});

test("до кабінетів потрапляють лише виконані візити", () => {
  const stats = byLocation(
    [
      appt({ location_id: "lviv-id", price: 1000, status: "done" }),
      appt({ location_id: "lviv-id", price: 9000, status: "planned" }),
      appt({ location_id: "lviv-id", price: 5000, status: "cancelled" }),
    ],
    CITIES,
  );

  assert.equal(stats.find((s) => s.id === "lviv-id")!.revenue, 1000);
});

test("кабінети відсортовані за виручкою", () => {
  const stats = byLocation(
    [
      appt({ location_id: "lviv-id", price: 500 }),
      appt({ location_id: "kyiv-id", price: 4000 }),
    ],
    CITIES,
  );

  assert.equal(stats[0].city, "Київ", "попереду має бути більша виручка");
});

// — Виручка по місяцях —

test("виручка розкладається по місяцях року", () => {
  const months = revenueByMonth(
    [
      appt({ starts_at: new Date(2026, 0, 15, 10, 0).toISOString(), price: 1000 }),
      appt({ starts_at: new Date(2026, 7, 3, 10, 0).toISOString(), price: 2000 }),
      appt({ starts_at: new Date(2026, 7, 20, 10, 0).toISOString(), price: 500 }),
    ],
    2026,
  );

  assert.equal(months.length, 12, "порожні місяці лишаються в ряду");
  assert.equal(months[0].revenue, 1000);
  assert.equal(months[7].revenue, 2500);
  assert.equal(months[7].count, 2);
  assert.equal(months[5].revenue, 0);
});

test("записи іншого року не потрапляють у місяці", () => {
  const months = revenueByMonth(
    [
      appt({ starts_at: new Date(2025, 7, 3, 10, 0).toISOString(), price: 9000 }),
      appt({ starts_at: new Date(2026, 7, 3, 10, 0).toISOString(), price: 1000 }),
    ],
    2026,
  );

  assert.equal(months[7].revenue, 1000);
});

test("незароблені візити рахуються в count, але не в revenue", () => {
  const months = revenueByMonth(
    [appt({ starts_at: new Date(2026, 7, 3, 10, 0).toISOString(), price: 3000, status: "planned" })],
    2026,
  );

  assert.equal(months[7].count, 1, "запланований візит — це подія в місяці");
  assert.equal(months[7].revenue, 0, "але ще не гроші");
});

// — Онлайн-оплати —

function pay(over: Partial<CountablePayment> = {}): CountablePayment {
  return {
    status: "success",
    amount: 80000,
    paid_at: new Date(2026, 7, 10, 12, 0).toISOString(),
    appointment_id: "a1",
    kit_order_id: null,
    ...over,
  };
}

const AUG_START = new Date(2026, 7, 1);
const AUG_END = new Date(2026, 8, 1);

test("рахує кількість і суму успішних оплат періоду", () => {
  const stat = onlinePayments(
    [pay(), pay({ amount: 150000 }), pay({ amount: 70000 })],
    AUG_START,
    AUG_END,
  );

  assert.equal(stat.count, 3);
  assert.equal(stat.amount, 300000, "80000 + 150000 + 70000");
  assert.equal(stat.average, 100000);
});

test("середня округлюється до цілої гривні", () => {
  // 80000 + 70000 + 70000 = 220000 / 3 = 73333.33 копійки → 73300 (733 ₴)
  const stat = onlinePayments(
    [pay(), pay({ amount: 70000 }), pay({ amount: 70000 })],
    AUG_START,
    AUG_END,
  );

  assert.equal(stat.average % 100, 0, "копійок у середній не буває");
  assert.equal(stat.average, 73300);
});

test("неоплачені рахунки не рахуються", () => {
  const stat = onlinePayments(
    [
      pay(),
      pay({ status: "created", paid_at: null }),
      pay({ status: "failure", paid_at: null }),
      pay({ status: "expired", paid_at: null }),
      pay({ status: "reversed" }),
    ],
    AUG_START,
    AUG_END,
  );

  assert.equal(stat.count, 1, "лише success");
  assert.equal(stat.amount, 80000);
});

test("hold не є оплатою — гроші лише заблоковані", () => {
  const stat = onlinePayments([pay({ status: "hold" })], AUG_START, AUG_END);

  assert.equal(stat.count, 0);
  assert.equal(stat.amount, 0);
});

test("період рахується за датою оплати, а не виставлення", () => {
  const stat = onlinePayments(
    [
      // Оплачено в липні — це гроші минулого місяця.
      pay({ paid_at: new Date(2026, 6, 31, 23, 0).toISOString() }),
      // Оплачено 1 серпня — уже наш період.
      pay({ paid_at: new Date(2026, 7, 1, 0, 30).toISOString() }),
      // Вересень — за межею.
      pay({ paid_at: new Date(2026, 8, 1, 0, 30).toISOString() }),
    ],
    AUG_START,
    AUG_END,
  );

  assert.equal(stat.count, 1, "лише серпнева оплата");
});

test("оплати за набори рахуються нарівні з візитами", () => {
  const stat = onlinePayments(
    [
      pay({ appointment_id: "a1", kit_order_id: null }),
      pay({ appointment_id: null, kit_order_id: "k1", amount: 50000 }),
    ],
    AUG_START,
    AUG_END,
  );

  assert.equal(stat.count, 2, "еквайринг не розрізняє, за що заплатили");
  assert.equal(stat.amount, 130000);
});

test("success без paid_at не ламає підрахунок", () => {
  const stat = onlinePayments([pay({ paid_at: null })], AUG_START, AUG_END);

  assert.equal(stat.count, 0, "без дати оплати період визначити не можна");
  assert.equal(stat.average, 0);
});

test("порожній період дає нулі, а не ділення на нуль", () => {
  const stat = onlinePayments([], AUG_START, AUG_END);

  assert.equal(stat.count, 0);
  assert.equal(stat.amount, 0);
  assert.equal(stat.average, 0);
});
