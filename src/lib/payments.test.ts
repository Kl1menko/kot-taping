import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canReissue,
  formatAmount,
  isFinal,
  isPaid,
  isPaymentStatus,
  isPending,
  paymentDestination,
  toMinor,
  validateAmount,
  type PaymentStatus,
} from "./payments.ts";

test("статус звіряється зі списком банку", () => {
  assert.ok(isPaymentStatus("success"));
  assert.ok(isPaymentStatus("expired"));
  // Невідомий статус має відсіятись до запису в базу: у міграції на цю
  // колонку стоїть check, і чужий рядок впав би вже після виклику банку.
  assert.ok(!isPaymentStatus("refunded"));
  assert.ok(!isPaymentStatus(""));
});

test("оплаченим вважається лише success", () => {
  assert.ok(isPaid("success"));
  // hold — гроші заблоковані, але не списані. Вважати це оплатою не можна:
  // рахунки ми створюємо як debit, тож поява hold означає щось несподіване.
  assert.ok(!isPaid("hold"));
  assert.ok(!isPaid("processing"));
  assert.ok(!isPaid("reversed"));
});

test("живий рахунок — той, за яким ще може прийти оплата", () => {
  assert.ok(isPending("created"));
  assert.ok(isPending("processing"));
  assert.ok(isPending("hold"));

  assert.ok(!isPending("success"));
  assert.ok(!isPending("failure"));
  assert.ok(!isPending("expired"));
});

test("кінцевий стан — доповнення до живого", () => {
  const all: PaymentStatus[] = [
    "created",
    "processing",
    "hold",
    "success",
    "failure",
    "reversed",
    "expired",
  ];
  for (const s of all) {
    assert.equal(isFinal(s), !isPending(s), `розбіжність на ${s}`);
  }
});

test("другий рахунок не виставляється, поки живий перший", () => {
  // Два QR у клієнтки — це питання «а який із них оплачувати».
  assert.ok(!canReissue(["created"]));
  assert.ok(!canReissue(["processing"]));
  // Уже оплачено — виставляти вдруге тим паче не можна.
  assert.ok(!canReissue(["success"]));
  assert.ok(!canReissue(["failure", "success"]));
});

test("після невдачі рахунок можна виставити знову", () => {
  assert.ok(canReissue([]));
  assert.ok(canReissue(["failure"]));
  assert.ok(canReissue(["expired"]));
  assert.ok(canReissue(["failure", "expired"]));
});

test("гривні переводяться в копійки без похибки", () => {
  assert.equal(toMinor(2200), 220000);
  assert.equal(toMinor(1500.5), 150050);
  // 10.07 * 100 у подвійній точності дає 1006.9999999999999 — без округлення
  // в банк пішла б сума на копійку менша.
  assert.equal(toMinor(10.07), 1007);
});

test("сума показується як у прайсі", () => {
  // Круглі суми — без копійок: «2 200 ₴» читається краще за «2 200,00 ₴».
  assert.ok(formatAmount(220000).startsWith("2"));
  assert.ok(formatAmount(220000).endsWith("₴"));
  assert.ok(!formatAmount(220000).includes(","));
  // А некруглі копійки показуємо, інакше сума на екрані розійшлася б зі
  // списаною.
  assert.ok(formatAmount(150050).includes(","));
});

test("сума перевіряється до відправки в банк", () => {
  assert.equal(validateAmount(2200), null);
  assert.equal(validateAmount(0.5), null);

  assert.ok(validateAmount(0));
  assert.ok(validateAmount(-100));
  assert.ok(validateAmount(Number.NaN));
  // Запобіжник від описки: у прайсі найдорожча позиція 7200 ₴.
  assert.ok(validateAmount(1_000_000));
});

test("копійки приймаються, дрібніше — ні", () => {
  // Похибка подвійної точності не має вважатися «дрібнішим за копійку».
  assert.equal(validateAmount(10.07), null);
  assert.equal(validateAmount(1500.5), null);
  // А справжня третя цифра після коми — має.
  assert.ok(validateAmount(10.005));
});

test("призначення платежу називає студію", () => {
  // У виписці банку сам лише «Обличчя + шия» виглядає загадково.
  const text = paymentDestination("Обличчя + шия");
  assert.ok(text.includes("Kotova Taping"));
  assert.ok(text.includes("Обличчя + шия"));
});
