import "server-only";

import { db } from "./client";
import { dateKey, startOfDay } from "@/lib/calendar";
import {
  formatTime,
  parseTime,
  toSchedule,
  type Schedule,
  type WorkingDay,
} from "@/lib/schedule";
import type { WorkingDayRow } from "./types";

/**
 * Робочий графік — читання для адмінки й для форми запису.
 *
 * Дати тут ходять рядками `2026-08-08`, а не `Date`: у Postgres колонка має
 * тип `date` (без часу й зони), у формі те саме приходить з календаря, і
 * будь-яке перетворення на момент часу лише додало б шанс зсунути день через
 * зону.
 *
 * Години, навпаки, одразу розбираються в хвилини від опівночі: Postgres
 * віддає `time` рядком «10:00:00», і робити цей розбір у кожному місці, що
 * читає графік, означало б чекати першої ж розбіжності.
 */

/** Хвилини від опівночі — за замовчуванням робоче вікно студії. */
const FALLBACK_OPENS = 9 * 60;
const FALLBACK_CLOSES = 20 * 60;

function toWorkingDay(
  row: Pick<WorkingDayRow, "day" | "opens_at" | "closes_at" | "note">,
): WorkingDay {
  // Відкат на робоче вікно, а не пропуск дня: колонки `not null`, тож сюди
  // можна дійти лише з геть несподіваним форматом — і тоді день краще
  // показати з типовими годинами, ніж мовчки прибрати з графіка.
  return {
    day: row.day,
    opensAt: parseTime(row.opens_at) ?? FALLBACK_OPENS,
    closesAt: parseTime(row.closes_at) ?? FALLBACK_CLOSES,
    note: row.note,
  };
}

/**
 * Графік кабінету в межах [from, to] — обидві межі включно, бо це календарні
 * дати, а не моменти часу: «до 31 серпня» означає саме 31-ше.
 */
export async function listWorkingDays(
  locationId: string,
  from: string,
  to: string,
): Promise<WorkingDay[]> {
  const { data, error } = await db()
    .from("working_days")
    .select("day, opens_at, closes_at, note")
    .eq("location_id", locationId)
    .gte("day", from)
    .lte("day", to)
    .order("day");

  if (error) {
    throw new Error(`Не вдалося прочитати графік: ${error.message}`);
  }

  return (data ?? []).map(toWorkingDay);
}

/**
 * Графік для форми запису: усі відкриті дні від сьогодні, по кабінетах.
 *
 * Ключ — slug кабінету, а не id: форма оперує саме slug'ами («lviv»), бо їх
 * знає і `<select>`, і Server Action, що звіряє заявку.
 *
 * Повертаємо масиви, а не готові `Map`: цей результат іде в Client Component
 * через межу RSC, а `Map` її не переживає — на клієнті з нього вийшов би
 * порожній об'єкт, і форма мовчки показала б, що вільних дат немає.
 * Складання в `Schedule` — робота приймача (`toSchedule`).
 *
 * Помилка читання не валить сторінку, а лишає порожній графік. Наслідок тут
 * навмисно суворий, на відміну від `listPublicServices` з його відкатом на
 * константи: порожній графік закриває запис. Показати «вільно» там, де графіку
 * немає, значить набрати заявок на дні, коли кабінет зачинений.
 */
export async function listPublicSchedule(
  /** Наскільки далеко наперед відкриваємо запис. */
  monthsAhead = 4,
): Promise<Record<string, WorkingDay[]>> {
  const today = startOfDay(new Date());
  const until = new Date(today);
  until.setMonth(until.getMonth() + monthsAhead);

  try {
    const { data, error } = await db()
      .from("working_days")
      .select("day, opens_at, closes_at, note, location:locations ( slug, is_active )")
      .gte("day", dateKey(today))
      .lte("day", dateKey(until))
      .order("day");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as (Pick<
      WorkingDayRow,
      "day" | "opens_at" | "closes_at" | "note"
    > & { location: { slug: string; is_active: boolean } | null })[];

    // Групуємо по кабінету, деактивовані пропускаючи: кабінет прибрали з
    // сайту — його графік не має лишатись у формі.
    const byLocation: Record<string, WorkingDay[]> = {};
    for (const row of rows) {
      if (!row.location?.is_active) continue;
      const day = toWorkingDay(row);
      // Нотатка — для майстрині, і на клієнт їй не треба: вона нічого там не
      // малює, зате поїхала б у HTML кожної сторінки.
      (byLocation[row.location.slug] ??= []).push({
        day: day.day,
        opensAt: day.opensAt,
        closesAt: day.closesAt,
      });
    }

    return byLocation;
  } catch (error) {
    // Мовчки не можна: порожній графік закриває запис, і причину треба бачити
    // в логах, а не гадати, чому форма не пропонує жодної дати.
    console.error(
      "[schedule] не вдалося прочитати графік:",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/**
 * Те саме, але вже як `Schedule` — для Server Action, який звіряє заявку.
 *
 * Живе поруч, а не в екшені, щоб перевірка й показ спиралися на один запит і
 * одні правила: розійдись вони, форма показувала б час, який перевірка потім
 * відкидає.
 */
export async function readSchedule(
  locationSlug: string,
): Promise<Schedule | null> {
  const byLocation = await listPublicSchedule();
  const days = byLocation[locationSlug];
  return days ? toSchedule(days) : null;
}

/** Хвилини від опівночі → `10:00` для колонки `time` у Postgres. */
export function toTimeColumn(minutes: number): string {
  return formatTime(minutes);
}
