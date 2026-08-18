import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CATEGORY_SEO,
  CITY_SEO,
  SITE_DESCRIPTION,
  cityBySlug,
  pageMetadata,
} from "./seo.ts";
import { CATEGORIES } from "./services.ts";
import { LOCATIONS } from "./contacts.ts";

/**
 * Тексти в цьому файлі пишуться руками, а межі видачі на око не видно: опис на
 * 200 символів виглядає в редакторі нормально, а в Google обрізається на
 * півслові. Тому межі перевіряє тест, а не уважність.
 *
 * Числа — з практики видачі: `<title>` Google міряє в пікселях, але 60 символів
 * — робочий орієнтир для кирилиці; опис обрізається близько 160.
 */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 165;
const DESCRIPTION_MIN = 70;

test("опис сайту вкладається в межі сніпета", () => {
  assert.ok(
    SITE_DESCRIPTION.length <= DESCRIPTION_MAX,
    `опис сайту ${SITE_DESCRIPTION.length} символів, максимум ${DESCRIPTION_MAX}`,
  );
});

test("кожна категорія має тексти, і вони вкладаються в межі", () => {
  for (const cat of CATEGORIES) {
    const seo = CATEGORY_SEO[cat.id];
    assert.ok(seo, `немає текстів для категорії ${cat.id}`);

    // `template` у layout додає « · Kotova Taping» — 16 символів, які теж
    // потрапляють у видачу, тож заголовок міряємо разом із суфіксом.
    const fullTitle = `${seo.heading} · Kotova Taping`;
    assert.ok(
      fullTitle.length <= TITLE_MAX,
      `${cat.id}: заголовок ${fullTitle.length} символів, максимум ${TITLE_MAX}`,
    );

    assert.ok(
      seo.description.length <= DESCRIPTION_MAX,
      `${cat.id}: опис ${seo.description.length} символів, максимум ${DESCRIPTION_MAX}`,
    );
    // Надто короткий опис Google переписує сам, ігноруючи наш.
    assert.ok(
      seo.description.length >= DESCRIPTION_MIN,
      `${cat.id}: опис лише ${seo.description.length} символів, мінімум ${DESCRIPTION_MIN}`,
    );

    assert.ok(seo.keywords.length > 0, `${cat.id}: порожні ключові слова`);
    assert.ok(seo.intro.length > 0, `${cat.id}: порожній вступ`);
  }
});

test("описи категорій не повторюються", () => {
  // Однаковий опис на двох сторінках — це дублі в очах пошуковика: він лишить
  // у видачі одну з них, і саме ту, яку обере сам.
  const seen = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const { description } = CATEGORY_SEO[cat.id];
    const previous = seen.get(description);
    assert.ok(
      previous === undefined,
      `${cat.id} і ${previous} мають однаковий опис`,
    );
    seen.set(description, cat.id);
  }
});

test("кожен кабінет має тексти сторінки міста", () => {
  for (const location of LOCATIONS) {
    const seo = CITY_SEO[location.slug];
    assert.ok(seo, `немає текстів для кабінету ${location.slug}`);
    assert.ok(
      seo.description.length <= DESCRIPTION_MAX,
      `${location.slug}: опис ${seo.description.length} символів`,
    );
  }
});

test("cityBySlug зводить адресу з текстами, а на чужому слагу мовчить", () => {
  const lviv = cityBySlug("lviv");
  assert.equal(lviv?.city, "Львів");
  // Адреса приходить із contacts.ts, відмінок — із CITY_SEO: сторінка міста
  // спирається на обидва, тож функція має злити їх в один об'єкт.
  assert.equal(lviv?.address, "вул. Зелена, 204б");
  assert.equal(lviv?.locative, "у Львові");

  assert.equal(cityBySlug("mordor"), null);
});

test("canonical лишається відносним, а OG-заголовок — повним", () => {
  const meta = pageMetadata({
    title: "Неврологічне тейпування",
    description: "Опис сторінки, достатньо довгий, щоб бути схожим на справжній.",
    path: "/poslugy/neuro",
  });

  // Відносний шлях: домен достроює `metadataBase`. Абсолютний тут означав би
  // другий екземпляр SITE_URL, який легко розсинхронити.
  assert.equal(meta.alternates?.canonical, "/poslugy/neuro");

  // `template` не діє на OG, тож назву студії дописуємо самі — інакше прев'ю
  // в месенджері не показує, чиє воно.
  assert.equal(
    meta.openGraph?.title,
    "Неврологічне тейпування · Kotova Taping",
  );
});

test("на головній OG-заголовок не дублює назву студії", () => {
  const meta = pageMetadata({
    title: "Kotova Taping — студія естетичного тейпування",
    description: SITE_DESCRIPTION,
    path: "/",
  });

  assert.equal(
    meta.openGraph?.title,
    "Kotova Taping — студія естетичного тейпування",
  );
});

test("noIndex закриває сторінку від індексації, а без нього поля немає", () => {
  const open = pageMetadata({
    title: "Відкрита",
    description: "Опис сторінки, достатньо довгий, щоб бути схожим на справжній.",
    path: "/open",
  });
  // Без прапорця сторінка не має власного `robots` — діє успадкований із
  // layout, де стоїть index/follow.
  assert.equal(open.robots, undefined);

  const closed = pageMetadata({
    title: "Закрита",
    description: "Опис сторінки, достатньо довгий, щоб бути схожим на справжній.",
    path: "/closed",
    noIndex: true,
  });
  assert.deepEqual(closed.robots, { index: false, follow: true });
});
