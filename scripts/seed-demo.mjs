/**
 * Демо-дані для перевірки інтерфейсу: ~100 записів на поточний місяць,
 * клієнти з історією, заявки з сайту в різних статусах.
 *
 *   npm run db:demo        — залити
 *   npm run db:demo -- --clear  — прибрати все, що він створив
 *
 * Створює лише те, що позначено як демо (телефони в діапазоні 099000XXXX),
 * тож реальні дані не зачіпає.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Демо-клієнтів упізнаємо за префіксом номера. */
const DEMO_PREFIX = "099000";

// Детермінований генератор: однаковий набір між прогонами, тож візуальні
// зміни видно без шуму від випадковості.
let seed = 20260808;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NAMES = [
  "Олена Марчук", "Ірина Бондар", "Наталя Швець", "Юлія Кравець",
  "Тетяна Лисенко", "Оксана Гриценко", "Марія Ткач", "Софія Романюк",
  "Ганна Мельник", "Вікторія Савчук", "Дарина Поліщук", "Христина Бойко",
  "Аліна Ковальчук", "Людмила Шевчук", "Катерина Мороз",
];

const NOTES = [
  "Чутлива шкіра — тестувати тейп на згині ліктя.",
  "Просить не використовувати рожевий тейп.",
  "Після кесаревого, працюємо обережно з низом живота.",
  // Довга нотатка навмисно: у картці вона обрізається до двох рядків
  // (line-clamp-2), і треба бачити, що обрив виглядає охайно.
  "Алергія на акрил у клеї — беремо гіпоалергенний тейп. Приходить із донькою, тож закладаємо трохи більше часу на сеанс і не ставимо впритул до наступного запису.",
  null, null,
];

async function clear() {
  const { data: clients } = await db
    .from("clients")
    .select("id")
    .like("phone", `${DEMO_PREFIX}%`);

  const ids = (clients ?? []).map((c) => c.id);

  if (ids.length) {
    await db.from("appointments").delete().in("client_id", ids);
    await db.from("clients").delete().in("id", ids);
  }
  await db.from("requests").delete().like("phone", `${DEMO_PREFIX}%`);

  console.log(`Прибрано демо-дані (${ids.length} клієнтів).`);
}

if (process.argv.includes("--clear")) {
  await clear();
  process.exit(0);
}

// Чистимо попередній прогін, щоб не накопичувати дублі.
await clear();

const { data: services, error: svcError } = await db
  .from("services")
  .select("id, slug, price, price_from, duration_min, category")
  .eq("is_active", true);

if (svcError) throw svcError;
if (!services?.length) {
  console.error("У базі немає послуг — спершу запустіть npm run db:seed");
  process.exit(1);
}

// Кабінети. `appointments.location_id` — not null, тож без них сидер падає.
const { data: locations, error: locError } = await db
  .from("locations")
  .select("id, slug, city")
  .order("sort");

if (locError) throw locError;
if (!locations?.length) {
  console.error("У базі немає кабінетів — застосуйте міграції supabase/migrations");
  process.exit(1);
}

// — Клієнти —
const clientRows = NAMES.map((name, i) => ({
  name,
  phone: `${DEMO_PREFIX}${String(i).padStart(4, "0")}`,
  notes: NOTES[i % NOTES.length],
}));

const { data: clients, error: clientError } = await db
  .from("clients")
  .insert(clientRows)
  .select("id");

if (clientError) throw clientError;
console.log(`✓ Клієнтів: ${clients.length}`);

/**
 * До якого кабінету «прив'язана» кожна клієнтка.
 *
 * Розподіл навмисно нерівний, щоб на екрані було видно всі три випадки, які
 * вміє показати картка: тільки Львів, тільки Київ і обидва міста (кожна
 * четверта — «мандрівна»). Клієнтки без жодного візиту теж лишаються — для
 * них список міст порожній.
 */
const homeFor = new Map();
clients.forEach((c, i) => {
  homeFor.set(c.id, {
    primary: locations[i % locations.length],
    roams: i % 4 === 0 && locations.length > 1,
  });
});

const locationFor = (clientId) => {
  const home = homeFor.get(clientId);
  if (!home) return pick(locations);
  // «Мандрівні» зрідка потрапляють у другий кабінет — саме це і дає в картці
  // два міста, відсортовані за частотою.
  if (home.roams && rand() < 0.35) {
    const others = locations.filter((l) => l.id !== home.primary.id);
    return others.length ? pick(others) : home.primary;
  }
  return home.primary;
};

