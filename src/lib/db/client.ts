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

function create() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: {
      // Сервер не має ані де зберігати сесію, ані потреби її оновлювати:
      // автентифікація адмінки своя, а ключ не протухає.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function db() {
  cached ??= create();
  return cached;
}
