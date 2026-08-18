/**
 * Чисті хелпери для календаря — без React і без звернень до БД.
 *
 * Усі дати трактуються в локальній зоні студії: майстер мислить у «10:40 у
 * суботу», а не в UTC. У базу `starts_at` іде як timestamptz, тож перетворення
 * робиться рівно на межі — тут.
 *
 * «Локальна» тут означає зону процесу: `getHours`, `getDate` і решта читають
 * саме її. На машині майстрині це Київ, але сервер за замовчуванням живе в
 * UTC — і тоді щовечора після 21:00 (взимку після 22:00) «сьогодні» на сервері
 * ще вчорашнє. Екран «Сьогодні» показував би вчорашній день, а аналітика різала
 * б тиждень по межі UTC. Тому зона задається явно — див. STUDIO_TZ нижче.
 */

/**
 * Зона студії. Обидва кабінети — Львів і Київ — в одній зоні, тож вона одна.
 *
 * Модуль читають і сервер, і браузер, тому саме тут ми зону лише декларуємо.
 * Виставляє її `instrumentation.ts` (сервер) — у браузера вона й так київська,
 * бо це зона майстрині.
 */
export const STUDIO_TZ = "Europe/Kyiv";

/**
 * Чи збігається зона процесу зі студійною — для перевірки на старті.
 *
 * Порівнюємо не назви, а зсув: на сервері TZ може бути «Europe/Uzhgorod» або
 * «EET», і це та сама зона. Беремо січень і липень, щоб схопити і зимовий, і
 * літній перехід — зона зі збігом лише влітку нам не підходить.
 */
export function matchesStudioTz(): boolean {
  return [new Date("2026-01-15T12:00:00Z"), new Date("2026-07-15T12:00:00Z")]
    .every((d) => {
      const local = new Intl.DateTimeFormat("en-CA", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
      }).format(d);
      const studio = new Intl.DateTimeFormat("en-CA", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
        timeZone: STUDIO_TZ,
      }).format(d);
      return local === studio;
    });
}

export const WEEKDAY_SHORT = ["НД", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];

export const MONTHS_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

export const MONTHS_NOMINATIVE = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

/** Три літери — підписи під стовпчиками річного графіка. */
export const MONTHS_SHORT = [
  "січ",
  "лют",
  "бер",
  "кві",
  "тра",
  "чер",
  "лип",
  "сер",
  "вер",
  "жов",
  "лис",
  "гру",
];

/** Робоче вікно студії — межі денної сітки та база для завантаженості. */
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 20;

/** `2026-08-08` — ключ дня, стабільний до часової зони. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Час наступного візиту курсу — та сама година рівно через тиждень.
 *
 * Курс тейпування — це 3–7 візитів із тижневим кроком, і в переважній
 * більшості випадків наступний припадає на той самий день тижня й ту саму
 * годину. Це заготовка, а не правило: майстриня поправляє дату у формі.
 *
 * `addDays` тут не випадковий: він рахує через `setDate`, тож перехід на
 * літній час зберігає саме годину («о 14:00»), а не рівно 168 астрономічних
 * годин, які зсунули б візит на 13:00 чи 15:00.
 */
