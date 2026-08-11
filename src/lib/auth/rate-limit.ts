import "server-only";

import { db } from "@/lib/db/client";

/**
 * Стеля перебору пароля адмінки.
 *
 * Лічильник живе в базі, а не в пам'яті процесу. На Vercel пам'ять процесу —
 * не сховище: кожен холодний старт піднімає новий інстанс із порожньою Map,
 * тож попередній ліміт «8 спроб на 10 хвилин» обнулявся разом із ним і
 * перебір ішов рівним темпом, ніколи не впираючись у межу.
 *
 * Рахує SQL-функція `register_login_attempt` (міграція 0004) — атомарно, бо
 * «прочитати → додати → записати» з застосунку дає гонку між паралельними
 * спробами.
 */

const MAX_ATTEMPTS = 8;
const WINDOW_S = 10 * 60;

/**
 * Запасний лічильник у пам'яті — на випадок, коли міграцію 0004 ще не
 * виконано (README вимагає застосовувати міграції вручну в SQL-редакторі).
 *
 * Він слабший за базу рівно тим, чим був старий код, і саме тому не є
 * основним. Але лишити вхід зовсім без стелі, поки міграція не доїхала,
 * гірше: краще погана стеля, ніж жодної.
 */
const local = new Map<string, { count: number; until: number }>();

function localLimited(key: string): boolean {
  const now = Date.now();
  const entry = local.get(key);
  if (!entry || now > entry.until) {
    local.set(key, { count: 1, until: now + WINDOW_S * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

/**
 * Реєструє спробу входу й каже, чи вона вже за межею ліміту.
 *
 * Помилку бази не пропускаємо назовні: якщо лічильник недоступний, вхід має
 * лишатися можливим — інакше збій у другорядній таблиці замикає майстриню
 * поза адмінкою. Падаємо на локальний лічильник і рахуємо далі.
 */
export async function registerLoginAttempt(key = "admin"): Promise<boolean> {
  try {
    const { data, error } = await db().rpc("register_login_attempt", {
      attempt_key: key,
      max_attempts: MAX_ATTEMPTS,
      window_seconds: WINDOW_S,
    });

    if (error) throw new Error(error.message);
    return data === true;
  } catch {
    return localLimited(key);
  }
}

/**
 * Скидає лічильник — після вдалого входу.
 *
 * Мовчазна на помилках: невдале скидання означає лише те, що майстриня досі
 * має ліміт до кінця вікна. Вона вже увійшла, тож валити на цьому вхід не варто.
 */
export async function clearLoginAttempts(key = "admin"): Promise<void> {
  local.delete(key);
  try {
    await db().from("login_attempts").delete().eq("key", key);
  } catch {
    // Лічильник сам згасне, коли вікно скінчиться.
  }
}
