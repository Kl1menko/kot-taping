/**
 * Календар під чужою часовою зоною.
 *
 * Окремий файл, бо ці тести мають сенс лише коли процес *не* в зоні студії:
 * решта набору йде в зоні розробника (Київ), і саме тому баг із «сьогодні»
 * ніколи в ній не проявлявся. Запускається з `TZ=UTC` — див. npm-скрипт
 * `test:tz`, який відтворює зону сервера Vercel.
 *
 * Що фіксуємо: `instrumentation.ts` виставляє `process.env.TZ` до першого
 * запиту, тож розрахунки мусять іти за Києвом навіть на UTC-сервері.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STUDIO_TZ, matchesStudioTz } from "./calendar.ts";

/** Що показує календар у зоні студії — незалежно від зони процесу. */
function studioDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TZ,
    dateStyle: "short",
  }).format(d);
}

test("детектор зони бачить розбіжність, коли процес не в зоні студії", () => {
  // Тест запускається під TZ=UTC, а студія в Києві (UTC+2/+3) — отже, ні.
  assert.equal(
    matchesStudioTz(),
    false,
    "під TZ=UTC зона процесу не збігається зі студійною",
  );
});

test("пізній вечір у Києві — це вже наступна доба, а не поточна за UTC", () => {
  // 21:30 UTC 11 серпня = 00:30 12 серпня у Києві.
  const late = new Date("2026-08-11T21:30:00.000Z");

  assert.equal(studioDay(late), "2026-08-12", "у студії вже 12 серпня");

  // Саме тут ламався екран «Сьогодні»: процес у UTC вважав добу вчорашньою.
  const processDay = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
  }).format(late);
  assert.equal(processDay, "2026-08-11", "а процес у UTC відстає на добу");
  assert.notEqual(
    processDay,
    studioDay(late),
    "розбіжність реальна — її й закриває instrumentation.ts",
  );
});

test("взимку зсув інший, і детектор це враховує", () => {
  // Київ узимку UTC+2: 22:30 UTC = 00:30 наступного дня.
  const winter = new Date("2026-01-15T22:30:00.000Z");
  assert.equal(studioDay(winter), "2026-01-16");
});