export function nextVisitStart(previous: Date, weeks = 1): Date {
  return addDays(previous, 7 * weeks);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Тиждень, що містить дату. Починається з понеділка — так живе Україна. */
export function weekDays(date: Date): Date[] {
  const base = startOfDay(date);
  const shift = (base.getDay() + 6) % 7; // нд=0 → 6, пн=1 → 0
  const start = addDays(base, -shift);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Стрічка дат навколо обраного дня — як у горизонтальному перемикачі. */
export function dateStrip(center: Date, before = 3, after = 10): Date[] {
  const base = startOfDay(center);
  return Array.from({ length: before + after + 1 }, (_, i) =>
    addDays(base, i - before),
  );
}

/** Усі дні місяця плюс добивка до повних тижнів — сітка 6×7. */
export function monthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const shift = (first.getDay() + 6) % 7;
  const start = addDays(first, -shift);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** `Серпень 2026 р.` */
export function monthTitle(d: Date): string {
  return `${MONTHS_NOMINATIVE[d.getMonth()]} ${d.getFullYear()} р.`;
}

/** `8 серпня` */
export function dayTitle(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

/** `10:40` з дати. */
export function timeLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** `10:40–11:10` для запису з тривалістю. */
export function timeRange(start: Date, durationMin: number): string {
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${timeLabel(start)}–${timeLabel(end)}`;
}

/** `30 хв` / `1 година` / `1 год 30 хв` — як у картці запису. */
export function durationLabel(min: number): string {
  if (min < 60) return `${min} хв`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  const hours =
    h === 1 ? "1 година" : h < 5 ? `${h} години` : `${h} годин`;
  return rest ? `${hours} ${rest} хв` : hours;
}

/**
 * Межі періоду для запитів у БД. `end` — ексклюзивна, тож запити пишуться
 * як `gte(start) && lt(end)` без гри з останньою секундою доби.
 */
export function dayRange(d: Date): { start: Date; end: Date } {
  const start = startOfDay(d);
  return { start, end: addDays(start, 1) };
}

export function weekRange(d: Date): { start: Date; end: Date } {
  const days = weekDays(d);
  return { start: days[0], end: addDays(days[6], 1) };
}

export function monthRange(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Що саме сторінка календаря тягне для обраної дати: весь місяць плюс тиждень
 * навколо. Цього досить для всіх чотирьох режимів одразу, тож перемикання
 * День/Тиждень/Місяць не ходить у мережу.
 *
 * Живе тут, а не в `page.tsx`, бо на цей самий діапазон спирається клієнт:
 * він вирішує, чи потрібен новий запит при кроці стрілкою. Дві копії цієї
 * логіки роз'їхались би — і клієнт показував би порожній тиждень, впевнений,
 * що дані вже є.
 */
export function loadedRange(d: Date): { start: Date; end: Date } {
  const month = monthRange(d);
  const week = weekRange(d);
  return {
    start: week.start < month.start ? week.start : month.start,
    end: week.end > month.end ? week.end : month.end,
  };
}

/**
 * Чи повністю вкладається потрібний для дати `d` діапазон у вже завантажений
 * навколо `loadedFor`. Якщо так — усі режими намалюються з наявних даних і
 * похід на сервер зайвий.
 */
export function isRangeLoaded(d: Date, loadedFor: Date): boolean {
  const have = loadedRange(loadedFor);
  const need = loadedRange(d);
  return need.start >= have.start && need.end <= have.end;
}

/**
 * Чи перетинаються два записи в часі. Дотик кінець-у-початок (11:00 після
 * 10:30–11:00) перетином не вважається — інакше щільний графік був би
 * неможливий.
 */
export function overlaps(
  aStart: Date,
  aMin: number,
  bStart: Date,
  bMin: number,
): boolean {
  const aEnd = aStart.getTime() + aMin * 60_000;
  const bEnd = bStart.getTime() + bMin * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

/** `<input type="datetime-local">` не приймає ISO з зоною — потрібен цей вигляд. */
export function toDateTimeLocal(d: Date): string {
  return `${dateKey(d)}T${timeLabel(d)}`;
}

/** Хвилин від опівночі — базова координата денної сітки. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Розкладка денної сітки: блок позиціонується пропорційно часу, а не за
 * рядком-годиною. Завдяки цьому 30-хвилинний сеанс удвічі нижчий за годинний,
 * і початок о 10:40 стоїть саме на 10:40.
 */
export type LaidOut<T> = {
  item: T;
  /** Відступ зверху і висота — у пікселях, від межі робочого вікна. */
  top: number;
  height: number;
  /** Колонка серед тих, що перетинаються, і скільки їх усього. */
  column: number;
  columns: number;
};

/**
 * Розводить накладки по колонках: перетин ділить ширину, а не ховає запис.
 * Групою вважаються всі записи, зчеплені перетином хоча б через сусіда, —
 * інакше сусідні пари розійшлися б на різну ширину й сітка стрибала б.
 */
export function layoutDay<T>(
  items: T[],
  getStart: (item: T) => Date,
  getDuration: (item: T) => number,
  pxPerMinute: number,
  startHour = WORK_START_HOUR,
): LaidOut<T>[] {
  const sorted = [...items].sort(
    (a, b) => getStart(a).getTime() - getStart(b).getTime(),
  );

  const result: LaidOut<T>[] = [];
  let group: T[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    if (group.length === 0) return;

    // Жадібне розкладання: запис іде в першу колонку, що вже звільнилась.
    const columnEnds: number[] = [];
    const placed = group.map((item) => {
      const start = minutesOfDay(getStart(item));
      const end = start + getDuration(item);
      let column = columnEnds.findIndex((e) => e <= start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[column] = end;
      }
      return { item, start, end, column };
    });

    for (const p of placed) {
      result.push({
        item: p.item,
        top: (p.start - startHour * 60) * pxPerMinute,
        height: Math.max((p.end - p.start) * pxPerMinute, 28),
        column: p.column,
        columns: columnEnds.length,
      });
    }

    group = [];
    groupEnd = -Infinity;
  };

  for (const item of sorted) {
    const start = minutesOfDay(getStart(item));
    const end = start + getDuration(item);

    if (group.length > 0 && start >= groupEnd) flush();

    group.push(item);
    groupEnd = Math.max(groupEnd, end);
  }
  flush();

  return result;
}
