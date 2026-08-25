/**
 * Заливає початкові дані: прайс із src/lib/services.ts, FAQ та відгуки з
 * src/lib/content.ts.
 *
 *   npm run db:seed
 *
 * Дані імпортуються з тих самих модулів, які використовує сайт, тож розійтися
 * вони не можуть. Потребує Node 22+ (виконання TypeScript напряму).
 *
 * Ідемпотентний: послуги йдуть через upsert по slug, тож повторний запуск
 * оновить прайс, а не подвоїть його. FAQ і відгуки додаються лише в порожню
 * таблицю — інакше кожен запуск затирав би правки з адмінки.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// .env.local читаємо самі: скрипт запускається голим node, без Next.
const envPath = new URL("../.env.local", import.meta.url);
let envFile;
try {
  envFile = readFileSync(envPath, "utf8");
} catch {
  console.error("Немає .env.local — скопіюйте .env.example і заповніть.");
  process.exit(1);
}

for (const line of envFile.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Немає SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY у .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { SERVICES } = await import("../src/lib/services.ts");
const { FAQ_ITEMS, TESTIMONIALS } = await import("../src/lib/content.ts");

// — Послуги —
const rows = SERVICES.map((s, i) => ({
  slug: s.slug,
  title: s.title,
  summary: s.summary,
  price: s.price,
  price_from: Boolean(s.priceFrom),
  wear: s.wear ?? null,
  badge: s.badge ?? null,
  category: s.category,
  tone: s.tone,
  // Прайс тривалості не фіксує — 60 хв як заготовка, майстер поправить.
  duration_min: 60,
  // `image_url` тут навмисно немає: upsert оновлює лише перелічені колонки,
  // тож фото, завантажені в адмінці, переживають повторний запуск сіду.
  sort: i,
  is_active: true,
}));

const { error: svcErr } = await db
  .from("services")
  .upsert(rows, { onConflict: "slug" });
if (svcErr) throw svcErr;
console.log(`✓ Послуги: ${rows.length}`);

// — FAQ —
const { count: faqCount, error: faqCountErr } = await db
  .from("faq_items")
  .select("*", { count: "exact", head: true });
if (faqCountErr) throw faqCountErr;

if (faqCount === 0) {
  const { error } = await db
    .from("faq_items")
    .insert(
      FAQ_ITEMS.map((f, i) => ({
        question: f.q,
        answer: f.a,
        sort: i,
        is_published: true,
      })),
    );
  if (error) throw error;
  console.log(`✓ FAQ: ${FAQ_ITEMS.length}`);
} else {
  console.log(`· FAQ пропущено — у таблиці вже ${faqCount} записів`);
}

// — Відгуки —
// is_published: false. Це плейсхолдери з коду, а не справжні відгуки з дозволом
// клієнтів, тож на сайт вони не потраплять, доки майстер їх не підтвердить.
const { count: revCount, error: revCountErr } = await db
  .from("testimonials")
  .select("*", { count: "exact", head: true });
if (revCountErr) throw revCountErr;

if (revCount === 0) {
  const { error } = await db.from("testimonials").insert(
    TESTIMONIALS.map((t, i) => ({
      quote: t.quote,
      author: t.author,
      detail: t.detail,
      sort: i,
      is_published: false,
    })),
  );
  if (error) throw error;
  console.log(
    `✓ Відгуки: ${TESTIMONIALS.length} (неопубліковані — це плейсхолдери)`,
  );
} else {
  console.log(`· Відгуки пропущено — у таблиці вже ${revCount} записів`);
}

console.log("\nГотово.");
