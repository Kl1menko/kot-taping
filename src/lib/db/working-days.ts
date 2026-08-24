import "server-only";

import { db } from "./client";
import { dateKey, startOfDay } from "@/lib/calendar";
import { normalizeSlots, toSchedule, type Schedule, type WorkingDay } from "@/lib/schedule";
import type { WorkingDayRow } from "./types";

/**
 * Робочий графік — читання для адмінки й для форми запису.
 *
 * Дати тут ходять рядками `2026-08-08`, а не `Date`: у Postgres колонка має
 * тип `date` (без часу й зони), у формі те саме приходить з `<input
 * type="date">`, і будь-яке перетворення на момент часу лише додало б шанс
 * зсунути день через зону.
 */

function toWorkingDay(row: Pick<WorkingDayRow, "day" | "slots" | "note">): WorkingDay {
  return {
    day: row.day,
    // Нормалізуємо на читанні: check-констрейнт боронить майбутні вставки, а
    // старі рядки могли лягти до нього. Порядок доби теж наводимо тут.
    slots: normalizeSlots(row.slots),
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
    .select("day, slots, note")
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
      .select("day, slots, note, location:locations ( slug, is_active )")
      .gte("day", dateKey(today))
      .lte("day", dateKey(until))
      .order("day");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as (Pick<
      WorkingDayRow,
      "day" | "slots" | "note"
    > & { location: { slug: string; is_active: boolean } | null })[];

    // Групуємо по кабінету, деактивовані пропускаючи: кабінет прибрали з
    // сайту — його графік не має лишатись у формі.
    const byLocation: Record<string, WorkingDay[]> = {};
    for (const row of rows) {
      if (!row.location?.is_active) continue;
      // Нотатка — для майстрині, і на клієнт їй не треба: вона нічого там не
      // малює, зате поїхала б у HTML кожної сторінки.
      (byLocation[row.location.slug] ??= []).push({
        day: row.day,
        slots: normalizeSlots(row.slots),
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
 * одні правила: розійдись вони, форма показувала б день, який перевірка потім
 * відкидає.
 */
export async function readSchedule(
  locationSlug: string,
): Promise<Schedule | null> {
  const byLocation = await listPublicSchedule();
  const days = byLocation[locationSlug];
  return days ? toSchedule(days) : null;
}
