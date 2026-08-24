import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countInMonth,
  initialMonth,
  isBookable,
  isDateAvailable,
  isSlotOpen,
  isWorkingDay,
  normalizeSlots,
  slotsFor,
  toSchedule,
  upcomingDays,
} from "./schedule.ts";

const AUGUST_8 = new Date(2026, 7, 8);

function schedule(...days: [string, string[]][]) {
  return toSchedule(
    days.map(([day, slots]) => ({ day, slots: normalizeSlots(slots) })),
  );
}

test("день поза графіком неробочий", () => {
  // Графік — білий список: «нічого не налаштовано» = «нічого не відкрито».
  const s = schedule(["2026-08-10", ["morning"]]);

  assert.equal(isWorkingDay(s, "2026-08-10"), true);
  assert.equal(isWorkingDay(s, "2026-08-11"), false);
  assert.equal(isWorkingDay(toSchedule([]), "2026-08-10"), false);
});

test("порожній список проміжків не робить день робочим", () => {
  const s = schedule(["2026-08-10", []]);
  assert.equal(isWorkingDay(s, "2026-08-10"), false);
});

test("невідомі проміжки й дублікати відсіюються, порядок доби зберігається", () => {
  assert.deepEqual(normalizeSlots(["evening", "morning"]), ["morning", "evening"]);
  assert.deepEqual(normalizeSlots(["morning", "morning"]), ["morning"]);
  assert.deepEqual(normalizeSlots(["night", "обід"]), []);
});

test("відкритий лише той проміжок, який задала майстриня", () => {
  const s = schedule(["2026-08-10", ["morning", "evening"]]);

  assert.equal(isSlotOpen(s, "2026-08-10", "morning"), true);
  assert.equal(isSlotOpen(s, "2026-08-10", "day"), false);
  assert.equal(isSlotOpen(s, "2026-08-11", "morning"), false);
  assert.deepEqual(slotsFor(s, "2026-08-10"), ["morning", "evening"]);
  assert.deepEqual(slotsFor(s, "2026-08-11"), []);
});

test("сьогодні ще можна записатись, вчора вже ні", () => {
  // Заявка — намір, а не бронювання: зранку на сьогоднішній вечір це нормально.
  assert.equal(isBookable("2026-08-08", AUGUST_8), true);
  assert.equal(isBookable("2026-08-09", AUGUST_8), true);
  assert.equal(isBookable("2026-08-07", AUGUST_8), false);
});

test("перевірка дати збігається з тим, що показує форма", () => {
  // Розійдись ці дві умови — Server Action відкидав би день, який сам показав.
  const s = schedule(["2026-08-07", ["day"]], ["2026-08-10", ["day"]]);

  assert.equal(isDateAvailable(s, "2026-08-10", AUGUST_8), true);
  // Відкритий, але в минулому.
  assert.equal(isDateAvailable(s, "2026-08-07", AUGUST_8), false);
  // У майбутньому, але закритий.
  assert.equal(isDateAvailable(s, "2026-08-11", AUGUST_8), false);
});

test("найближчі дні — хронологічно й без минулого", () => {
  const s = schedule(
    ["2026-08-20", ["day"]],
    ["2026-08-01", ["day"]],
    ["2026-08-10", ["day"]],
  );

  assert.deepEqual(upcomingDays(s, AUGUST_8), ["2026-08-10", "2026-08-20"]);
  assert.deepEqual(upcomingDays(s, AUGUST_8, 1), ["2026-08-10"]);
});

test("форма відкривається на місяці, де дні справді є", () => {
  // Кінець місяця без відкритих днів: почни календар із поточного — клієнтка
  // побачила б порожню сітку, не здогадавшись гортати далі.
  const s = schedule(["2026-10-05", ["day"]]);
  assert.equal(initialMonth(s, AUGUST_8).getTime(), new Date(2026, 9, 1).getTime());

  // Графіку немає — лишаємось у поточному місяці.
  assert.equal(
    initialMonth(toSchedule([]), AUGUST_8).getTime(),
    new Date(2026, 7, 1).getTime(),
  );
});

test("у місяці рахуються лише його власні дні", () => {
  // Сітка 6×7 захоплює сусідні місяці — вони не мають потрапляти в підпис.
  const s = schedule(
    ["2026-07-31", ["day"]],
    ["2026-08-01", ["day"]],
    ["2026-08-31", ["day"]],
    ["2026-09-01", ["day"]],
  );

  assert.equal(countInMonth(s, new Date(2026, 7, 1)), 2);
});
