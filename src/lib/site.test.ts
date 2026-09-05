import test from "node:test";
import assert from "node:assert/strict";
import { isPubliclyReachable } from "./site.ts";

/**
 * Адреса, яку ми даємо банку для вебхука.
 *
 * Регресія, заради якої написано ці тести: `SITE_URL` мовчки відкотився на
 * localhost у продакшені, рахунки виставлялись із недосяжним `webHookUrl`,
 * і статуси оплат назавжди лишались `created` при списаних грошах.
 */

test("localhost банку не годиться", () => {
  assert.equal(isPubliclyReachable("http://localhost:3000"), false);
  assert.equal(isPubliclyReachable("https://localhost:3000"), false);
  assert.equal(isPubliclyReachable("http://127.0.0.1:3000"), false);
  assert.equal(isPubliclyReachable("https://app.localhost"), false);
});

test("приватні діапазони недосяжні ззовні", () => {
  assert.equal(isPubliclyReachable("https://10.0.0.5"), false);
  assert.equal(isPubliclyReachable("https://192.168.1.10"), false);
  assert.equal(isPubliclyReachable("https://172.16.0.1"), false);
  assert.equal(isPubliclyReachable("https://172.31.255.1"), false);
  // 172.32 вже поза приватним діапазоном — межу не зсуваємо.
  assert.equal(isPubliclyReachable("https://172.32.0.1"), true);
});

test("http не приймається навіть на справжньому домені", () => {
  // Вебхук monobank ходить лише через https.
  assert.equal(isPubliclyReachable("http://kotova-taping.com"), false);
});

test("домен без крапки назовні не резолвиться", () => {
  assert.equal(isPubliclyReachable("https://myserver"), false);
});

test("публічний https-домен проходить", () => {
  assert.equal(isPubliclyReachable("https://kotova-taping.com"), true);
  assert.equal(isPubliclyReachable("https://beauty-tape.vercel.app"), true);
});

test("сміття замість адреси не проходить", () => {
  assert.equal(isPubliclyReachable("не адреса"), false);
  assert.equal(isPubliclyReachable(""), false);
});
