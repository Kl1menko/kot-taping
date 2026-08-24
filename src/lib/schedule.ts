/**
 * Робочий графік: які дні відкриті для запису і в якому кабінеті.
 *
 * Чисті хелпери — без React і без звернень до БД, як calendar.ts та intake.ts.
 * Модуль читають три сторони: адмінка (де графік редагують), форма запису (де
 * його показують) і Server Action (де його перевіряють). Розійдись правила
 * хоч на крок, і форма показувала б день, який перевірка потім відкидає.
 */

import { dateKey, startOfDay } from "./calendar.ts";
import { PREFERRED_TIMES, type PreferredTime } from "./intake.ts";

/**
 * Проміжки дня — ті самі, що в анкеті. Тут лише id: підписи й години живуть
 * у PREFERRED_TIMES, і дублювати їх не можна.
 */
export const SLOT_IDS = PREFERRED_TIMES.map((t) => t.id);

export function isSlot(value: string): value is PreferredTime {
  return (SLOT_IDS as readonly string[]).includes(value);
}

/** Відкидає невідомі проміжки й дублікати, зберігаючи порядок дня. */
export function normalizeSlots(raw: readonly string[]): PreferredTime[] {
  return SLOT_IDS.filter((id) => raw.includes(id));
}

/**
 * Один відкритий день. `day` — ключ виду `2026-08-08`, стабільний до зони:
 * саме в такому вигляді дата приходить із `<input type="date">`, лежить у
 * колонці `date` і порівнюється рядками без жодного `new Date()`.
 */
export type WorkingDay = {
  day: string;
  slots: PreferredTime[];
  note?: string | null;
};

/**
 * Графік у формі, зручній для пошуку: день → відкриті проміжки.
 *
 * Мапа, а не масив, бо і форма, і перевірка питають одне й те саме — «чи
 * відкрито 2026-08-08?» — і роблять це для кожної клітинки календаря.
 */
export type Schedule = Map<string, PreferredTime[]>;

export function toSchedule(days: readonly WorkingDay[]): Schedule {
  return new Map(days.map((d) => [d.day, d.slots]));
}

/**
 * Чи відкритий день. Дня немає в графіку — день неробочий: графік це білий
 * список, і «нічого не налаштовано» означає «нічого не відкрито».
 */
export function isWorkingDay(schedule: Schedule, day: string): boolean {
  return (schedule.get(day)?.length ?? 0) > 0;
}

/** Чи відкритий конкретний проміжок цього дня. */
export function isSlotOpen(
  schedule: Schedule,
  day: string,
  slot: PreferredTime,
): boolean {
  return schedule.get(day)?.includes(slot) ?? false;
}

/**
 * Проміжки дня в порядку доби. Порожньо — день закритий.
 *
 * Форма показує рівно це: обравши дату, клієнтка бачить лише ті проміжки, які
 * майстриня справді відкрила, а не всі три з погашеними двома.
 */
export function slotsFor(schedule: Schedule, day: string): PreferredTime[] {
  return schedule.get(day) ?? [];
}

/**
 * Чи можна ще записатись на цей день — тобто чи він не в минулому.
 *
 * Сьогодні вважається доступним: заявка це намір, а не бронювання, і людина
 * цілком може написати зранку на сьогоднішній вечір. Точний час усе одно
 * ставить майстриня.
 */
export function isBookable(day: string, today = new Date()): boolean {
  return day >= dateKey(startOfDay(today));
}

/**
 * Чи приймається дата з форми: вона відкрита в графіку й не в минулому.
 *
 * Це та сама перевірка, яку робить клієнт, малюючи календар, — тому Server
 * Action не може відкинути день, який форма показала доступним, і навпаки.
 */
export function isDateAvailable(
  schedule: Schedule,
  day: string,
  today = new Date(),
): boolean {
  return isBookable(day, today) && isWorkingDay(schedule, day);
}

/**
 * Найближчі відкриті дні, від сьогодні. Порядок — хронологічний.
 *
 * Потрібні формі, щоб відкрити календар на місяці, де дні справді є: почни
 * вона завжди з поточного, і в кінці місяця клієнтка бачила б порожню сітку,
 * не здогадуючись, що треба гортати далі.
 */
export function upcomingDays(
  schedule: Schedule,
  today = new Date(),
  limit = 60,
): string[] {
  return [...schedule.keys()]
    .filter((day) => isBookable(day, today) && isWorkingDay(schedule, day))
    .sort()
    .slice(0, limit);
}

/**
 * Місяць, який форма має показати першим: той, де є найближчий відкритий день.
 *
 * Повертає перше число місяця — саме з ним працює `monthGrid`.
 */
export function initialMonth(schedule: Schedule, today = new Date()): Date {
  const [first] = upcomingDays(schedule, today, 1);
  if (!first) return new Date(today.getFullYear(), today.getMonth(), 1);

  const [y, m] = first.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/**
 * Скільки днів відкрито в місяці — підпис у адмінці («8 робочих днів»).
 *
 * Місяць задається першим числом, а не парою меж: клітинки сітки з сусідніх
 * місяців рахуватись не мають, інакше число стрибало б при гортанні.
 */
export function countInMonth(schedule: Schedule, month: Date): number {
  const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
  return [...schedule.keys()].filter(
    (day) => day.startsWith(prefix) && isWorkingDay(schedule, day),
  ).length;
}
