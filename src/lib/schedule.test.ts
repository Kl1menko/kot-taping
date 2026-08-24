import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countInMonth,
  formatTime,
  hoursLabel,
  initialMonth,
  isBookable,
  isDateAvailable,
  isTimeAvailable,
  isWorkingDay,
  parseTime,
  slotForTime,
  slotsFromHours,
  timesFor,
  toSchedule,
  upcomingDays,
} from "./schedule.ts";

/** 8 серпня 2026, 08:00 — до початку будь-якого робочого дня. */
const MORNING = new Date(2026, 7, 8, 8, 0);

function schedule(...days: [string, string, string][]) {
  return toSchedule(
    days.map(([day, opens, closes]) => ({
      day,
      opensAt: parseTime(opens)!,
      closesAt: parseTime(closes)!,
    })),
  );
}

test("час розбирається й друкується в один бік", () => {
  assert.equal(parseTime("10:30"), 630);
  assert.equal(parseTime("09:00"), 540);
  assert.equal(parseTime("9:00"), 540);
  // Postgres віддає `time` з секундами — вони не мають заважати.
  assert.equal(parseTime("10:00:00"), 600);
  assert.equal(formatTime(630), "10:30");
  assert.equal(formatTime(540), "09:00");
});

test("сміття замість часу не стає нулем", () => {
  // Мовчазний 0 тут означав би «опівночі» — робочий день з 00:00.
  assert.equal(parseTime(""), null);
  assert.equal(parseTime("обід"), null);
  assert.equal(parseTime("25:00"), null);
  assert.equal(parseTime("10:99"), null);
});

test("день поза графіком неробочий", () => {
  const s = schedule(["2026-08-10", "10:00", "18:00"]);

  assert.equal(isWorkingDay(s, "2026-08-10"), true);
  assert.equal(isWorkingDay(s, "2026-08-11"), false);
  assert.equal(isWorkingDay(toSchedule([]), "2026-08-10"), false);
});

test("перевернуті межі до графіка не потрапляють", () => {
  // У базі це боронить констрейнт, але сюди дані йдуть і з форми.
  const s = toSchedule([{ day: "2026-08-10", opensAt: 1080, closesAt: 600 }]);
  assert.equal(isWorkingDay(s, "2026-08-10"), false);
});

test("сітка часу йде з кроком 30 хв і не включає час закриття", () => {
  // Сеанс, що починається о закритті, — це не робочий час.
  const s = schedule(["2026-08-10", "10:00", "12:00"]);
  assert.deepEqual(
    timesFor(s, "2026-08-10", MORNING).map(formatTime),
    ["10:00", "10:30", "11:00", "11:30"],
  );
});

test("сьогодні години, що минули, вже не пропонуються", () => {
  const s = schedule(["2026-08-08", "09:00", "13:00"]);
  const atNoon = new Date(2026, 7, 8, 12, 10);

  assert.deepEqual(timesFor(s, "2026-08-08", atNoon).map(formatTime), ["12:30"]);
  // На завтрашній день поточна година не впливає.
  const tomorrow = schedule(["2026-08-09", "09:00", "10:30"]);
  assert.deepEqual(
    timesFor(tomorrow, "2026-08-09", atNoon).map(formatTime),
    ["09:00", "09:30", "10:00"],
  );
});

test("день, у якому години вже минули, недоступний", () => {
  // Інакше форма пропонувала б дату, на яку не лишилось жодного часу.
  const s = schedule(["2026-08-08", "09:00", "12:00"]);
  const evening = new Date(2026, 7, 8, 19, 0);

  assert.equal(isDateAvailable(s, "2026-08-08", evening), false);
  assert.equal(isDateAvailable(s, "2026-08-08", MORNING), true);
});

test("перевірка часу збігається з тим, що показує форма", () => {
  // Розійдись вони — Server Action відкидав би час, який сам показав.
  const s = schedule(["2026-08-10", "10:00", "12:00"]);

  assert.equal(isTimeAvailable(s, "2026-08-10", 600, MORNING), true);
  // Не по сітці.
  assert.equal(isTimeAvailable(s, "2026-08-10", 615, MORNING), false);
  // Рівно час закриття.
  assert.equal(isTimeAvailable(s, "2026-08-10", 720, MORNING), false);
  // Закритий день.
  assert.equal(isTimeAvailable(s, "2026-08-11", 600, MORNING), false);
});

test("проміжки рахуються з годин, а не зберігаються окремо", () => {
  // Саме тому вони не можуть розійтися з розкладом.
  assert.deepEqual(slotsFromHours({ opensAt: 600, closesAt: 1080 }), [
    "morning",
    "day",
    "evening",
  ]);
  // 10:00–12:00 — лише ранок.
  assert.deepEqual(slotsFromHours({ opensAt: 600, closesAt: 720 }), ["morning"]);
  // 17:00–19:00 — лише вечір.
  assert.deepEqual(slotsFromHours({ opensAt: 1020, closesAt: 1140 }), ["evening"]);
  // 11:00–13:00 зачіпає обидва.
  assert.deepEqual(slotsFromHours({ opensAt: 660, closesAt: 780 }), [
    "morning",
    "day",
  ]);
});

test("час лягає у свій проміжок", () => {
  assert.equal(slotForTime(parseTime("10:00")!), "morning");
  assert.equal(slotForTime(parseTime("12:00")!), "day");
  assert.equal(slotForTime(parseTime("15:30")!), "day");
  assert.equal(slotForTime(parseTime("16:00")!), "evening");
  // Поза межами анкети — проміжку немає, і це не помилка.
  assert.equal(slotForTime(parseTime("21:00")!), null);
});

test("сьогодні ще можна записатись, вчора вже ні", () => {
  assert.equal(isBookable("2026-08-08", MORNING), true);
  assert.equal(isBookable("2026-08-09", MORNING), true);
  assert.equal(isBookable("2026-08-07", MORNING), false);
});

test("найближчі дні — хронологічно й без минулого", () => {
  const s = schedule(
    ["2026-08-20", "10:00", "18:00"],
    ["2026-08-01", "10:00", "18:00"],
    ["2026-08-10", "10:00", "18:00"],
  );

  assert.deepEqual(upcomingDays(s, MORNING), ["2026-08-10", "2026-08-20"]);
  assert.deepEqual(upcomingDays(s, MORNING, 1), ["2026-08-10"]);
});

test("форма відкривається на місяці, де дні справді є", () => {
  const s = schedule(["2026-10-05", "10:00", "18:00"]);
  assert.equal(initialMonth(s, MORNING).getTime(), new Date(2026, 9, 1).getTime());

  assert.equal(
    initialMonth(toSchedule([]), MORNING).getTime(),
    new Date(2026, 7, 1).getTime(),
  );
});

test("у місяці рахуються лише його власні дні", () => {
  // Сітка 6×7 захоплює сусідні місяці — вони не мають потрапляти в підпис.
  const s = schedule(
    ["2026-07-31", "10:00", "18:00"],
    ["2026-08-01", "10:00", "18:00"],
    ["2026-08-31", "10:00", "18:00"],
    ["2026-09-01", "10:00", "18:00"],
  );

  assert.equal(countInMonth(s, new Date(2026, 7, 1)), 2);
});

test("підпис годин читається як діапазон", () => {
  assert.equal(hoursLabel({ opensAt: 600, closesAt: 1080 }), "10:00–18:00");
});
