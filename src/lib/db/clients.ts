import "server-only";

import { db } from "./client";
import { normalizePhone } from "@/lib/phone";
import type { AppointmentRow, ClientRow } from "./types";

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
 * Агрегуємо в пам'яті, а не в SQL: клієнтів у студії сотні, не мільйони, а
 * postgrest-агрегати вимагали б окремої view. Якщо база виросте — це перше
 * місце, яке варто переписати на RPC.
 */
export async function listClientsWithStats(
  query = "",
): Promise<{ clients: ClientWithStats[]; hasMore: boolean }> {
  const VISITS =
    "client_id, price, starts_at, status, location:locations ( city )";

  /**
   * Без пошуку обидва запити йдуть одночасно.
   *
   * Візити фільтруються через `in` по id клієнтів, тож виглядають залежними —
   * але коли пошуку немає, ми беремо всіх клієнтів, отже й усі візити: `in`
   * нічого не відсіює. Чекати на перший запит заради цього означає віддати
   * ~180 мс на кожне відкриття сторінки (заміряно на цій базі).
   *
   * З пошуком залежність справжня: клієнтів одиниці, і тягнути через `in`
   * дешевше, ніж усю таблицю візитів.
   */
  if (!query.trim()) {
    const [page, visitsResult] = await Promise.all([
      searchClients(query),
      db().from("appointments").select(VISITS),
    ]);

    if (visitsResult.error) {
      throw new Error(
        `Не вдалося прочитати візити: ${visitsResult.error.message}`,
      );
    }

    return buildStats(page.rows, page.hasMore, visitsResult.data ?? []);
  }

  const { rows: clients, hasMore } = await searchClients(query);
  if (clients.length === 0) return { clients: [], hasMore: false };

  const { data: appointments, error } = await db()
    .from("appointments")
    .select(VISITS)
    .in(
      "client_id",
      clients.map((c) => c.id),
    );

  if (error) throw new Error(`Не вдалося прочитати візити: ${error.message}`);

  return buildStats(clients, hasMore, appointments ?? []);
}

/** Зведення візитів у статистику — спільне для обох гілок вище. */
function buildStats(
  clients: ClientRow[],
  hasMore: boolean,
  appointments: unknown[],
): { clients: ClientWithStats[]; hasMore: boolean } {
  if (clients.length === 0) return { clients: [], hasMore: false };

  // Вкладений джойн збиває виведення типів postgrest до `never`, тож
  // описуємо форму рядка вручну — так само, як у appointments.ts.
  type VisitRow = {
    client_id: string;
    price: number;
    starts_at: string;
    status: AppointmentRow["status"];
    location: { city: string } | null;
  };
  const visits = (appointments ?? []) as unknown as VisitRow[];

  const now = Date.now();
  const stats = new Map<
    string,
    {
      visits: number;
      totalSpent: number;
      lastVisit: string | null;
      nextVisit: string | null;
      /** місто → скільки разів; у список віддамо відсортованим за частотою. */
      cityCounts: Map<string, number>;
    }
  >();

  for (const a of visits) {
    const entry = stats.get(a.client_id) ?? {
      visits: 0,
      totalSpent: 0,
      lastVisit: null,
      nextVisit: null,
      cityCounts: new Map<string, number>(),
    };

    // Скасовані не рахуємо: візит, який не відбувся, нічого не каже про те,
    // куди людина ходить. Кабінет міг бути видалений — тоді міста немає.
    const city = a.location?.city;
    if (city && a.status !== "cancelled") {
      entry.cityCounts.set(city, (entry.cityCounts.get(city) ?? 0) + 1);
    }

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

  return {
    clients: clients.map((client) => {
      const entry = stats.get(client.id);
      return {
        ...client,
        visits: entry?.visits ?? 0,
        totalSpent: entry?.totalSpent ?? 0,
        lastVisit: entry?.lastVisit ?? null,
        nextVisit: entry?.nextVisit ?? null,
        cities: entry
          ? [...entry.cityCounts]
              .sort((a, b) => b[1] - a[1])
              .map(([city]) => city)
          : [],
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
