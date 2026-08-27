import "server-only";

import { db } from "./client";
import { dateKey, startOfDay } from "@/lib/calendar";
import type { BusySlot } from "@/lib/schedule";

/**
 * Зайняті години — підтверджені записи з журналу майстрині.
 *
 * Читається формою запису, щоб погасити години, на які вже хтось прийде, і
 * тим самим Server Action'ом, що заявку приймає. Один запит і одні правила на
 * обидві сторони: розійдись вони, форма показувала б вільною годину, яку
 * перевірка потім відкидає.
 *
 * Займають слот лише `appointments` — журнал майстрині, а не `requests`.
 * Заявка з сайту це намір: її ще можуть відхилити, і тримати нею годину
 * означало б, що одна людина, яка передумала, закриває слот для всіх решти.
 * Годину гасить те, що майстриня справді підтвердила, поставивши запис.
 *
 * `cancelled` пропускаємо — скасований запис слот звільняє, як і в перевірці
 * накладок у адмінці (`findConflicts`). `no_show` лишається зайнятим: людина
 * не прийшла, але година вже минула, і переписувати минуле не наша справа.
 */

/** Наскільки далеко наперед питаємо — рівно вікно, відкрите для запису. */
const MONTHS_AHEAD = 4;

/**
 * Найдовший сеанс, який ще може перекрити слот на межі вікна.
 *
 * Запит іде по `starts_at`, тож запис, що почався до початку вікна, у вибірку
 * не потрапив би — а перекривати перші години він цілком може. Добу назад із
 * запасом беремо з тих же міркувань, що й `findConflicts`.
 */
const LOOKBEHIND_MS = 24 * 60 * 60_000;

type BusyRow = {
  starts_at: string;
  duration_min: number;
  location: { slug: string } | null;
};

/**
 * Зайняті проміжки по кабінетах: `{ lviv: [...], kyiv: [...] }`.
 *
 * Групуємо саме по кабінету, бо накладка можлива лише в межах одного місця —
 * так само, як це рахує адмінка. Запис у Києві години у Львові не займає.
 */
export async function listBusySlots(): Promise<Record<string, BusySlot[]>> {
  const today = startOfDay(new Date());
  const from = new Date(today.getTime() - LOOKBEHIND_MS);
  const until = new Date(today);
  until.setMonth(until.getMonth() + MONTHS_AHEAD + 1);

  try {
    const { data, error } = await db()
      .from("appointments")
      .select("starts_at, duration_min, location:locations ( slug )")
      .gte("starts_at", from.toISOString())
      .lt("starts_at", until.toISOString())
      .neq("status", "cancelled")
      .order("starts_at");

    if (error) throw new Error(error.message);

    const byLocation: Record<string, BusySlot[]> = {};

    for (const row of (data ?? []) as unknown as BusyRow[]) {
      const slug = row.location?.slug;
      if (!slug) continue;

      // Зона процесу зафіксована студійною (`instrumentation.ts`), тож
      // локальні `getHours`/`getDate` дають саме київський час — той самий,
      // у якому заведено графік і в якому клієнтка обирає годину.
      const start = new Date(row.starts_at);
      const startsAt = start.getHours() * 60 + start.getMinutes();

      (byLocation[slug] ??= []).push({
        day: dateKey(start),
        startsAt,
        endsAt: startsAt + row.duration_min,
      });
    }

    return byLocation;
  } catch (error) {
    /**
     * Помилка читання не має закривати запис.
     *
     * Порожнє «зайняте» означає, що форма покаже всі робочі години — тобто
     * поведеться рівно так, як до цієї функції. Протилежний вибір (вважати
     * зайнятим усе) поклав би форму цілком через збій у побічній перевірці.
     * Дубль у слоті майстриня розрулить, втрачену заявку — ні.
     */
    console.error(
      "[busy] не вдалося прочитати зайняті години:",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}
