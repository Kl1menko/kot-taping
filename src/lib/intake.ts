/**
 * Анкета запису: канал зв'язку, час дня, параметри матеріалу, протипоказання.
 *
 * Один список на всі три сторони — форму, Server Action і адмінку. Розійдись
 * вони, і валідація почала б відкидати те, що сама ж показала: у формі один
 * набір значень, у перевірці інший.
 *
 * Без React і без звернень до БД — тому покрито тестами без рендера, як
 * calendar.ts та analytics.ts.
 */

// — Канал зв'язку —

export type ContactChannel = "telegram" | "instagram" | "phone";

export const CONTACT_CHANNELS: {
  id: ContactChannel;
  label: string;
  /** Що просимо ввести. Порожньо — каналу вистачає телефону з форми. */
  handleLabel?: string;
  hint: string;
}[] = [
  {
    id: "telegram",
    label: "Telegram",
    handleLabel: "Нік у Telegram",
    hint: "Якщо ніка немає — напишу на номер із форми.",
  },
  {
    id: "instagram",
    label: "Instagram",
    handleLabel: "Нік в Instagram",
    hint: "Саме за ніком я знайду вас, щоб підтвердити запис.",
  },
  {
    id: "phone",
    label: "Телефон",
    hint: "Зателефоную на номер, вказаний вище.",
  },
];

export function isContactChannel(v: string): v is ContactChannel {
  return CONTACT_CHANNELS.some((c) => c.id === v);
}

/**
 * Нік без «@», пробілів і рештки скопійованого посилання.
 *
 * Пацієнти вставляють нік як завгодно: «@nick», «instagram.com/nick/»,
 * «t.me/nick», просто «nick». Майстриня шукає людину саме за ним, тож
 * зберігати треба одну форму, а не те, що вставилось.
 */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:instagram\.com|t\.me|telegram\.me)\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "")
    .trim();
}

/** Нік Instagram/Telegram: літери, цифри, крапка й підкреслення. */
export function isValidHandle(handle: string): boolean {
  return /^[A-Za-z0-9._]{2,32}$/.test(handle);
}

/**
 * Чи потрібен нік для цього каналу. Для 'phone' контакт уже є — телефон.
 */
export function needsHandle(channel: ContactChannel): boolean {
  return channel === "telegram" || channel === "instagram";
}

// — Час дня —

export type PreferredTime = "morning" | "day" | "evening";

/**
 * Проміжки збігаються з робочим вікном студії (WORK_START_HOUR..WORK_END_HOUR
 * у calendar.ts). Точний час у межах проміжку ставить майстриня, коли
 * переносить заявку в календар.
 */
export const PREFERRED_TIMES: {
  id: PreferredTime;
  label: string;
  range: string;
}[] = [
  { id: "morning", label: "Ранок", range: "9:00–12:00" },
  { id: "day", label: "День", range: "12:00–16:00" },
  { id: "evening", label: "Вечір", range: "16:00–20:00" },
];

export function isPreferredTime(v: string): v is PreferredTime {
  return PREFERRED_TIMES.some((t) => t.id === v);
}

export function preferredTimeLabel(id: string): string | null {
  const found = PREFERRED_TIMES.find((t) => t.id === id);
  return found ? `${found.label} (${found.range})` : null;
}

// — Колір тейпу —

/**
 * Кольори з асортименту студії.
 *
 * «Крім передньої поверхні шиї» з маршруту — обмеження не на колір, а на зону;
 * воно вирішується на процедурі, тому тут лише перелік.
 */
export const TAPE_COLORS = [
  "Бежевий",
  "Чорний",
  "Білий",
  "Синій",
  "Рожевий",
  "Блакитний",
  "Зелений",
  "На ваш розсуд",
] as const;

type TapeColor = (typeof TAPE_COLORS)[number];

export function isTapeColor(v: string): v is TapeColor {
  return (TAPE_COLORS as readonly string[]).includes(v);
}

// — Протипоказання —

/**
 * Абсолютні протипоказання — ті, за яких процедуру не роблять без окремої
 * розмови. Це не повна анкета: повну майстриня надсилає перед візитом. Тут
 * лише те, що має спливти ДО запису, а не після двох днів очікування.
 *
 * Відмічене протипоказання запис не блокує: рішення медичне, і приймає його
 * майстриня. Заявка приходить із прапорцем — див. `needsReview`.
 */
export const CONTRAINDICATIONS: { id: string; label: string }[] = [
  { id: "pregnancy", label: "Вагітність або період лактації" },
  { id: "oncology", label: "Онкологічні захворювання" },
  { id: "thrombosis", label: "Тромбоз, тромбофлебіт, варикоз у гострій стадії" },
  { id: "acute", label: "Гострі запалення, підвищена температура" },
  { id: "skin", label: "Пошкодження або захворювання шкіри в зоні роботи" },
  { id: "allergy", label: "Алергія на акрил чи клейкі основи" },
];

export function isContraindication(id: string): boolean {
  return CONTRAINDICATIONS.some((c) => c.id === id);
}

/** Заявка потребує узгодження, якщо відмічено бодай одне протипоказання. */
export function needsReview(ids: readonly string[]): boolean {
  return ids.length > 0;
}

/** Людські підписи для Telegram-сповіщення та адмінки. */
export function contraindicationLabels(ids: readonly string[]): string[] {
  return ids
    .map((id) => CONTRAINDICATIONS.find((c) => c.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

// — Зріст —

/**
 * Межі — захист від друкарської помилки («16» замість «160», «1680»), а не
 * медична норма. Дзеркалять check-констрейнт у міграції 0005.
 */
export const HEIGHT_MIN_CM = 100;
export const HEIGHT_MAX_CM = 250;

/**
 * Зріст із форми. Поле необов'язкове, тож порожній рядок — це не помилка, а
 * «не вказано»; помилка — лише коли введено щось, що не є зростом.
 */
export function parseHeight(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < HEIGHT_MIN_CM || n > HEIGHT_MAX_CM) {
    return { ok: false };
  }
  return { ok: true, value: n };
}
