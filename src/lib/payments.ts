/**
 * Оплата через monobank-еквайринг — домен.
 *
 * Тут немає ні мережі, ні React: лише статуси, суми й правила переходів, які
 * можна перевірити тестом. Виклики API живуть у `lib/mono.ts`, читання з бази —
 * у `lib/db/payments.ts`.
 *
 * Суми всередині — копійки, як їх розуміє monobank: 2200 ₴ = 220000. Гривні
 * з'являються лише на межі — у формі та в підписах.
 */

/** Стани рахунку з документації monobank. Порядок — від створення до кінця. */
export type PaymentStatus =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

const STATUSES: PaymentStatus[] = [
  "created",
  "processing",
  "hold",
  "success",
  "failure",
  "reversed",
  "expired",
];

export function isPaymentStatus(v: string): v is PaymentStatus {
  return (STATUSES as string[]).includes(v);
}

/** Підписи для адмінки. Мова майстрині, а не банку. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  created: "Очікує оплати",
  processing: "Обробляється",
  hold: "Заблоковано на картці",
  success: "Оплачено",
  failure: "Не пройшла",
  reversed: "Повернено",
  expired: "Протерміновано",
};

/**
 * Оплачено остаточно.
 *
 * `hold` сюди не входить навмисно: гроші лише заблоковані на картці й ще не
 * списані. Ми створюємо рахунки як `debit`, тож у нормальному потоці цього
 * статусу не буває — але якщо він з'явиться, вважати його оплатою не можна.
 */
export function isPaid(status: PaymentStatus): boolean {
  return status === "success";
}

/**
 * Рахунок ще живий — має сенс показувати QR і чекати оплати.
 *
 * `expired` окремо не перевіряємо за часом: банк сам переведе рахунок у цей
 * статус і повідомить вебхуком. Довіряти власному годиннику тут гірше —
 * розбіжність у хвилину показала б «протерміновано» на робочому рахунку.
 */
export function isPending(status: PaymentStatus): boolean {
  return status === "created" || status === "processing" || status === "hold";
}

/** Кінцевий стан — далі банк уже нічого не змінить. */
export function isFinal(status: PaymentStatus): boolean {
  return !isPending(status);
}

/**
 * Чи можна виставляти новий рахунок.
 *
 * Поки старий живий — не можна: клієнтка отримала б два QR і не знала, який
 * оплачувати. Після невдачі чи протермінування — можна й треба.
 */
export function canReissue(statuses: PaymentStatus[]): boolean {
  if (statuses.some(isPaid)) return false;
  return !statuses.some(isPending);
}

/** Гривні → копійки. Округлення до цілої копійки, бо банк дробових не знає. */
export function toMinor(hryvnia: number): number {
  return Math.round(hryvnia * 100);
}

function toMajor(minor: number): number {
  return minor / 100;
}

/** «220000» → «2 200 ₴». Той самий вигляд, що й у прайсі. */
export function formatAmount(minor: number): string {
  const hryvnia = toMajor(minor);
  // Копійки показуємо лише коли вони є: «2 200 ₴» читається краще за
  // «2 200,00 ₴», а в прайсі студії круглі суми.
  const fractionDigits = Number.isInteger(hryvnia) ? 0 : 2;
  return `${hryvnia.toLocaleString("uk-UA", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  })} ₴`;
}

/**
 * Перевірка суми перед відправкою в банк.
 *
 * Верхня межа — не вимога monobank, а запобіжник від описки: у прайсі студії
 * найдорожча позиція 7200 ₴, тож рахунок на 100 000 ₴ майже напевно означає,
 * що хтось увів копійки замість гривень.
 */
const MAX_AMOUNT_UAH = 100_000;

export function validateAmount(hryvnia: number): string | null {
  if (!Number.isFinite(hryvnia)) return "Вкажіть суму.";
  if (hryvnia <= 0) return "Сума має бути більшою за нуль.";
  if (hryvnia > MAX_AMOUNT_UAH) {
    return `Сума завелика — максимум ${MAX_AMOUNT_UAH.toLocaleString("uk-UA")} ₴.`;
  }
  // Копійки приймаємо, дрібніше — ні: 10.005 ₴ банк усе одно округлить, і
  // списана сума розійдеться з тією, що майстриня бачила на екрані.
  // Похибка подвійної точності (10.07 * 100 = 1006.9999…) тут не завадить:
  // епсилон ловить саме її, а не реальну третю цифру після коми.
  if (Math.abs(hryvnia * 100 - Math.round(hryvnia * 100)) > 1e-6) {
    return "Сума не може бути дрібнішою за копійку.";
  }
  return null;
}

/**
 * Скільки рахунок живе.
 *
 * Доба — достатньо, щоб клієнтка спокійно оплатила ввечері, і достатньо мало,
 * щоб протермінований QR не ходив у переписці тижнями. Це ж значення за
 * замовчуванням у monobank, але задаємо явно: мовчазні дефолти чужого API
 * змінюються без нашого відома.
 */
export const INVOICE_VALIDITY_SEC = 24 * 60 * 60;

/**
 * Призначення платежу — те, що клієнтка побачить у банківському застосунку.
 *
 * Без назви студії рядок «Обличчя + шия» у виписці виглядає загадково, тому
 * назва йде першою.
 */
export function paymentDestination(title: string): string {
  return `Kotova Taping — ${title}`;
}
