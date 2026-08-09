/**
 * Нормалізація телефонів. Один номер може прийти як
 *   0631234567 · 0 (63) 123 45 67 · +380 63 123 45 67 · 380631234567
 * — і всі варіанти мають вважатись одним клієнтом.
 *
 * Адаптовано з calendarvet-next/src/lib/phone.ts (там покрито тестами).
 */

/** Лишає у рядку тільки цифри. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Канонічний вигляд українського номера — 10 цифр, що починаються з 0.
 * Саме він лягає в `clients.phone`, тож unique-індекс справді ловить
 * повторний візит тієї самої людини.
 *
 * Нестандартний ввід повертається як самі цифри: часткові номери мають
 * лишатись придатними для пошуку підрядком.
 */
export function normalizePhone(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 12 && d.startsWith("380")) return "0" + d.slice(3);
  // 80XXXXXXXXX — «+» з'їли при копіюванні.
  if (d.length === 11 && d.startsWith("80")) return "0" + d.slice(2);
  return d;
}

/** Чи є номер повним українським мобільним. */
export function isValidPhone(value: string): boolean {
  return /^0\d{9}$/.test(normalizePhone(value));
}

/** `0631234567` → `+380 63 123 45 67` для показу. */
export function formatPhone(value: string): string {
  const d = normalizePhone(value);
  if (!/^0\d{9}$/.test(d)) return value;
  return `+380 ${d.slice(1, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** Збіг за повним номером або його фрагментом (напр. останні 4 цифри). */
export function phoneMatches(phone: string, query: string): boolean {
  const q = normalizePhone(query);
  if (!q) return false;
  return normalizePhone(phone).includes(q);
}
