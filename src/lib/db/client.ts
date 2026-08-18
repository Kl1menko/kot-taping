import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

/**
 * Єдиний вхід до бази — під service-role ключем, тобто в обхід RLS.
 *
 * Це безпечно рівно доти, доки клієнт не залишає сервер: `server-only` ловить
 * випадковий імпорт із Client Component на етапі збірки. Оскільки RLS нас тут
 * не захищає, кожна операція має сама перевіряти сесію — див. `requireSession`
 * у @/lib/auth/session.
 */

let cached: ReturnType<typeof create> | null = null;

/** Скільки чекаємо на базу, перш ніж вважати запит зірваним. */
const TIMEOUT_MS = 8_000;

/**
 * Запит із повтором на зрив зв'язку.
 *
 * На Vercel сторінки адмінки — серверлес-функції, і на холодному старті
 * перший вихід у мережу іноді падає з `TypeError: fetch failed`: DNS або TLS
 * не встигають піднятися. Сторінка при цьому валиться цілком, і майстриня
 * бачить екран помилки замість списку справ — саме так і сталося на `/admin`,
 * який відкриває найбільше з'єднань одночасно (чотири проти двох на решті
 * екранів), тож шанс зачепити цей збій там найвищий.
 *
 * Повторюємо лише мережеві зриви. Відповідь бази з будь-яким статусом —
 * це вже відповідь: 4xx повторювати безглуздо, а 5xx означає, що запит міг
 * і виконатись. Повтор тут зробив би подвійну вставку.
 *
 * Дві спроби, пауза 150 мс: пробій цього роду або зникає одразу, або це
 * справжня недоступність, і тримати майстриню в очікуванні довше немає сенсу.
 */
async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;

      // Скасування ззовні — не збій зв'язку: Next обриває запит, коли
      // навігація вже нікому не потрібна. Повторювати нічого.
      if (init?.signal?.aborted) throw error;

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }

  throw lastError;
}

function create() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: {
      // Сервер не має ані де зберігати сесію, ані потреби її оновлювати:
      // автентифікація адмінки своя, а ключ не протухає.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { fetch: fetchWithRetry },
  });
}

export function db() {
  cached ??= create();
  return cached;
}
