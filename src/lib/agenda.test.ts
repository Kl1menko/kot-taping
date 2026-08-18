import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAgenda, plural, todaySummary } from "./agenda.ts";

const EMPTY = {
  newRequests: 0,
  kitOrders: {},
  upcomingToday: 0,
  flaggedRequests: 0,
};

test("порожній день не дає жодної справи", () => {
  // Це не помилковий стан, а найкращий можливий — екран скаже про це сам.
  assert.deepEqual(buildAgenda(EMPTY), []);
});

test("українська множина рахує правильно", () => {
  const forms = (n: number) => plural(n, "заявка", "заявки", "заявок");

  assert.equal(forms(1), "заявка");
  assert.equal(forms(2), "заявки");
  assert.equal(forms(5), "заявок");
  // 11–14 — виняток: попри 1 і 2 на кінці, форма завжди «заявок».
  assert.equal(forms(11), "заявок");
  assert.equal(forms(12), "заявок");
  assert.equal(forms(14), "заявок");
  assert.equal(forms(21), "заявка");
  assert.equal(forms(22), "заявки");
  assert.equal(forms(25), "заявок");
  assert.equal(forms(101), "заявка");
  assert.equal(forms(111), "заявок");
});

test("протипоказання йдуть попереду звичайних заявок", () => {
  const tasks = buildAgenda({ ...EMPTY, newRequests: 3, flaggedRequests: 1 });

  assert.equal(tasks[0].id, "flagged");
  assert.equal(tasks[1].id, "requests");
});

test("заявка з протипоказанням не рахується двічі", () => {
  // Вона вже врахована окремою справою — інакше сума на екрані не збіглась би
  // з кількістю заявок у розділі.
  const tasks = buildAgenda({ ...EMPTY, newRequests: 3, flaggedRequests: 1 });

  const plain = tasks.find((t) => t.id === "requests");
  assert.equal(plain?.count, 2);
});

test("усі заявки з протипоказаннями не лишають порожньої справи", () => {
  const tasks = buildAgenda({ ...EMPTY, newRequests: 2, flaggedRequests: 2 });

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, "flagged");
});

test("замовлення наборів дають окрему справу на кожен крок", () => {
  const tasks = buildAgenda({
    ...EMPTY,
    kitOrders: { new: 1, confirmed: 2, paid: 1 },
  });

  assert.deepEqual(
    tasks.map((t) => t.id),
    ["kits-new", "kits-confirmed", "kits-paid"],
  );
});

test("закриті замовлення справ не створюють", () => {
  // Відправлене й скасоване — вихід із потоку, робити з ними нічого.
  const tasks = buildAgenda({
    ...EMPTY,
    kitOrders: { shipped: 5, cancelled: 3 },
  });

  assert.deepEqual(tasks, []);
});

test("нове замовлення термінове, решта кроків — ні", () => {
  const tasks = buildAgenda({
    ...EMPTY,
    kitOrders: { new: 1, confirmed: 1 },
  });

  assert.equal(tasks.find((t) => t.id === "kits-new")?.tone, "urgent");
  assert.equal(tasks.find((t) => t.id === "kits-confirmed")?.tone, "normal");
});

test("кожна справа веде в наявний розділ", () => {
  const tasks = buildAgenda({
    newRequests: 2,
    flaggedRequests: 1,
    kitOrders: { new: 1, confirmed: 1, paid: 1 },
    upcomingToday: 3,
  });

  const known = new Set(["/admin/requests", "/admin/kits", "/admin/calendar"]);
  for (const task of tasks) {
    assert.ok(known.has(task.href), `невідомий маршрут: ${task.href}`);
    assert.ok(task.title.length > 0, "справа без заголовка");
    assert.ok(task.count > 0, "справа з нульовим лічильником");
  }
});

test("id справ унікальні — інакше React загубить рядки", () => {
  const tasks = buildAgenda({
    newRequests: 3,
    flaggedRequests: 1,
    kitOrders: { new: 1, confirmed: 1, paid: 1 },
    upcomingToday: 2,
  });

  const ids = tasks.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("підсумок дня говорить про порожній день прямо", () => {
  assert.equal(todaySummary(0, 0, null), "Сьогодні записів немає");
});

test("підсумок дня називає наступний час", () => {
  assert.equal(todaySummary(5, 3, "14:30"), "5 записів сьогодні, наступний о 14:30");
  assert.equal(todaySummary(1, 1, "09:00"), "1 запис сьогодні, наступний о 09:00");
});

test("коли все позаду — підсумок каже саме це", () => {
  // Інакше о 20:00 екран показував би «5 записів сьогодні» без натяку, що
  // робочий день уже закінчився.
  assert.equal(todaySummary(5, 0, null), "5 записів сьогодні — усі позаду");
});
