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

/**
 * Нова клієнтка, заведена вручну з адмінки.
 *
 * Окремо від `upsertClient`: там повторний номер означає «та сама людина
 * записується знову» і мовчки повертає наявний рядок. Тут навпаки — майстриня
 * свідомо заводить нову картку, тож дублікат треба показати, а не сховати.
 */
export async function createClient(input: {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}): Promise<ClientRow> {
  const { data, error } = await db()
    .from("clients")
    .insert({
      name: input.name.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    // Гонка: між перевіркою в екшені та вставкою номер міг зайняти
    // паралельний запит (заявка з сайту, другий пристрій).
    if (error.code === "23505") {
      throw new Error("Клієнт із таким номером уже існує.");
    }
    throw new Error(`Не вдалося створити клієнта: ${error.message}`);
  }

  return data;
}

export type ClientWithStats = ClientRow & {
  /** Лише виконані візити: заплановані ще нічого не кажуть про клієнта. */
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
  /** Найближчий запланований запис — щоб було видно, кого чекати. */
  nextVisit: string | null;
  /**
   * Міста, у які клієнтка ходить, — від найчастішого до рідшого.
   *
   * Саме список, а не одне місто: студія працює у Львові й Києві, і людина
   * цілком може бувати в обох (переїзд, відрядження). Показати одне означало б
   * тихо збрехати про друге.
   *
   * Рахуємо за всіма записами, не лише виконаними: щойно створений запис у
   * новому місті — це теж відповідь на питання «куди вона ходить».
   */
  cities: string[];
};

/**
 * Клієнти зі статистикою візитів.
 *
 * Агрегати рахує база (view `client_stats` і `client_cities`, міграція 0014),
 * а не застосунок. Раніше сторінка тягнула **всю** таблицю візитів — без
 * ліміту й без фільтра, — щоб згорнути її в чотири числа на клієнта. Клієнти
 * при цьому були обмежені 500 рядками, а візити ні, тож обсяг ріс назавжди:
 * кожен проведений візит навіки додавав рядок, який їхав по мережі в Node,
 * аби стати лічильником.
 *
 * Тепер статистика приходить лише для тих клієнтів, що справді на екрані:
 * `in` по їхніх id замість вибірки всієї таблиці.
 */
export async function listClientsWithStats(
  query = "",
): Promise<{ clients: ClientWithStats[]; hasMore: boolean }> {
  const { rows: clients, hasMore } = await searchClients(query);
  if (clients.length === 0) return { clients: [], hasMore: false };

  const ids = clients.map((c) => c.id);

  // Обидва view читаються одночасно: вони не залежать один від одного, а
  // послідовний виклик додав би зайвий круговий рейс на кожне відкриття.
  const [statsResult, citiesResult] = await Promise.all([
    db()
      .from("client_stats")
      .select("client_id, visits, total_spent, last_visit, next_visit")
      .in("client_id", ids),
    db().from("client_cities").select("client_id, cities").in("client_id", ids),
  ]);

  if (statsResult.error) {
    throw new Error(
      `Не вдалося прочитати статистику: ${statsResult.error.message}`,
    );
  }
  if (citiesResult.error) {
    throw new Error(
      `Не вдалося прочитати міста: ${citiesResult.error.message}`,
    );
  }

  const stats = new Map(
    (statsResult.data ?? []).map((row) => [row.client_id, row]),
  );
  const cities = new Map(
    (citiesResult.data ?? []).map((row) => [row.client_id, row.cities ?? []]),
  );

  return {
    clients: clients.map((client) => {
      const entry = stats.get(client.id);
      return {
        ...client,
        // Клієнт без жодного візиту у view не потрапляє — `left join` дає
        // нульовий рядок лише для `client_stats`, але не для `client_cities`.
        visits: Number(entry?.visits ?? 0),
        totalSpent: Number(entry?.total_spent ?? 0),
        lastVisit: entry?.last_visit ?? null,
        nextVisit: entry?.next_visit ?? null,
        cities: cities.get(client.id) ?? [],
      };
    }),
    hasMore,
  };
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
 * Скільки клієнтів сторінка тягне за раз.
 *
 * Не «стільки, скільки є»: разом із кожним рядком їдуть телефон і нотатки про
 * здоров'я, тож віддавати всю базу в HTML на кожен відкритий екран не варто.
 * Півтисячі — це кілька років роботи студії, і при цьому ще розумний обсяг.
 */
export const CLIENTS_PAGE_SIZE = 500;

/**
 * Пошук за іменем або телефоном. Телефонний запит нормалізуємо, щоб «+380 63»
 * знаходило збережене `063…`.
 *
 * Ліміт свідомо повертаємо назовні (`hasMore`), а не ковтаємо: раніше зріз на
 * сотому клієнті був невидимим, і 101-ша клієнтка просто не знаходилась —
 * пошук на екрані фільтрує вже завантажений масив. Тепер список довший, а якщо
 * він усе одно впреться в межу, інтерфейс про це скаже вголос.
 */
export async function searchClients(
  query: string,
): Promise<{ rows: ClientRow[]; hasMore: boolean }> {
  const trimmed = query.trim();

  let request = db().from("clients").select("*").order("name");

  if (trimmed) {
    const digits = normalizePhone(trimmed);
    const escaped = trimmed.replace(/[%_,]/g, "");
    request = digits
      ? request.or(`name.ilike.%${escaped}%,phone.ilike.%${digits}%`)
      : request.ilike("name", `%${escaped}%`);
  }

  // Беремо на один рядок більше за сторінку: якщо він приїхав — межу досягнуто.
  const { data, error } = await request.limit(CLIENTS_PAGE_SIZE + 1);
  if (error) throw new Error(`Не вдалося знайти клієнтів: ${error.message}`);

  const rows = data ?? [];
  return {
    rows: rows.slice(0, CLIENTS_PAGE_SIZE),
    hasMore: rows.length > CLIENTS_PAGE_SIZE,
  };
}

/**
 * Видалити клієнта.
 *
 * Лише того, у кого немає жодного візиту: у базі на `appointments.client_id`
 * стоїть `on delete restrict` (0001), і це навмисно — візит це проведена
 * робота й отримані гроші, тобто історія студії, а не властивість картки.
 * Каскад тут тихо переписував би минуле, а «видалити клієнта разом із його
 * оплатами» — не та дія, яку можна зробити випадковим тапом.
 *
 * Тому перевіряємо до видалення й повертаємо зрозумілу відмову. Покластись на
 * констрейнт означало б показати майстрині «violates foreign key constraint»
 * замість «у клієнта є візити».
 *
 * Реальний випадок, заради якого це потрібно, — дублікат або помилково
 * заведена картка: саме в них візитів і немає.
 */
export async function deleteClient(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "has-visits" | "failed"; message: string }> {
  // `head: true` — потрібна лише кількість, самі рядки не читаємо.
  const { count, error: countError } = await db()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  if (countError) {
    return {
      ok: false,
      reason: "failed",
      message: `Не вдалося перевірити візити: ${countError.message}`,
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      reason: "has-visits",
      message:
        count === 1
          ? "У клієнта є 1 візит — картку з історією видалити не можна."
          : `У клієнта є ${count} візити(ів) — картку з історією видалити не можна.`,
    };
  }

  const { error } = await db().from("clients").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      reason: "failed",
      message: `Не вдалося видалити: ${error.message}`,
    };
  }

  return { ok: true };
}
