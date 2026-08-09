import "server-only";

import { db } from "./client";
import { normalizePhone } from "@/lib/phone";
import type { ClientRow } from "./types";

export async function findClientByPhone(
  phone: string,
): Promise<ClientRow | null> {
  const { data, error } = await db()
    .from("clients")
    .select("*")
    .eq("phone", normalizePhone(phone))
    .maybeSingle();

  if (error) throw new Error(`Не вдалося знайти клієнта: ${error.message}`);
  return data ?? null;
}

/**
 * Клієнт за телефоном або новий запис.
 *
 * Телефон — природний ключ: одна людина = один номер. Ім'я наявного клієнта
 * не перезаписуємо, бо в базі воно, найімовірніше, вивірене майстром, а те, що
 * прийшло з форми на сайті, — як людина написала поспіхом.
 *
 * Якщо імена розійшлися, дописуємо нове в нотатки: мовчки зчепити двох різних
 * людей з одним номером (спільний телефон, помилка в цифрі) — гірше, ніж
 * лишити майстру слід для перевірки.
 */
export async function upsertClient(input: {
  name: string;
  phone: string;
  email?: string | null;
}): Promise<ClientRow> {
  const phone = normalizePhone(input.phone);

  const existing = await findClientByPhone(phone);
  if (existing) {
    const incoming = input.name.trim();
    const differs =
      incoming.length > 0 &&
      incoming.toLowerCase() !== existing.name.toLowerCase();

    if (differs && !existing.notes?.includes(incoming)) {
      const mark = `Представилась як «${incoming}» (${new Date().toLocaleDateString("uk-UA")})`;
      const notes = existing.notes ? `${existing.notes}\n${mark}` : mark;

      const { data } = await db()
        .from("clients")
        .update({ notes })
        .eq("id", existing.id)
        .select()
        .single();

      return data ?? existing;
    }

    return existing;
  }

  const { data, error } = await db()
    .from("clients")
    .insert({ name: input.name.trim(), phone, email: input.email ?? null })
    .select()
    .single();

  if (error) {
    // Гонка: між select і insert клієнта міг створити паралельний запит.
    if (error.code === "23505") {
      const raced = await findClientByPhone(phone);
      if (raced) return raced;
    }
    throw new Error(`Не вдалося створити клієнта: ${error.message}`);
  }

  return data;
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await db()
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати клієнта: ${error.message}`);
  return data ?? null;
}

export type ClientWithStats = ClientRow & {
  /** Лише виконані візити: заплановані ще нічого не кажуть про клієнта. */
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
  /** Найближчий запланований запис — щоб було видно, кого чекати. */
  nextVisit: string | null;
};

/**
 * Клієнти зі статистикою візитів.
 *
 * Агрегуємо в пам'яті, а не в SQL: клієнтів у студії сотні, не мільйони, а
 * postgrest-агрегати вимагали б окремої view. Якщо база виросте — це перше
 * місце, яке варто переписати на RPC.
 */
export async function listClientsWithStats(
  query = "",
): Promise<ClientWithStats[]> {
  const clients = await searchClients(query);
  if (clients.length === 0) return [];

  const { data: appointments, error } = await db()
    .from("appointments")
    .select("client_id, price, starts_at, status")
    .in(
      "client_id",
      clients.map((c) => c.id),
    );

  if (error) throw new Error(`Не вдалося прочитати візити: ${error.message}`);

  const now = Date.now();
  const stats = new Map<
    string,
    { visits: number; totalSpent: number; lastVisit: string | null; nextVisit: string | null }
  >();

  for (const a of appointments ?? []) {
    const entry = stats.get(a.client_id) ?? {
      visits: 0,
      totalSpent: 0,
      lastVisit: null,
      nextVisit: null,
    };

    if (a.status === "done") {
      entry.visits += 1;
      entry.totalSpent += a.price;
      if (!entry.lastVisit || a.starts_at > entry.lastVisit) {
        entry.lastVisit = a.starts_at;
      }
    }

    if (a.status === "planned" && new Date(a.starts_at).getTime() >= now) {
      if (!entry.nextVisit || a.starts_at < entry.nextVisit) {
        entry.nextVisit = a.starts_at;
      }
    }

    stats.set(a.client_id, entry);
  }

  return clients.map((client) => ({
    ...client,
    ...(stats.get(client.id) ?? {
      visits: 0,
      totalSpent: 0,
      lastVisit: null,
      nextVisit: null,
    }),
  }));
}

export async function updateClientNotes(id: string, notes: string) {
  const { error } = await db()
    .from("clients")
    .update({ notes: notes.trim() || null })
    .eq("id", id);

  if (error) throw new Error(`Не вдалося зберегти нотатки: ${error.message}`);
}

export async function updateClient(
  id: string,
  input: { name: string; phone: string; email?: string | null },
) {
  const { error } = await db()
    .from("clients")
    .update({
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Клієнт із таким номером уже існує.");
    }
    throw new Error(`Не вдалося зберегти клієнта: ${error.message}`);
  }
}

/**
 * Пошук за іменем або телефоном. Телефонний запит нормалізуємо, щоб «+380 63»
 * знаходило збережене `063…`.
 */
export async function searchClients(query: string): Promise<ClientRow[]> {
  const trimmed = query.trim();

  let request = db().from("clients").select("*").order("name");

  if (trimmed) {
    const digits = normalizePhone(trimmed);
    const escaped = trimmed.replace(/[%_,]/g, "");
    request = digits
      ? request.or(`name.ilike.%${escaped}%,phone.ilike.%${digits}%`)
      : request.ilike("name", `%${escaped}%`);
  }

  const { data, error } = await request.limit(100);
  if (error) throw new Error(`Не вдалося знайти клієнтів: ${error.message}`);
  return data ?? [];
}