// — Записи на весь поточний місяць —
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
const daysInMonth = monthEnd.getDate();

const TARGET = 100;
const appointments = [];

for (let day = 1; day <= daysInMonth && appointments.length < TARGET; day++) {
  const date = new Date(now.getFullYear(), now.getMonth(), day);
  if (date.getDay() === 0) continue; // неділя вихідна

  // Будні щільніші за суботу — так сітка виглядає правдоподібно.
  const perDay = date.getDay() === 6 ? 2 + Math.floor(rand() * 2) : 4 + Math.floor(rand() * 3);

  const usedSlots = new Set();

  for (let k = 0; k < perDay && appointments.length < TARGET; k++) {
    // Слоти по 30 хв від 09:00 до 19:00.
    let slot = 18 + Math.floor(rand() * 20);
    let guard = 0;
    while (usedSlots.has(slot) && guard++ < 20) slot = 18 + Math.floor(rand() * 20);
    usedSlots.add(slot);

    const start = new Date(date);
    start.setHours(Math.floor(slot / 2), (slot % 2) * 30, 0, 0);

    const svc = pick(services);
    const past = start < now;

    // Минулі здебільшого виконані, майбутні — заплановані.
    const status = past
      ? rand() < 0.86 ? "done" : rand() < 0.6 ? "cancelled" : "no_show"
      : "planned";

    // Ціна «від» гуляє вгору — як у реальному прайсі.
    const price = svc.price_from
      ? svc.price + Math.floor(rand() * 6) * 200
      : svc.price;

    const clientId = pick(clients).id;

    appointments.push({
      client_id: clientId,
      service_id: svc.id,
      location_id: locationFor(clientId).id,
      starts_at: start.toISOString(),
      duration_min: svc.duration_min,
      price,
      status,
      source: rand() < 0.3 ? "site" : "manual",
      note: rand() < 0.15 ? "Просила нагадати за день." : null,
    });
  }
}

const { error: apptError } = await db.from("appointments").insert(appointments);
if (apptError) throw apptError;
console.log(`✓ Записів: ${appointments.length}`);

// — Заявки з сайту —
const requests = [];
for (let i = 0; i < 12; i++) {
  const created = new Date(now);
  created.setDate(created.getDate() - Math.floor(rand() * 20));

  const preferred = new Date(created);
  preferred.setDate(preferred.getDate() + 2 + Math.floor(rand() * 7));

  const status = i < 5 ? "converted" : i < 9 ? "new" : "declined";

  requests.push({
    name: pick(NAMES),
    phone: `${DEMO_PREFIX}${String(100 + i).padStart(4, "0")}`,
    service_slug: pick(services).slug,
    // Кожна п'ята заявка без кабінету — «будь-який», щоб було видно, що
    // картка заявки коректно живе й без міста.
    location_slug: i % 5 === 0 ? null : pick(locations).slug,
    preferred_date: preferred.toISOString().slice(0, 10),
    note: rand() < 0.4 ? "Зручніше після 17:00." : null,
    status,
    created_at: created.toISOString(),
  });
}

const { error: reqError } = await db.from("requests").insert(requests);
if (reqError) throw reqError;
console.log(`✓ Заявок: ${requests.length}`);

// — Зведення —
const done = appointments.filter((a) => a.status === "done");
const revenue = done.reduce((s, a) => s + a.price, 0);

const byCity = locations
  .map((l) => {
    const n = appointments.filter((a) => a.location_id === l.id).length;
    return `${l.city} ${n}`;
  })
  .join(" · ");

// Скільки клієнток мають два міста — саме той випадок, який найлегше
// проґавити на екрані, якщо його немає в даних.
const roaming = [...homeFor.values()].filter((h) => h.roams).length;

console.log(`
Період: ${monthStart.toLocaleDateString("uk-UA")} — ${monthEnd.toLocaleDateString("uk-UA")}
  виконаних: ${done.length} · виручка ${revenue.toLocaleString("uk-UA")} ₴
  запланованих: ${appointments.filter((a) => a.status === "planned").length}
  скасованих: ${appointments.filter((a) => a.status === "cancelled").length}
  неявок: ${appointments.filter((a) => a.status === "no_show").length}
  по кабінетах: ${byCity}
  клієнток, що бувають у двох містах: до ${roaming}

Прибрати: npm run db:demo -- --clear`);
