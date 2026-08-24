"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { normalizeSlots } from "@/lib/schedule";

/**
 * Редагування робочого графіка.
 *
 * Дати ходять рядками `2026-08-08` — так їх зберігає Postgres (`date`) і так
 * їх шле клієнт. Жодного `new Date()` на шляху навмисно: він перетворив би
 * дату на момент часу, а момент залежить від зони й уміє зсунути день.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

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
 * Перемикає день: закритий відкриває, відкритий закриває.
 *
 * Закриття — це видалення рядка, а не прапорець `is_open`. Графік визначений
 * як білий список (див. міграцію 0008), і другий спосіб сказати «закрито»
 * дав би два стани з однаковим змістом — рядок з `is_open = false` і
 * відсутність рядка, — які довелося б розрізняти в кожному запиті.
 */
export async function toggleWorkingDay(
  locationId: string,
  day: string,
  /** Проміжки для дня, що відкривається. Порожньо — усі три. */
  slots: string[] = [],
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
    const normalized = normalizeSlots(slots);
    const { error } = await db().from("working_days").insert({
      location_id: locationId,
      day,
      // Порожньо — відкриваємо весь день: перемикач має давати робочий день
      // одним тапом, а звужувати проміжки майстриня буде окремо.
      slots: normalized.length > 0 ? normalized : normalizeSlots(["morning", "day", "evening"]),
    });

    if (error) throw new Error(`Не вдалося відкрити день: ${error.message}`);
  }

  revalidate();
}

/**
 * Задає проміжки вже відкритого дня.
 *
 * Знявши останній проміжок, день закриваємо: «робочий день, у який не можна
 * записатись» — стан, якого в графіку бути не має.
 */
export async function setDaySlots(
  locationId: string,
  day: string,
  slots: string[],
): Promise<void> {
  await requireSession();

  if (!DAY_RE.test(day)) throw new Error("Некоректна дата.");
  await assertLocation(locationId);

  const normalized = normalizeSlots(slots);

  if (normalized.length === 0) {
    const { error } = await db()
      .from("working_days")
      .delete()
      .eq("location_id", locationId)
      .eq("day", day);

    if (error) throw new Error(`Не вдалося закрити день: ${error.message}`);
    revalidate();
    return;
  }

  // Upsert по (location_id, day): у таблиці на цю пару є unique, тож день
  // або оновиться, або з'явиться — без гонки між читанням і записом.
  const { error } = await db()
    .from("working_days")
    .upsert(
      { location_id: locationId, day, slots: normalized },
      { onConflict: "location_id,day" },
    );

  if (error) throw new Error(`Не вдалося зберегти проміжки: ${error.message}`);

  revalidate();
}

/**
 * Відкриває або закриває одразу набір днів — «усі суботи місяця», «весь
 * тиждень». Без цього графік на місяць складався б із двадцяти окремих тапів.
 */
export async function bulkSetWorkingDays(
  locationId: string,
  days: string[],
  open: boolean,
): Promise<void> {
  await requireSession();

  const valid = days.filter((d) => DAY_RE.test(d));
  if (valid.length === 0) return;

  await assertLocation(locationId);

  if (open) {
    const all = normalizeSlots(["morning", "day", "evening"]);
    const { error } = await db()
      .from("working_days")
      .upsert(
        valid.map((day) => ({ location_id: locationId, day, slots: all })),
        // ignoreDuplicates: уже відкритий день лишається як є, зі своїми
        // проміжками. Інакше «відкрити місяць» тихо скидало б звужені дні.
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
