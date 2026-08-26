/**
 * Ядро двомовності: перелік локалей і робота з префіксом у шляху.
 *
 * Українська живе в корені (`/`, `/poslugy`), англійська — під префіксом
 * (`/en`, `/en/poslugy`). Асиметрія навмисна: сайт уже проіндексований без
 * префікса, і перенесення української на `/uk` обнулило б накопичені позиції
 * та зробило б редиректом кожне зовнішнє посилання.
 *
 * Технічно префікс усе одно є в обох випадках — у файловій системі маршрути
 * лежать під `app/[lang]`, а для української його підставляє `proxy.ts`
 * непомітним rewrite. Тому компоненти скрізь працюють з однією моделлю
 * «локаль + шлях», не знаючи про виняток.
 */

export const LOCALES = ["uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Мова за замовчуванням — та, що показується без префікса в URL. */
export const DEFAULT_LOCALE: Locale = "uk";

/** Скільки живе вибір мови, зроблений руками. Рік — як у типових cookie згоди. */
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Публічний шлях для локалі.
 *
 * Українська лишається без префікса, англійська отримує `/en`. Корінь `/`
 * англійською — це `/en`, а не `/en/`: зайвий слеш дав би дубль сторінки для
 * пошуковика.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? "/en" : `/en${clean}`;
}

/**
 * Мова з заголовка `Accept-Language`.
 *
 * Свій розбір, а не `Negotiator` із гайду: мов рівно дві, і тягнути дві
 * залежності в proxy заради цього немає сенсу — код у proxy виконується на
 * кожен запит, і кожен кілобайт там платний.
 *
 * Розбираємо за спаданням `q`: браузер може прислати `uk;q=0.9,en;q=1.0`, де
 * порядок у рядку не збігається з пріоритетом. Регіон відкидаємо — `en-GB` і
 * `en-US` для нас однакові.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((item) => item.tag && Number.isFinite(item.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    // Українська й російська ведуть на українську версію: російськомовний
    // відвідувач у цьому регіоні читає українською вільно, а англійська для
    // нього була б гіршим вибором, ніж мова сайту за замовчуванням.
    if (base === "uk" || base === "ru") return "uk";
    if (base === "en") return "en";
  }

  return DEFAULT_LOCALE;
}

/** `lang` і `hreflang` для розмітки: `uk` та `en` збігаються з BCP 47. */
export const HTML_LANG: Record<Locale, string> = { uk: "uk", en: "en" };

/** OG-локаль у форматі, якого чекає Facebook. */
export const OG_LOCALE: Record<Locale, string> = {
  uk: "uk_UA",
  en: "en_US",
};

/** Підпис мови в перемикачі — кожна назва власною мовою, як заведено. */
export const LOCALE_LABEL: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
};

/** Короткий підпис для компактного перемикача в шапці. */
export const LOCALE_SHORT: Record<Locale, string> = { uk: "UA", en: "EN" };

/**
 * Форма множини для локалі.
 *
 * Українська має три форми (1 послуга / 2 послуги / 5 послуг), англійська —
 * дві. Замість того щоб кожен викличний бік знав про цю різницю, беремо
 * форми зі словника переліком і вибираємо потрібну тут.
 *
 * `Intl.PluralRules` замість власних правил: він знає обидві мови й не
 * розсиплеться, якщо колись додасться третя. Українські категорії — `one`,
 * `few`, `many`; англійські — `one`, `other`.
 */
export function pluralForm(
  locale: Locale,
  n: number,
  forms: { one: string; few?: string; many: string },
): string {
  const rule = new Intl.PluralRules(locale).select(n);
  if (rule === "one") return forms.one;
  if (rule === "few" && forms.few) return forms.few;
  return forms.many;
}

/**
 * Форматування числа під локаль.
 *
 * `1 200` українською й `1,200` англійською — дрібниця, яку помічають одразу,
 * коли вона неправильна.
 */
export function formatNumber(locale: Locale, n: number): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "uk-UA");
}
