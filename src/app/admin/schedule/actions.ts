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

/** Кабінет має існувати: id приходить з клієнта, тож звіряємо з базою. */
async function assertLocation(locationId: string): Promise<void> {
  const { data, error } = await db()
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося перевірити кабінет: ${error.message}`);
  if (!data) throw new Error("Кабінет не знайдено.");
}

function revalidate() {
  revalidatePath("/admin/schedule");
  // Форма запису показує графік, і вона є на кожній публічній сторінці.
  revalidatePath("/", "layout");
}

/**
 * Перемикає день: закритий відкриває з типовими годинами, відкритий закриває.
 *
 * Закриття — це видалення рядка, а не прапорець `is_open`. Графік визначений
 * як білий список (див. міграцію 0008), і другий спосіб сказати «закрито»
 * дав би два стани з однаковим змістом — рядок з `is_open = false` і
 * відсутність рядка, — які довелося б розрізняти в кожному запиті.
 */
export async function toggleWorkingDay(
  locationId: string,
  day: string,
): Promise<void> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");
  await assertLocation(locationId);

  const { data: existing, error: readError } = await db()
    .from("working_days")
    .select("id")
    .eq("location_id", locationId)
    .eq("day", day)
    .maybeSingle();

  if (readError) {
    throw new Error(`Не вдалося прочитати графік: ${readError.message}`);
  }

  if (existing) {
    const { error } = await db()
      .from("working_days")
      .delete()
      .eq("id", existing.id);

    if (error) throw new Error(`Не вдалося закрити день: ${error.message}`);
  } else {
    const { error } = await db().from("working_days").insert({
      location_id: locationId,
      day,
      opens_at: formatTime(DEFAULT_OPENS),
      closes_at: formatTime(DEFAULT_CLOSES),
    });

    if (error) throw new Error(`Не вдалося відкрити день: ${error.message}`);
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

  const { error } = await db()
    .from("working_days")
    .update({ note: note.trim() || null })
    .eq("location_id", locationId)
    .eq("day", day);

  if (error) throw new Error(`Не вдалося зберегти нотатку: ${error.message}`);

  revalidate();
}
