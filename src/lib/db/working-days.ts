import "server-only";

import { db } from "./client";
import { dateKey, startOfDay } from "@/lib/calendar";
import {
  formatTime,
  normalizeIntervals,
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

/** Рядок відрізка, як його віддає join: «10:00:00». */
type IntervalRow = { opens_at: string; closes_at: string };

function toWorkingDay(
  row: Pick<WorkingDayRow, "day" | "opens_at" | "closes_at" | "note"> & {
    working_day_intervals?: IntervalRow[] | null;
  },
): WorkingDay {
  // Відкат на робоче вікно, а не пропуск дня: колонки `not null`, тож сюди
  // можна дійти лише з геть несподіваним форматом — і тоді день краще
  // показати з типовими годинами, ніж мовчки прибрати з графіка.
  const parsed = (row.working_day_intervals ?? [])
    .map((i) => ({
      opensAt: parseTime(i.opens_at),
      closesAt: parseTime(i.closes_at),
    }))
    .filter(
      (i): i is { opensAt: number; closesAt: number } =>
        i.opensAt !== null && i.closesAt !== null,
    );

  // Відрізків немає — беремо межі самого дня. Так читаються бази, де 0013 ще
  // не виконана, і день, з якого прибрали останній відрізок: краще показати
  // його типовими годинами, ніж загубити з графіка мовчки.
  const intervals =
    parsed.length > 0
      ? normalizeIntervals(parsed)
      : normalizeIntervals([
          {
            opensAt: parseTime(row.opens_at) ?? FALLBACK_OPENS,
            closesAt: parseTime(row.closes_at) ?? FALLBACK_CLOSES,
          },
        ]);

  return { day: row.day, intervals, note: row.note };
}

/**
 * Чи це скарга на відсутню таблицю відрізків.
 *
 * Код їде на прод раніше, ніж хтось виконає міграцію 0013, — і в цьому вікні
 * join по `working_day_intervals` не існує. Порожній графік тут закрив би запис
 * на сайті, тож у такому разі читаємо день по його власних межах: рівно так,
 * як він працював до відрізків.
 */
function isMissingIntervals(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST200" ||
    error.code === "42P01" ||
    /working_day_intervals/.test(error.message ?? "")
  );
}

/** Колонки дня без join — відкат, поки міграція 0013 не виконана. */
const DAY_COLUMNS = "day, opens_at, closes_at, note";
const DAY_COLUMNS_WITH_INTERVALS = `${DAY_COLUMNS}, working_day_intervals ( opens_at, closes_at )`;

/**
 * Графік усіх кабінетів у межах [from, to] — обидві межі включно, бо це
 * календарні дати, а не моменти часу: «до 31 серпня» означає саме 31-ше.
 *
 * По всіх кабінетах, а не по одному: сторінка графіка читала спершу кабінети,
 * а тоді дні активного — два послідовні рейси на кожне гортання місяця, хоч
 * залежність між ними удавана (який кабінет активний, вирішує slug з URL, а не
 * відповідь бази). Кабінетів у студії два, тож діапазон по всіх коштує
 * стільки ж, зате читається одночасно зі списком кабінетів.
 */
export async function listWorkingDaysByLocation(
  from: string,
  to: string,
): Promise<Record<string, WorkingDay[]>> {
  const columns = (base: string) => `${base}, location_id`;

  const query = (cols: string) =>
    db()
      .from("working_days")
      .select(cols)
      .gte("day", from)
      .lte("day", to)
      .order("day");

  let { data, error } = await query(columns(DAY_COLUMNS_WITH_INTERVALS));

  // Те саме вікно між деплоєм і міграцією 0013, що й у `listPublicSchedule`.
  if (error && isMissingIntervals(error)) {
    ({ data, error } = await query(columns(DAY_COLUMNS)));
  }

  if (error) {
    throw new Error(`Не вдалося прочитати графік: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as (Parameters<typeof toWorkingDay>[0] & {
    location_id: string;
  })[];

  const byLocation: Record<string, WorkingDay[]> = {};
  for (const row of rows) {
    (byLocation[row.location_id] ??= []).push(toWorkingDay(row));
  }
  return byLocation;
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
    const location = ", location:locations ( slug, is_active )";
    const query = (columns: string) =>
      db()
        .from("working_days")
        .select(columns + location)
        .gte("day", dateKey(today))
        .lte("day", dateKey(until))
        .order("day");

    let { data, error } = await query(DAY_COLUMNS_WITH_INTERVALS);

    // Те саме вікно між деплоєм і міграцією, що й вище. Тут
    // ціна помилки найвища: без відкату форма запису показала б, що вільних
    // дат немає зовсім.
    if (error && isMissingIntervals(error)) {
      console.warn(
        "[schedule] немає таблиці working_day_intervals — виконайте міграцію 0013; " +
          "поки що день читається як один відрізок.",
      );
      ({ data, error } = await query(DAY_COLUMNS));
    }

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as (Pick<
      WorkingDayRow,
      "day" | "opens_at" | "closes_at" | "note"
    > & {
      working_day_intervals: IntervalRow[] | null;
      location: { slug: string; is_active: boolean } | null;
    })[];

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
        intervals: day.intervals,
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
