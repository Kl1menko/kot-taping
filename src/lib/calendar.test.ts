import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  durationLabel,
  isRangeLoaded,
  layoutDay,
  loadedRange,
  minutesOfDay,
  overlaps,
  weekDays,
} from "./calendar.ts";

/** Хелпер: дата сьогодні о вказаній годині:хвилині. */
function at(hour: number, minute = 0): Date {
  const d = new Date(2026, 7, 8);
  d.setHours(hour, minute, 0, 0);
  return d;
}

type Slot = { start: Date; min: number };
const slot = (h: number, m: number, min: number): Slot => ({
  start: at(h, m),
  min,
});

const lay = (items: Slot[], pxPerMinute = 1) =>
  layoutDay(
    items,
    (s) => s.start,
    (s) => s.min,
    pxPerMinute,
    9,
  );

test("тиждень починається з понеділка", () => {
  // 8 серпня 2026 — субота.
  const days = weekDays(at(12));
  assert.equal(days.length, 7);
  assert.equal(days[0].getDay(), 1, "перший день — понеділок");
  assert.equal(days[6].getDay(), 0, "останній — неділя");
  assert.equal(days[0].getDate(), 3);
});

test("неділя належить попередньому тижню, а не наступному", () => {
  const sunday = new Date(2026, 7, 9);
  const days = weekDays(sunday);
  assert.equal(days[0].getDate(), 3, "тиждень починається 3 серпня");
  assert.equal(days[6].getDate(), 9);
});

test("дотик кінець-у-початок не є накладкою", () => {
  assert.equal(overlaps(at(10, 30), 30, at(11, 0), 60), false);
});

test("реальний перетин ловиться", () => {
  assert.equal(overlaps(at(10, 30), 45, at(11, 0), 30), true);
});

test("позиція і висота пропорційні часу", () => {
  const [a] = lay([slot(10, 40, 30)]);
  // 10:40 — це 100 хвилин від 09:00.
  assert.equal(a.top, 100);
  assert.equal(a.height, 30);
});

test("годинний запис удвічі вищий за півгодинний", () => {
  const [half, full] = lay([slot(9, 0, 30), slot(10, 0, 60)]);
  assert.equal(full.height, half.height * 2);
});

test("записи без перетину лишаються в одній колонці", () => {
  const out = lay([slot(9, 0, 30), slot(10, 0, 30)]);
  assert.deepEqual(
    out.map((o) => o.columns),
    [1, 1],
  );
});

test("накладка ділить ширину на дві колонки", () => {
  const out = lay([slot(10, 0, 60), slot(10, 30, 60)]);
  assert.deepEqual(
    out.map((o) => o.columns),
    [2, 2],
  );
  assert.deepEqual(
    out.map((o) => o.column),
    [0, 1],
  );
});

test("ланцюжок перетинів утворює одну групу однакової ширини", () => {
  // A перетинає B, B перетинає C, але A і C — ні. Усі троє мають ділити
  // ширину порівну, інакше сітка стрибала б посеред групи.
  const out = lay([slot(10, 0, 60), slot(10, 30, 60), slot(11, 15, 30)]);
  assert.deepEqual(
    out.map((o) => o.columns),
    [2, 2, 2],
  );
  assert.equal(out[2].column, 0, "третій сідає у колонку, звільнену першим");
});

test("дотик кінець-у-початок розриває групу", () => {
  // 11:30 починається рівно тоді, коли 10:30+60 закінчується — це не
  // накладка, тож третій запис займає всю ширину.
  const out = lay([slot(10, 0, 60), slot(10, 30, 60), slot(11, 30, 30)]);
  assert.deepEqual(
    out.map((o) => o.columns),
    [2, 2, 1],
  );
});

test("дуже короткий запис лишається клікабельним", () => {
  const [a] = lay([slot(10, 0, 5)]);
  assert.ok(a.height >= 28, `висота ${a.height} мала б бути не менша за 28`);
});

test("minutesOfDay рахує від опівночі", () => {
  assert.equal(minutesOfDay(at(10, 40)), 640);
});

test("тривалість підписується українською", () => {
  assert.equal(durationLabel(30), "30 хв");
  assert.equal(durationLabel(60), "1 година");
  assert.equal(durationLabel(90), "1 година 30 хв");
  assert.equal(durationLabel(120), "2 години");
  assert.equal(durationLabel(300), "5 годин");
});

/* --- Кеш діапазону: коли крок стрілкою може обійтись без запиту --- */

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

test("сусідній тиждень усередині місяця не потребує запиту", () => {
  // 10 і 17 серпня 2026 — обидва в серпні, тиждень навколо не вилазить.
  assert.equal(isRangeLoaded(d(2026, 8, 17), d(2026, 8, 10)), true);
});

test("та сама дата — тим паче не потребує", () => {
  assert.equal(isRangeLoaded(d(2026, 8, 10), d(2026, 8, 10)), true);
});

test("крок у сусідній місяць потребує запиту", () => {
  assert.equal(isRangeLoaded(d(2026, 9, 15), d(2026, 8, 10)), false);
});

test("тиждень на межі місяців потребує запиту", () => {
  // 31 серпня 2026 — понеділок, його тиждень заходить у вересень,
  // а завантажено було навколо 10 серпня (по 6 вересня включно).
  const from = d(2026, 8, 10);
  const to = d(2026, 8, 31);
  const have = loadedRange(from);
  const need = loadedRange(to);
  assert.ok(need.end > have.end, "тиждень 31.08 має вилазити за межу");
  assert.equal(isRangeLoaded(to, from), false);
});

test("завантажений діапазон накриває весь місяць і тиждень навколо", () => {
  const { start, end } = loadedRange(d(2026, 8, 10));
  // Серпень 2026 починається в суботу, тож тиждень 1-го числа тягне липень.
  assert.ok(start <= d(2026, 8, 1), "початок має накривати 1 серпня");
  assert.ok(end >= d(2026, 9, 1), "кінець має накривати весь серпень");
});

test("крок назад через межу місяця потребує запиту", () => {
  assert.equal(isRangeLoaded(addDays(d(2026, 8, 3), -7), d(2026, 8, 10)), false);
});
