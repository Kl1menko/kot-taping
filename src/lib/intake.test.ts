import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONTRAINDICATIONS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  contraindicationLabels,
  isContactChannel,
  isContraindication,
  isPreferredTime,
  isTapeColor,
  isValidHandle,
  needsHandle,
  needsReview,
  normalizeHandle,
  parseHeight,
  preferredTimeLabel,
} from "./intake.ts";

test("нік нормалізується до однієї форми", () => {
  // Пацієнти вставляють нік як завгодно — майстриня шукає за одним рядком.
  for (const raw of [
    "@nick",
    "nick",
    "  nick  ",
    "https://instagram.com/nick",
    "instagram.com/nick/",
    "www.instagram.com/nick",
    "https://t.me/nick",
    "t.me/nick?start=1",
    "@@nick",
  ]) {
    assert.equal(normalizeHandle(raw), "nick", `не розібрано: ${raw}`);
  }
});

test("порожній нік лишається порожнім, а не стає сміттям", () => {
  assert.equal(normalizeHandle(""), "");
  assert.equal(normalizeHandle("   "), "");
  assert.equal(normalizeHandle("@"), "");
});

test("нік приймає лише допустимі символи", () => {
  assert.ok(isValidHandle("kotova_taping"));
  assert.ok(isValidHandle("nick.name"));
  assert.ok(isValidHandle("ab"));
  assert.ok(!isValidHandle("a"), "один символ — замало");
  assert.ok(!isValidHandle("nick name"), "пробіл усередині");
  assert.ok(!isValidHandle("@nick"), "@ має зрізати normalizeHandle");
  assert.ok(!isValidHandle("нік"), "кирилиця в ніках не буває");
  assert.ok(!isValidHandle("x".repeat(33)));
});

test("нік потрібен лише для месенджерів", () => {
  assert.ok(needsHandle("telegram"));
  assert.ok(needsHandle("instagram"));
  // Для телефону контакт уже є — номер із форми.
  assert.ok(!needsHandle("phone"));
});

test("канал і час дня звіряються зі списками", () => {
  assert.ok(isContactChannel("instagram"));
  assert.ok(!isContactChannel("viber"));
  assert.ok(isPreferredTime("morning"));
  assert.ok(!isPreferredTime("night"));
});

test("час дня має людський підпис, а невідомий — null", () => {
  assert.equal(preferredTimeLabel("morning"), "Ранок (9:00–12:00)");
  assert.equal(preferredTimeLabel("night"), null);
});

test("колір звіряється з асортиментом", () => {
  assert.ok(isTapeColor("Бежевий"));
  assert.ok(isTapeColor("На ваш розсуд"));
  assert.ok(!isTapeColor("Золотий"));
});

test("протипоказання звіряються за id", () => {
  assert.ok(isContraindication("pregnancy"));
  assert.ok(!isContraindication("headache"));
});

test("відмічене протипоказання ставить заявку на узгодження", () => {
  assert.ok(!needsReview([]), "чиста заявка йде без прапорця");
  assert.ok(needsReview(["pregnancy"]));
});

test("підписи протипоказань беруться зі списку, невідомі відкидаються", () => {
  assert.deepEqual(contraindicationLabels(["oncology"]), [
    "Онкологічні захворювання",
  ]);
  // У базі може лежати id, який зі списку прибрали, — рядок не має ламатись.
  assert.deepEqual(contraindicationLabels(["oncology", "ghost"]), [
    "Онкологічні захворювання",
  ]);
  assert.deepEqual(contraindicationLabels([]), []);
});

test("id протипоказань унікальні", () => {
  const ids = CONTRAINDICATIONS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("порожній зріст — це «не вказано», а не помилка", () => {
  // Поле необов'язкове: форма не має падати через порожній рядок.
  assert.deepEqual(parseHeight(""), { ok: true, value: null });
  assert.deepEqual(parseHeight("   "), { ok: true, value: null });
});

test("зріст приймається лише як ціле в межах", () => {
  assert.deepEqual(parseHeight("168"), { ok: true, value: 168 });
  assert.deepEqual(parseHeight(" 168 "), { ok: true, value: 168 });
  assert.deepEqual(parseHeight(String(HEIGHT_MIN_CM)), {
    ok: true,
    value: HEIGHT_MIN_CM,
  });
  assert.deepEqual(parseHeight(String(HEIGHT_MAX_CM)), {
    ok: true,
    value: HEIGHT_MAX_CM,
  });
});

test("друкарська помилка в зрості не проходить", () => {
  // Саме заради цього межі й стоять: «16» і «1680» — це промах по клавіші.
  for (const raw of ["16", "1680", "0", "-170", "168.5", "сто", "168см"]) {
    assert.deepEqual(parseHeight(raw), { ok: false }, `пройшло: ${raw}`);
  }
});
