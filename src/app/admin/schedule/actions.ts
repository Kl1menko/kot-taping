"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { formatTime, parseTime } from "@/lib/schedule";

/**
 * Редагування робочого графіка.
 *
 * Дати ходять рядками `2026-08-08` — так їх зберігає Postgres (`date`) і так
 * їх шле клієнт. Жодного `new Date()` на шляху навмисно: він перетворив би
 * дату на момент часу, а момент залежить від зони й уміє зсунути день.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Типові години, якими відкривається день одним тапом. */
const DEFAULT_OPENS = 10 * 60;
const DEFAULT_CLOSES = 18 * 60;

/** Чи це скарга на відсутню таблицю відрізків (міграція 0013 ще не виконана). */
function isMissingIntervals(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "PGRST200" ||
    error.code === "42P01" ||
    /working_day_intervals/.test(error.message ?? "")
  );
}

/**
 * Кабінет має існувати: id приходить з клієнта, тож звіряємо з базою.
 *
 * Відповідь кешуємо на час запиту й трохи далі: кабінетів два, змінюються вони
 * раз на рік, а перевірка стояла окремим круговим рейсом перед кожним тапом по
 * числу. На проставлянні місяця це два десятки зайвих запитів поспіль — саме
 * та затримка, через яку сітка «думала» після кожного дотику.
 */
const locationCache = new Map<string, { ok: boolean; at: number }>();
const LOCATION_TTL_MS = 60_000;

