import assert from "node:assert/strict";
import { test } from "node:test";

import {
  countInMonth,
  dayBounds,
  hoursFor,
  intervalsFor,
  normalizeIntervals,
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
  timeOptions,
  toBusy,
  toSchedule,
  hasFreeTime,
  isTimeTaken,
  upcomingDays,
} from "./schedule.ts";

/** 8 серпня 2026, 08:00 — до початку будь-якого робочого дня. */
const MORNING = new Date(2026, 7, 8, 8, 0);

/** День одним відрізком — найчастіший випадок у цих тестах. */
function schedule(...days: [string, string, string][]) {
  return toSchedule(
    days.map(([day, opens, closes]) => ({
      day,
      intervals: [{ opensAt: parseTime(opens)!, closesAt: parseTime(closes)! }],
    })),
  );
}

/** День із кількох відрізків: `withBreak("2026-08-10", ["10:00","14:00"], …)`. */
function withBreak(day: string, ...parts: [string, string][]) {
  return toSchedule([
    {
      day,
      intervals: parts.map(([opens, closes]) => ({
        opensAt: parseTime(opens)!,
        closesAt: parseTime(closes)!,
      })),
    },
  ]);
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
  const s = toSchedule([
    { day: "2026-08-10", intervals: [{ opensAt: 1080, closesAt: 600 }] },
  ]);
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

test("час у перерві на запис не пропонується", () => {
  // Головне, заради чого відрізки й заводились: день 10:00–19:00 з обідом
  // 14:00–15:00 не має пропонувати 14:00, коли кабінету немає.
  const s = withBreak("2026-08-10", ["10:00", "14:00"], ["15:00", "19:00"]);
  const times = timesFor(s, "2026-08-10", MORNING).map(formatTime);

  assert.ok(times.includes("13:30"));
  assert.ok(!times.includes("14:00"));
  assert.ok(!times.includes("14:30"));
  assert.ok(times.includes("15:00"));

  // І перевірка збігається з показаним — інакше форма приймала б час,
  // якого не малювала.
  assert.equal(isTimeAvailable(s, "2026-08-10", parseTime("14:00")!, MORNING), false);
  assert.equal(isTimeAvailable(s, "2026-08-10", parseTime("15:00")!, MORNING), true);
});

test("відрізки впорядковуються, а суміжні зливаються", () => {
  // 10:00–14:00 і 14:00–18:00 — це суцільний день, а не перерва нульової
  // довжини: показати його розривом означало б збрехати про обід.
  assert.deepEqual(
    normalizeIntervals([
      { opensAt: 840, closesAt: 1080 },
      { opensAt: 600, closesAt: 840 },
    ]),
    [{ opensAt: 600, closesAt: 1080 }],
  );

  // Перекриття теж зливаються: два записи одного часу дали б його двічі.
  assert.deepEqual(
    normalizeIntervals([
      { opensAt: 600, closesAt: 900 },
      { opensAt: 780, closesAt: 1080 },
    ]),
    [{ opensAt: 600, closesAt: 1080 }],
  );

  // Перевернутий відрізок відкидається, як і раніше пара меж.
  assert.deepEqual(normalizeIntervals([{ opensAt: 1080, closesAt: 600 }]), []);
});

test("межі дня — від найранішого початку до найпізнішого кінця", () => {
  const s = withBreak("2026-08-10", ["10:00", "14:00"], ["16:00", "19:00"]);

  // Підпис у клітинці показує день цілком…
  assert.equal(hoursLabel(hoursFor(s, "2026-08-10")!), "10:00–19:00");
  // …а розклад лишається з перервою.
  assert.equal(intervalsFor(s, "2026-08-10").length, 2);
  assert.equal(dayBounds([]), null);
});

test("проміжки анкети рахуються з усіх відрізків", () => {
  // 10:00–12:00 і 17:00–19:00 — це «ранок і вечір», але не «день»:
  // між ними кабінет зачинений.
  const s = withBreak("2026-08-10", ["10:00", "12:00"], ["17:00", "19:00"]);
  assert.deepEqual(slotsFromHours(intervalsFor(s, "2026-08-10")), [
    "morning",
    "evening",
  ]);
});

test("день без жодного відрізка до графіка не потрапляє", () => {
  // Інакше він виглядав би відкритим, але записатись у нього не було б як.
  const s = toSchedule([{ day: "2026-08-10", intervals: [] }]);
  assert.equal(isWorkingDay(s, "2026-08-10"), false);
});

/** Зайняте, заданий по-людськи: `busy(["2026-08-10","15:00","16:30"])`. */
function busy(...slots: [string, string, string][]) {
  return toBusy(
    slots.map(([day, from, to]) => ({
      day,
      startsAt: parseTime(from)!,
      endsAt: parseTime(to)!,
    })),
  );
}

test("зайнята година гасне, сусідні лишаються вільними", () => {
  const s = schedule(["2026-08-10", "10:00", "12:00"]);
  const b = busy(["2026-08-10", "10:30", "11:00"]);

  assert.deepEqual(
    timeOptions(s, b, "2026-08-10", MORNING).map((o) => [
      formatTime(o.minutes),
      o.taken,
    ]),
    [
      ["10:00", false],
      ["10:30", true],
      ["11:00", false],
      ["11:30", false],
    ],
  );
});

test("довгий запис гасить усі клітинки, в які впирається", () => {
  const s = schedule(["2026-08-10", "14:00", "18:00"]);
  // Півтори години з 15:00 накривають 15:00, 15:30 і 16:00.
  const b = busy(["2026-08-10", "15:00", "16:30"]);

  const taken = timeOptions(s, b, "2026-08-10", MORNING)
    .filter((o) => o.taken)
    .map((o) => formatTime(o.minutes));

  assert.deepEqual(taken, ["15:00", "15:30", "16:00"]);
});

test("запис, що закінчується рівно о слоті, його не займає", () => {
  const s = schedule(["2026-08-10", "10:00", "12:00"]);
  const b = busy(["2026-08-10", "10:00", "11:00"]);

  // 11:00 — саме коли попередній сеанс завершився, тож година вільна.
  assert.equal(isTimeTaken(b, "2026-08-10", parseTime("11:00")!), false);
  assert.equal(isTimeTaken(b, "2026-08-10", parseTime("10:30")!), true);
  assert.equal(hasFreeTime(s, b, "2026-08-10", MORNING), true);
});

test("зайняте в інший день на сітку не впливає", () => {
  const b = busy(["2026-08-11", "10:00", "18:00"]);
  assert.equal(isTimeTaken(b, "2026-08-10", parseTime("10:00")!), false);
});

test("день, розібраний записами повністю, вільних годин не має", () => {
  const s = schedule(["2026-08-10", "10:00", "12:00"]);
  const b = busy(["2026-08-10", "10:00", "12:00"]);

  assert.equal(hasFreeTime(s, b, "2026-08-10", MORNING), false);
  assert.ok(timeOptions(s, b, "2026-08-10", MORNING).every((o) => o.taken));
});

test("вивернутий чи порожній проміжок нічого не займає", () => {
  const b = busy(
    ["2026-08-10", "12:00", "12:00"],
    ["2026-08-10", "15:00", "14:00"],
  );
  assert.equal(isTimeTaken(b, "2026-08-10", parseTime("12:00")!), false);
  assert.equal(isTimeTaken(b, "2026-08-10", parseTime("14:00")!), false);
});
