/**
 * Що майстрині робити просто зараз — головне питання головного екрана.
 *
 * До цього модуля «Сьогодні» відкривалося чотирма лічильниками: заявки,
 * записи, клієнти, послуги. Два останніх нічого не вимагали — це довідка, яка
 * займала верх екрана там, де погляд шукає дію. А те, що справді потребувало
 * уваги (заявка без відповіді, замовлення, за яке ще не взялися), лежало по
 * різних вкладках, і про нього треба було пам'ятати самій.
 *
 * Тут ці розкидані сигнали зводяться в один список справ. Без React і без
 * звернень до БД — рахунки приходять готовими, а модуль лише вирішує, що з
 * них варте уваги і в якому порядку.
 */

import { KIT_ORDER_FLOW, type KitOrderStatus } from "./kits.ts";

/** Куди веде справа. Той самий маршрут, що й у навігації. */
export type TaskHref =
  | "/admin/requests"
  | "/admin/kits"
  | "/admin/calendar";

export type Task = {
  id: string;
  /** Головний рядок — що саме треба зробити. */
  title: string;
  /** Уточнення під заголовком; порожньо, якщо заголовок самодостатній. */
  hint?: string;
  href: TaskHref;
  /**
   * Наскільки терміново. Впливає і на порядок, і на вигляд: `urgent` малюється
   * акцентом, решта — спокійно.
   */
  tone: "urgent" | "normal";
  /** Скільки таких справ. Показуємо число, коли їх більше однієї. */
  count: number;
};

/** Множина «заявок» українською: 1 заявка, 2 заявки, 5 заявок. */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export type AgendaInput = {
  /** Заявки зі статусом `new` — на них ще не відповіли. */
  newRequests: number;
  /** Замовлення наборів у роботі, за статусами. */
  kitOrders: Partial<Record<KitOrderStatus, number>>;
  /** Записів на сьогодні попереду (тих, що ще не почались). */
  upcomingToday: number;
  /** Заявки з відміченими протипоказаннями — їх треба узгодити. */
  flaggedRequests: number;
};

/**
 * Список справ, від найтерміновішого.
 *
 * Порядок не за розділами, а за терміновістю: спершу те, де людина чекає на
 * відповідь, потім те, що можна зробити сьогодні. Порожній список — це не
 * помилка, а найкращий можливий стан, і екран має сказати саме так.
 */
export function buildAgenda(input: AgendaInput): Task[] {
  const tasks: Task[] = [];

  // Протипоказання — попереду решти заявок: тут питання не про запис, а про
  // те, чи можна взагалі робити процедуру.
  if (input.flaggedRequests > 0) {
    const n = input.flaggedRequests;
    tasks.push({
      id: "flagged",
      title: `${n} ${plural(n, "заявка потребує", "заявки потребують", "заявок потребують")} узгодження`,
      hint: "Клієнт відмітив протипоказання — треба обговорити до запису.",
      href: "/admin/requests",
      tone: "urgent",
      count: n,
    });
  }

  // Нові заявки без відміченого протипоказання: на них просто ще не
  // відповіли, і людина чекає.
  const plainRequests = Math.max(0, input.newRequests - input.flaggedRequests);
  if (plainRequests > 0) {
    tasks.push({
      id: "requests",
      title: `${plainRequests} ${plural(plainRequests, "нова заявка", "нові заявки", "нових заявок")}`,
      hint: "Підтвердити запис і надіслати деталі.",
      href: "/admin/requests",
      tone: "urgent",
      count: plainRequests,
    });
  }

  // Замовлення наборів: кожен статус — свій крок, і підказку до нього вже
  // описує KIT_ORDER_FLOW. Дублювати ці формулювання тут означало б тримати
  // їх синхронними вручну.
  for (const step of KIT_ORDER_FLOW) {
    if (step.id === "cancelled" || step.id === "shipped") continue;

    const n = input.kitOrders[step.id] ?? 0;
    if (n === 0) continue;

    tasks.push({
      id: `kits-${step.id}`,
      title: `${n} ${plural(n, "замовлення набору", "замовлення наборів", "замовлень наборів")}`,
      hint: step.action,
      href: "/admin/kits",
      // Нове замовлення — людина чекає на відповідь; далі це вже робота в
      // процесі, вона терпить.
      tone: step.id === "new" ? "urgent" : "normal",
      count: n,
    });
  }

  return tasks;
}

/**
 * Рядок про сьогоднішній день — те, що майстриня хоче знати першим.
 *
 * Окремо від списку справ: це не задача, а стан. «Сьогодні 5 записів,
 * наступний о 14:30» не вимагає дії, але задає рамку всьому екрану.
 */
export function todaySummary(
  total: number,
  upcoming: number,
  nextTime: string | null,
): string {
  if (total === 0) return "Сьогодні записів немає";

  const base = `${total} ${plural(total, "запис", "записи", "записів")} сьогодні`;

  if (upcoming === 0) return `${base} — усі позаду`;
  if (nextTime) return `${base}, наступний о ${nextTime}`;
  return base;
}