async function assertLocation(locationId: string): Promise<void> {
  const cached = locationCache.get(locationId);
  if (cached && Date.now() - cached.at < LOCATION_TTL_MS) {
    if (!cached.ok) throw new Error("Кабінет не знайдено.");
    return;
  }

  const { data, error } = await db()
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося перевірити кабінет: ${error.message}`);

  locationCache.set(locationId, { ok: Boolean(data), at: Date.now() });
  if (!data) throw new Error("Кабінет не знайдено.");
}

/**
 * Скидання кешу після правки графіка.
 *
 * Адмінку скидаємо завжди — майстриня має бачити свій щойно зроблений запис.
 *
 * Публічне дерево коштує дорожче: сторінки послуг і міст пререндерені (SSG), і
 * `revalidatePath("/", "layout")` знецінює їх усі одразу. На кожному тапі по
 * числу це перегенерація всього сайту — двадцять разів поспіль, поки майстриня
 * проставляє місяць, і саме звідси бралась пауза після кожного дотику.
 *
 * Масові дії роблять один скид на весь набір днів замість одного на день
 * (`bulk: true`), а поштучні тапи скидають публічну частину як і раніше:
 * відкласти її на таймер не можна — на Vercel інстанс засинає одразу після
 * відповіді, і відкладений скид міг би не виконатись зовсім, лишивши у формі
 * запису вчорашній графік.
 */
function revalidate() {
  revalidatePath("/admin/schedule");
  // Форма запису показує графік, і вона є на кожній публічній сторінці.
  revalidatePath("/", "layout");
}

/**
 * Перемикає день: закритий відкриває з типовими годинами, відкритий закриває.
 *
 * Поточний стан приходить параметром, а не вичитується: клієнт його вже знає,
 * і зайвий SELECT перед кожним записом відчувався саме там, де днів багато.
 *
 * Закриття — це видалення рядка, а не прапорець `is_open`. Графік визначений
 * як білий список (див. міграцію 0008), і другий спосіб сказати «закрито»
 * дав би два стани з однаковим змістом — рядок з `is_open = false` і
 * відсутність рядка, — які довелося б розрізняти в кожному запиті.
 */
export async function toggleWorkingDay(
  locationId: string,
  day: string,
  /** Чи відкритий день зараз — з боку клієнта, який щойно намалював сітку. */
  open: boolean,
): Promise<void> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");
  await assertLocation(locationId);

  // Стан дня знає клієнт — він щойно намалював сітку з цього ж графіка, — тож
  // питати його ще раз у бази означало зайвий круговий рейс перед кожним
  // записом. Раніше тап коштував три послідовні запити (сесія, кабінет,
  // читання) плюс сам запис; лишився один.
  if (open) {
    const { error } = await db()
      .from("working_days")
      .delete()
      .eq("location_id", locationId)
      .eq("day", day);

    if (error) throw new Error(`Не вдалося закрити день: ${error.message}`);
  } else {
    const { data, error } = await db()
      .from("working_days")
      .upsert(
        {
          location_id: locationId,
          day,
          opens_at: formatTime(DEFAULT_OPENS),
          closes_at: formatTime(DEFAULT_CLOSES),
        },
        // Клієнт міг помилитись щодо стану — графік правили з іншого
        // пристрою. Тоді день просто лишається відкритим зі своїми годинами,
        // а не валиться на unique.
        { onConflict: "location_id,day", ignoreDuplicates: false },
      )
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`Не вдалося відкрити день: ${error.message}`);

    // Новий день отримує один типовий відрізок: без нього він був би
    // відкритим, але порожнім — у формі показувався б, а часу не пропонував.
    if (data) await ensureDefaultInterval(data.id);
  }

  revalidate();
}

/**
 * Задає години вже відкритого дня.
 *
 * Перевірку меж робимо тут, а не покладаємось на констрейнт: помилка бази
 * прилетіла б майстрині як «violates check constraint», а не як зрозуміле
 * «кінець має бути пізніше початку».
 */
export async function setDayHours(
  locationId: string,
  day: string,
  opensAt: string,
  closesAt: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");

  const opens = parseTime(opensAt);
  const closes = parseTime(closesAt);

  if (opens === null || closes === null) {
    return { ok: false, message: "Час у форматі 10:00." };
  }
  if (closes <= opens) {
    return { ok: false, message: "Кінець має бути пізніше початку." };
  }

  await assertLocation(locationId);

  // Upsert по (location_id, day): у таблиці на цю пару є unique, тож день
  // або оновиться, або з'явиться — без гонки між читанням і записом.
  const { error } = await db()
    .from("working_days")
    .upsert(
      {
        location_id: locationId,
        day,
        opens_at: formatTime(opens),
        closes_at: formatTime(closes),
      },
      { onConflict: "location_id,day" },
    );

  if (error) {
    return { ok: false, message: `Не вдалося зберегти: ${error.message}` };
  }

  revalidate();
  return { ok: true };
}

/**
 * Відкриває або закриває одразу набір днів — «усі суботи місяця», «весь
 * тиждень». Без цього графік на місяць складався б із двадцяти окремих тапів.
 */
export async function bulkSetWorkingDays(
  locationId: string,
  days: string[],
  open: boolean,
  /** Години для днів, що відкриваються. Порожньо — типові. */
  hours?: { opensAt: string; closesAt: string },
): Promise<void> {
  await requireSession();

  const valid = days.filter((d) => DAY_RE.test(d));
  if (valid.length === 0) return;

  await assertLocation(locationId);

  if (open) {
    const opens = hours ? parseTime(hours.opensAt) : null;
    const closes = hours ? parseTime(hours.closesAt) : null;
    const useOpens = opens !== null && closes !== null && closes > opens ? opens : DEFAULT_OPENS;
    const useCloses = opens !== null && closes !== null && closes > opens ? closes : DEFAULT_CLOSES;

    const { error } = await db()
      .from("working_days")
      .upsert(
        valid.map((day) => ({
          location_id: locationId,
          day,
          opens_at: formatTime(useOpens),
          closes_at: formatTime(useCloses),
        })),
        // ignoreDuplicates: уже відкритий день лишається зі своїми годинами.
        // Інакше «відкрити місяць» тихо скидало б удень налаштовані винятки.
        { onConflict: "location_id,day", ignoreDuplicates: true },
      );

    if (error) throw new Error(`Не вдалося відкрити дні: ${error.message}`);
  } else {
    const { error } = await db()
      .from("working_days")
      .delete()
      .eq("location_id", locationId)
      .in("day", valid);

    if (error) throw new Error(`Не вдалося закрити дні: ${error.message}`);
  }

  revalidate();
}

/** Нотатка майстрині до дня. Клієнтка її не бачить. */
export async function setDayNote(
  locationId: string,
  day: string,
  note: string,
): Promise<void> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");

  // `select()` після `update`: нотатка чіпляється до вже відкритого дня, і
  // якщо рядка немає — день закрили з іншого пристрою — `update` мовчки
  // оновив би нуль рядків і відрапортував успіх. Майстриня бачила б
  // збережену нотатку, якої в базі немає.
  const { data, error } = await db()
    .from("working_days")
    .update({ note: note.trim() || null })
    .eq("location_id", locationId)
    .eq("day", day)
    .select("id");

  if (error) throw new Error(`Не вдалося зберегти нотатку: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("День уже закритий — нотатку нема до чого чіпляти.");
  }

  revalidate();
}

