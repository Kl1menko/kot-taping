/**
 * Робочий графік: які дні відкриті для запису, в якому кабінеті й до котрої.
 *
 * Чисті хелпери — без React і без звернень до БД, як calendar.ts та intake.ts.
 * Модуль читають три сторони: адмінка (де графік редагують), форма запису (де
 * його показують) і Server Action (де його перевіряють). Розійдись правила
 * хоч на крок, і форма показувала б час, який перевірка потім відкидає.
 *
 * День описується парою `opens_at`/`closes_at` — «10:00–18:00». Проміжки
 * ранок/день/вечір із анкети рахуються з цих меж (`slotsFromHours`), а не
 * зберігаються окремо: два джерела правди неминуче розійшлися б, і клієнтка
 * бачила б «вечір» у дні, що закривається о 17:00.
 */

import { dateKey, startOfDay } from "./calendar.ts";
import { PREFERRED_TIMES, type PreferredTime } from "./intake.ts";

/** Крок сітки часу, хвилин. Півгодини — дрібніше майстриня не планує. */
export const SLOT_STEP_MIN = 30;

/**
 * Межі проміжків анкети, у хвилинах від опівночі. Дзеркалять підписи в
 * PREFERRED_TIMES: 9:00–12:00, 12:00–16:00, 16:00–20:00.
 */
const SLOT_BOUNDS: Record<PreferredTime, { from: number; to: number }> = {
  morning: { from: 9 * 60, to: 12 * 60 },
  day: { from: 12 * 60, to: 16 * 60 },
  evening: { from: 16 * 60, to: 20 * 60 },
};

/** `10:30` → 630. Єдина точка розбору часу — решта рахує вже в хвилинах. */
export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;

  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** 630 → `10:30`. */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Один відкритий день. `day` — ключ виду `2026-08-08`, стабільний до зони:
 * саме в такому вигляді дата приходить із форми, лежить у колонці `date` і
 * порівнюється рядками без жодного `new Date()`.
 *
 * Години — хвилини від опівночі, вже розібрані: рядок `"10:00:00"` з Postgres
 * розбирається один раз на межі БД, а не в кожному місці, що його читає.
 */
export type WorkingDay = {
  day: string;
  opensAt: number;
  closesAt: number;
  note?: string | null;
};

/**
 * Графік у формі, зручній для пошуку: день → його межі.
 *
 * Мапа, а не масив, бо і форма, і перевірка питають одне й те саме — «чи
 * відкрито 2026-08-08?» — і роблять це для кожної клітинки календаря.
 */
export type Schedule = Map<string, { opensAt: number; closesAt: number }>;

export function toSchedule(days: readonly WorkingDay[]): Schedule {
  return new Map(
    days
      // Перевернуті межі до мапи не пускаємо: у базі їх боронить констрейнт,
      // але сюди дані приходять і з форми, де їх ще не перевірено.
      .filter((d) => d.closesAt > d.opensAt)
      .map((d) => [d.day, { opensAt: d.opensAt, closesAt: d.closesAt }]),
  );
}

/**
 * Чи відкритий день. Дня немає в графіку — день неробочий: графік це білий
 * список, і «нічого не налаштовано» означає «нічого не відкрито».
 */
export function isWorkingDay(schedule: Schedule, day: string): boolean {
  return schedule.has(day);
}

/** Межі дня, або null для вихідного. */
export function hoursFor(
  schedule: Schedule,
  day: string,
): { opensAt: number; closesAt: number } | null {
  return schedule.get(day) ?? null;
}

/** `10:00–18:00` — підпис у адмінці й у формі. */
export function hoursLabel(hours: {
  opensAt: number;
  closesAt: number;
}): string {
  return `${formatTime(hours.opensAt)}–${formatTime(hours.closesAt)}`;
}

/**
 * Час, на який можна записатись цього дня.
 *
 * Останній слот — саме `closesAt`, не пізніше: сеанс, що починається о
 * закритті, це не робочий час. Тому крок іде `< closesAt`.
 *
 * `now` відсікає години, що вже минули: о 14:00 пропонувати запис на 10:00
 * сьогодні безглуздо. Для майбутніх днів параметр ні на що не впливає.
 */
export function timesFor(
  schedule: Schedule,
  day: string,
  now = new Date(),
): number[] {
  const hours = schedule.get(day);
  if (!hours) return [];

  const isToday = day === dateKey(startOfDay(now));
  const passed = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const times: number[] = [];
  for (let t = hours.opensAt; t < hours.closesAt; t += SLOT_STEP_MIN) {
    if (t > passed) times.push(t);
  }
  return times;
}

/** Чи можна записатись саме на цей час. */
export function isTimeAvailable(
  schedule: Schedule,
  day: string,
  minutes: number,
  now = new Date(),
): boolean {
  return timesFor(schedule, day, now).includes(minutes);
}

/**
 * Проміжки анкети, що потрапляють у робочі години дня.
 *
 * Рахуються, а не зберігаються: день 10:00–18:00 сам собою означає «ранок,
 * день і вечір частково», і тримати це ще й окремою колонкою — значить
 * заводити друге джерело правди, яке рано чи пізно розійдеться з першим.
 *
 * Проміжок вважається доступним, якщо він перетинається з робочими годинами
 * бодай на один слот, — саме так його й прочитає людина.
 */
export function slotsFromHours(hours: {
  opensAt: number;
  closesAt: number;
}): PreferredTime[] {
  return PREFERRED_TIMES.map((t) => t.id).filter((id) => {
    const bound = SLOT_BOUNDS[id];
    return hours.opensAt < bound.to && bound.from < hours.closesAt;
  });
}

/** Проміжок, у який потрапляє конкретний час, — для збереження в заявці. */
export function slotForTime(minutes: number): PreferredTime | null {
  const found = PREFERRED_TIMES.map((t) => t.id).find((id) => {
    const bound = SLOT_BOUNDS[id];
    return minutes >= bound.from && minutes < bound.to;
  });
  return found ?? null;
}

/**
 * Чи можна ще записатись на цей день — тобто чи він не в минулому.
 *
 * Сьогодні вважається доступним: заявка це намір, а не бронювання, і людина
 * цілком може написати зранку на сьогоднішній вечір.
 */
export function isBookable(day: string, today = new Date()): boolean {
  return day >= dateKey(startOfDay(today));
}

/**
 * Чи приймається дата з форми: вона відкрита в графіку й не в минулому.
 *
 * Це та сама перевірка, яку робить клієнт, малюючи календар, — тому Server
 * Action не може відкинути день, який форма показала доступним, і навпаки.
 *
 * Сьогоднішній день, години якого вже минули, доступним не вважається: інакше
 * форма пропонувала б дату, на яку не лишилось жодного часу.
 */
export function isDateAvailable(
  schedule: Schedule,
  day: string,
  today = new Date(),
): boolean {
  return (
    isBookable(day, today) &&
    isWorkingDay(schedule, day) &&
    timesFor(schedule, day, today).length > 0
  );
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
    .filter((day) => isDateAvailable(schedule, day, today))
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
  return [...schedule.keys()].filter((day) => day.startsWith(prefix)).length;
}
