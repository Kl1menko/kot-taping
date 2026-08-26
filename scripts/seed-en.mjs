/**
 * Англійські назви й описи послуг та наборів.
 *
 * Переклади живуть тут, а не в міграції: міграція описує форму таблиці, а це
 * контент, який майстриня може правити в адмінці. Скрипт лише заповнює
 * порожнє — записи, де переклад уже є, він не чіпає, тож ручні правки
 * повторний запуск не затирає.
 *
 * Запуск: npm run db:seed-en
 */

import { readFileSync } from "node:fs";

// .env.local читаємо самі: скрипт запускається поза Next, який робить це сам.
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !KEY) {
  console.error("Немає SUPABASE_URL або SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

/**
 * Переклад змістовий, а не послівний.
 *
 * Терміни й техніка передані точно — «дві стрічки 5 см» лишаються двома
 * стрічками по 5 см, бо за цим людина обирає процедуру. А от маркетингові
 * звороти («тургор шкіри», «ліфтинг-ефект») подані так, як їх називає
 * англомовна індустрія: skin tone, a lifting effect.
 */
const SERVICES = {
  znebolennya: ["Pain relief", "Comes with a set of exercises designed to extend the effect."],
  spyna: ["Back", "Pain relief, support and stabilisation, plus a set of exercises."],
  postava: ["Posture", "Holds a physiological position. Suitable for every age group, plus a set of exercises."],
  diastaz: ["Diastasis", "Muscle correction for separation of the rectus abdominis. Done as a course."],
  nevrologichni: ["Neurological", "Comprehensive work with muscular dystonia and two-stage testing."],

  "lymph-belly-single": ["Abdomen — single", "One 5 cm strip per side, cut into fine ribbons. Stretch marks, less volume, better skin tone, a lifting effect."],
  "lymph-belly-double": ["Abdomen — double", "Two 5 cm strips at the front and back, wrapping the whole torso. Stretch marks, volume, skin tone, lifting."],
  "post-surgery": ["Post-surgery", "Reduces post-operative swelling and pain, speeds up recovery, prevents haematomas."],
  "lymph-chest": ["Chest", "Reduces stretch marks, improves skin tone, gives a lifting effect and restores an even skin colour."],
  "lymph-arms-single": ["Arms — single", "One 2.5 cm strip per side, cut into ribbons. Swelling, volume, skin tone, lifting (post-oncology, lymphoedema)."],
  "lymph-arms-double": ["Arms — double", "Two 5 cm strips at the front and back, wrapping the whole arm. For post-oncology patients with lymphoedema after lymph node dissection."],
  "lymph-hips-single": ["Thighs — single", "One 5 cm strip per leg. Cellulite, less volume, better skin tone, a lifting effect."],
  "lymph-hips-double": ["Thighs — double", "Two 5 cm strips per leg. Cellulite, less volume, skin tone, a lifting effect."],
  "lymph-legs-double": ["Legs — double", "Two 5 cm strips per leg along the full length. Cellulite, volume, skin tone, a lifting effect."],
  "lymph-calves": ["Calves", "A set of exercises to extend the effect, plus before-and-after tracking in photo, video and centimetres."],
  "lymph-glutes": ["Buttocks", "A set of exercises to extend the effect, plus before-and-after tracking in photo, video and centimetres."],
  scars: ["Scars", "Targeted lymphatic drainage. Speeds up recovery and healing, improves circulation in the damaged area. Done as a course."],

  "lymph-face-neck": ["Face + neck", "A set of exercises to extend the effect, plus before-and-after tracking in photo and video."],
  kholka: ["Upper back hump", "Clears swelling at the seventh cervical vertebra, relieves headaches, improves blood flow to the head and eases neck pain."],
  "lymph-face-course": ["Face and neck lymphatic drainage", "Clears swelling from the face, a double chin and neck rings; improves overall skin quality. Also for urgent swelling after surgery."],

  cheeks: ["Cheek lymphatic drainage", "Clears swelling from the middle and lower thirds of the face. Reduces nasolabial folds and helps after dental work."],
  "purse-wrinkles": ["Lip lines", "Contouring tape that smooths the lines around the mouth and relaxes the orbicularis oris muscle."],
  "forehead-wrinkles": ["Forehead wrinkles", "Contouring tape that smooths horizontal forehead lines and relaxes the frontal belly of the occipitofrontalis."],

  "set-3-zones-3": ["Three areas — course of 3", "Forehead wrinkles + nasolabial folds + lip lines."],
  "set-3-zones-5": ["Three areas — course of 5", "Forehead wrinkles + nasolabial folds + lip lines."],
  "set-3-zones-7": ["Three areas — course of 7", "Forehead wrinkles + nasolabial folds + lip lines."],
};

const KITS = {
  "face-full": ["Full face", "Forehead, mouth and cheeks — the complete kit. White tape."],
  "face-forehead": ["Forehead", "A single area: the forehead. White tape."],
  "face-mouth": ["Mouth", "A single area: the mouth. White tape."],
  "face-cheeks": ["Cheeks", "A single area: the cheeks. White tape."],
  neck: ["Neck", "A kit for taping your own neck at home. Colour of your choice."],
};

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function fill(table, translations) {
  const res = await fetch(
    `${URL_BASE}/rest/v1/${table}?select=slug,title_en`,
    { headers },
  );
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);

  const rows = await res.json();
  let written = 0;
  let kept = 0;
  const missing = [];

  for (const row of rows) {
    const translation = translations[row.slug];
    if (!translation) {
      missing.push(row.slug);
      continue;
    }
    // Уже перекладене не чіпаємо: правку з адмінки скрипт не має затирати.
    if (row.title_en) {
      kept += 1;
      continue;
    }

    const [title_en, summary_en] = translation;
    const put = await fetch(
      `${URL_BASE}/rest/v1/${table}?slug=eq.${encodeURIComponent(row.slug)}`,
      { method: "PATCH", headers, body: JSON.stringify({ title_en, summary_en }) },
    );
    if (!put.ok) throw new Error(`${row.slug}: ${put.status} ${await put.text()}`);
    written += 1;
  }

  console.log(`${table}: записано ${written}, лишено без змін ${kept}`);
  if (missing.length > 0) {
    console.log(`  без перекладу: ${missing.join(", ")}`);
  }
}

await fill("services", SERVICES);
await fill("kits", KITS);

/**
 * Підписи носіння та бейджа (міграція 0017).
 *
 * Ключ — український оригінал, бо ці рядки повторюються між послугами:
 * «5–10 днів» стоїть у кількох, і зіставляти їх по slug'у означало б
 * переписувати той самий переклад стільки ж разів.
 */
const WEAR = {
  "5–10 днів": "5–10 days",
  "10–14 днів": "10–14 days",
  "14–16 днів": "14–16 days",
};

const BADGE = {
  "Курс 3 процедури": "Course of 3",
  "Курс 5 процедур": "Course of 5",
  "Курс 7 процедур": "Course of 7",
  "Курс 10 процедур": "Course of 10",
  "Розмір S-M-L": "Sizes S / M / L",
  "Розмір універсальний": "One size",
};

async function fillLabels() {
  const res = await fetch(
    `${URL_BASE}/rest/v1/services?select=slug,wear,badge,wear_en,badge_en`,
    { headers },
  );
  // Колонок ще немає (міграцію 0017 не виконано) — не падаємо: решта
  // перекладів уже записана, і повторний запуск допише ці, коли колонки
  // з'являться.
  if (!res.ok) {
    console.log("wear/badge: пропущено — виконайте міграцію 0017");
    return;
  }

  let written = 0;
  for (const row of await res.json()) {
    const patch = {};
    if (row.wear && !row.wear_en && WEAR[row.wear]) patch.wear_en = WEAR[row.wear];
    if (row.badge && !row.badge_en && BADGE[row.badge]) {
      patch.badge_en = BADGE[row.badge];
    }
    if (Object.keys(patch).length === 0) continue;

    const put = await fetch(
      `${URL_BASE}/rest/v1/services?slug=eq.${encodeURIComponent(row.slug)}`,
      { method: "PATCH", headers, body: JSON.stringify(patch) },
    );
    if (!put.ok) throw new Error(`${row.slug}: ${put.status} ${await put.text()}`);
    written += 1;
  }
  console.log(`wear/badge: записано ${written}`);
}

await fillLabels();