/**
 * Дати дню типовий відрізок, якщо в нього немає жодного.
 *
 * Викликається там, де день щойно з'явився. Наявні відрізки не чіпаємо: день
 * могли відкрити повторно (наприклад, «відкрити місяць» поверх налаштованого),
 * і скидати вручну заведену перерву це не має.
 */
async function ensureDefaultInterval(workingDayId: string): Promise<void> {
  const { data, error } = await db()
    .from("working_day_intervals")
    .select("id")
    .eq("working_day_id", workingDayId)
    .limit(1);

  // Код їде на прод раніше, ніж хтось виконає міграцію 0013. У цьому вікні
  // день лишається з одним відрізком — своїми ж межами, — і відкривати його
  // це не заважає. Валитись тут означало б не дати відкрити жоден день.
  if (error && isMissingIntervals(error)) {
    console.warn(
      "[schedule] немає таблиці working_day_intervals — виконайте міграцію 0013.",
    );
    return;
  }
  if (error) {
    throw new Error(`Не вдалося прочитати відрізки: ${error.message}`);
  }
  if (data && data.length > 0) return;

  const { error: insertError } = await db()
    .from("working_day_intervals")
    .insert({
      working_day_id: workingDayId,
      opens_at: formatTime(DEFAULT_OPENS),
      closes_at: formatTime(DEFAULT_CLOSES),
    });

  if (insertError) {
    throw new Error(`Не вдалося створити відрізок: ${insertError.message}`);
  }
}

/** id відкритого дня, або null якщо він закритий. */
async function findDayId(
  locationId: string,
  day: string,
): Promise<string | null> {
  const { data, error } = await db()
    .from("working_days")
    .select("id")
    .eq("location_id", locationId)
    .eq("day", day)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати графік: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Замінює всі відрізки дня на передані.
 *
 * Саме замінює, а не доповнює: лист дня показує повний їх набір, і зберегти
 * там «те, що бачу» має означати рівно те, що бачу. Часткові правки давали б
 * стан, у якому прибраний з екрана відрізок лишався в базі.
 *
 * Перевірки — тут, а не на констрейнтах: «violates exclusion constraint»
 * майстрині нічого не пояснює, а «Відрізки перетинаються» — пояснює.
 */
export async function setDayIntervals(
  locationId: string,
  day: string,
  intervals: { opensAt: string; closesAt: string }[],
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");
  if (intervals.length === 0) {
    return { ok: false, message: "Лишіть хоча б один відрізок." };
  }

  const parsed: { opensAt: number; closesAt: number }[] = [];
  for (const { opensAt, closesAt } of intervals) {
    const opens = parseTime(opensAt);
    const closes = parseTime(closesAt);

    if (opens === null || closes === null) {
      return { ok: false, message: "Час у форматі 10:00." };
    }
    if (closes <= opens) {
      return { ok: false, message: "Кінець має бути пізніше початку." };
    }
    parsed.push({ opensAt: opens, closesAt: closes });
  }

  // Перекриття ловимо до запису: `exclude` у базі відкинув би лише один рядок
  // з пачки, і день лишився б наполовину збереженим.
  const sorted = [...parsed].sort((a, b) => a.opensAt - b.opensAt);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].opensAt < sorted[i - 1].closesAt) {
      return { ok: false, message: "Відрізки перетинаються." };
    }
  }

  await assertLocation(locationId);

  const dayId = await findDayId(locationId, day);
  if (!dayId) {
    return { ok: false, message: "День закритий — спершу відкрийте його." };
  }

  // Знести й записати наново: набір малий (одиниці рядків), а різницевий
  // апдейт тут коштував би більше коду, ніж економив запитів.
  const { error: clearError } = await db()
    .from("working_day_intervals")
    .delete()
    .eq("working_day_id", dayId);

  if (clearError) {
    if (isMissingIntervals(clearError)) {
      return {
        ok: false,
        message: "Кілька відрізків стануть доступні після оновлення бази.",
      };
    }
    return { ok: false, message: `Не вдалося зберегти: ${clearError.message}` };
  }

  const { error } = await db()
    .from("working_day_intervals")
    .insert(
      sorted.map((i) => ({
        working_day_id: dayId,
        opens_at: formatTime(i.opensAt),
        closes_at: formatTime(i.closesAt),
      })),
    );

  if (error) {
    return { ok: false, message: `Не вдалося зберегти: ${error.message}` };
  }

  revalidate();
  return { ok: true };
}
