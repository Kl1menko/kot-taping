/**
 * Набори для самотейпування вдома — другий продукт студії.
 *
 * Процедура і набір різні не лише за суттю: у набору немає дати й кабінету,
 * зате є доставка, оплата й накладна. Тому окремий модуль, а не гілка в
 * `intake.ts`.
 *
 * Спільне з анкетою запису — лише канал зв'язку: майстриня однаково шукає
 * людину за ніком. Його й переїкспортовуємо з `intake.ts`, а не дублюємо.
 */

export type KitZone = "neck" | "face";

/**
 * Набір у тому вигляді, в якому його бачить сайт. Дзеркалить `kits` із
 * міграції 0006 — ціна редагується в адмінці, тож джерело правди в базі.
 */
export type Kit = {
  slug: string;
  title: string;
  summary: string;
  price: number;
  priceFrom: boolean;
  zone: KitZone;
  /** Чи можна обрати колір. Для обличчя тейп лише білий. */
  allowsColor: boolean;
  needsMeasurements: boolean;
};

/**
 * Кольори наборів. Той самий асортимент, що й на процедурах, — тому список
 * один, у `intake.ts`; тут лише пояснення, чому обличчю вибору не дають.
 */
export const FACE_COLOR_NOTE = "Для обличчя використовується білий тейп.";

/**
 * Країни доставки. Питаємо країну, а не повну адресу: вартість worldwide-
 * доставки різна, і майстрині треба знати її ще до розмови, а точну адресу
 * вона бере в чаті вже після оплати — так само, як у маршруті.
 */
export const DELIVERY_COUNTRIES = [
  "Україна",
  "Польща",
  "Німеччина",
  "Чехія",
  "Велика Британія",
  "США",
  "Канада",
  "Інша країна",
] as const;

type DeliveryCountry = (typeof DELIVERY_COUNTRIES)[number];

export function isDeliveryCountry(v: string): v is DeliveryCountry {
  return (DELIVERY_COUNTRIES as readonly string[]).includes(v);
}

/** Доставка за межі України — впливає на вартість, тож потрібна окремо. */
export function isWorldwide(country: string): boolean {
  return country !== "Україна";
}

export type KitOrderStatus =
  | "new"
  | "confirmed"
  | "paid"
  | "shipped"
  | "cancelled";

/**
 * Кроки ручної частини маршруту. Порядок тут же й задає порядок кнопок в
 * адмінці, тож масив, а не Record: у Record порядок ключів не гарантія.
 */
export const KIT_ORDER_FLOW: {
  id: KitOrderStatus;
  label: string;
  /** Що майстриня робить на цьому кроці — підказка в адмінці. */
  action?: string;
}[] = [
  { id: "new", label: "Нове", action: "Зв'язатися й уточнити деталі" },
  { id: "confirmed", label: "Узгоджено", action: "Надіслати реквізити на оплату" },
  { id: "paid", label: "Оплачено", action: "Взяти адресу, спакувати, відправити" },
  { id: "shipped", label: "Відправлено", action: "Надіслати відео-інструкцію" },
  { id: "cancelled", label: "Скасовано" },
];

export const KIT_ORDER_LABEL: Record<KitOrderStatus, string> =
  Object.fromEntries(
    KIT_ORDER_FLOW.map((s) => [s.id, s.label]),
  ) as Record<KitOrderStatus, string>;

export function isKitOrderStatus(v: string): v is KitOrderStatus {
  return KIT_ORDER_FLOW.some((s) => s.id === v);
}

/**
 * Наступний крок у роботі із замовленням, або null — далі нічого робити.
 *
 * «Скасовано» — вихід із потоку, а не крок у ньому: після нього наступного
 * немає, і з нього ж не можна «просунутись» далі.
 */
export function nextKitStatus(
  current: KitOrderStatus,
): KitOrderStatus | null {
  if (current === "cancelled" || current === "shipped") return null;

  const order: KitOrderStatus[] = ["new", "confirmed", "paid", "shipped"];
  const i = order.indexOf(current);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

/** Замовлення в роботі — те, що має бути на очах в адмінці. */
export function isOpenKitOrder(status: KitOrderStatus): boolean {
  return status !== "shipped" && status !== "cancelled";
}

/**
 * Накладна потрібна саме на відправленні: раніше її ще не існує, а показувати
 * порожнє поле на кожному кроці — шум.
 */
export function needsTracking(status: KitOrderStatus): boolean {
  return status === "shipped";
}

/**
 * Набори з коду — seed для міграції 0006 і відкат для лендінгу.
 *
 * Та сама обіцянка, що й у `public-services.ts`: вітрина не лягає через
 * несконфігуровану базу. Ціни тут нульові навмисно — їх задає майстриня в
 * адмінці, а `priceFrom` показує «уточнюється» замість вигаданої суми.
 */
export const KITS: Kit[] = [
  {
    slug: "neck",
    title: "Шия",
    summary: "Набір для самостійного тейпування шиї. Колір на вибір.",
    price: 0,
    priceFrom: true,
    zone: "neck",
    allowsColor: true,
    needsMeasurements: false,
  },
  {
    slug: "face-full",
    title: "Обличчя повністю",
    summary: "Чоло, рот і щоки — повний набір. Тейп білий.",
    price: 0,
    priceFrom: true,
    zone: "face",
    allowsColor: false,
    needsMeasurements: true,
  },
  {
    slug: "face-forehead",
    title: "Чоло",
    summary: "Окрема зона: чоло. Тейп білий.",
    price: 0,
    priceFrom: true,
    zone: "face",
    allowsColor: false,
    needsMeasurements: true,
  },
  {
    slug: "face-mouth",
    title: "Рот",
    summary: "Окрема зона: рот. Тейп білий.",
    price: 0,
    priceFrom: true,
    zone: "face",
    allowsColor: false,
    needsMeasurements: true,
  },
  {
    slug: "face-cheeks",
    title: "Щоки",
    summary: "Окрема зона: щоки. Тейп білий.",
    price: 0,
    priceFrom: true,
    zone: "face",
    allowsColor: false,
    needsMeasurements: true,
  },
];

/**
 * Ціна набору словами. Нуль означає «ще не задана в адмінці» — тоді чесніше
 * сказати «уточнюється», ніж показати «0 ₴».
 */
export function formatKitPrice(kit: Kit): string {
  if (kit.price <= 0) return "Вартість уточнюється";
  return `${kit.priceFrom ? "від " : ""}${kit.price.toLocaleString("uk-UA")} ₴`;
}
