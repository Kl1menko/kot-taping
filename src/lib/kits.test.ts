import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DELIVERY_COUNTRIES,
  KIT_ORDER_FLOW,
  KIT_ORDER_LABEL,
  isDeliveryCountry,
  isKitOrderStatus,
  isOpenKitOrder,
  isWorldwide,
  needsTracking,
  nextKitStatus,
  type KitOrderStatus,
} from "./kits.ts";

test("країна доставки звіряється зі списком", () => {
  assert.ok(isDeliveryCountry("Україна"));
  assert.ok(isDeliveryCountry("Інша країна"));
  assert.ok(!isDeliveryCountry("Мордор"));
});

test("worldwide — усе, крім України", () => {
  // Від цього залежить вартість доставки, тож межа має бути однозначною.
  assert.ok(!isWorldwide("Україна"));
  assert.ok(isWorldwide("Польща"));
  assert.ok(isWorldwide("Інша країна"));
});

test("статус замовлення звіряється зі списком", () => {
  assert.ok(isKitOrderStatus("paid"));
  assert.ok(!isKitOrderStatus("delivered"));
});

test("потік веде від нового до відправленого", () => {
  assert.equal(nextKitStatus("new"), "confirmed");
  assert.equal(nextKitStatus("confirmed"), "paid");
  assert.equal(nextKitStatus("paid"), "shipped");
});

test("відправлене й скасоване не мають наступного кроку", () => {
  // Інакше кнопка «далі» вела б у нікуди після завершення замовлення.
  assert.equal(nextKitStatus("shipped"), null);
  assert.equal(nextKitStatus("cancelled"), null);
});

test("у роботі — усе, крім відправленого й скасованого", () => {
  assert.ok(isOpenKitOrder("new"));
  assert.ok(isOpenKitOrder("confirmed"));
  assert.ok(isOpenKitOrder("paid"));
  assert.ok(!isOpenKitOrder("shipped"));
  assert.ok(!isOpenKitOrder("cancelled"));
});

test("накладна питається лише на відправленні", () => {
  assert.ok(needsTracking("shipped"));
  for (const s of ["new", "confirmed", "paid", "cancelled"] as KitOrderStatus[]) {
    assert.ok(!needsTracking(s), `зайва накладна на ${s}`);
  }
});

test("кожен статус має підпис", () => {
  for (const step of KIT_ORDER_FLOW) {
    assert.ok(KIT_ORDER_LABEL[step.id], `без підпису: ${step.id}`);
  }
});

test("проходження потоку завершується, а не зациклюється", () => {
  // Захист від помилки в порядку масиву: цикл мав би тут зависнути.
  let status: KitOrderStatus = "new";
  const seen = new Set<KitOrderStatus>([status]);

  for (let i = 0; i < KIT_ORDER_FLOW.length + 1; i++) {
    const next = nextKitStatus(status);
    if (next === null) break;
    assert.ok(!seen.has(next), `потік зациклився на ${next}`);
    seen.add(next);
    status = next;
  }

  assert.equal(status, "shipped");
});

test("список країн починається з України", () => {
  // Переважна більшість замовлень внутрішні — вона має бути значенням за
  // замовчуванням, а не десятим пунктом списку.
  assert.equal(DELIVERY_COUNTRIES[0], "Україна");
});
