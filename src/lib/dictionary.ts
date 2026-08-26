import { uk } from "./dictionaries/uk.ts";
import { en } from "./dictionaries/en.ts";
import { DEFAULT_LOCALE, type Locale } from "./i18n.ts";

/**
 * Форма словника задається українським файлом.
 *
 * Через це англійський не може мовчки загубити ключ або вкласти масив іншої
 * довжини — розбіжність ловиться при збірці. Напрямок саме такий, бо
 * український текст пишеться першим, а англійський за ним услід.
 *
 */
export type Dictionary = typeof uk;

const DICTIONARIES: Record<Locale, Dictionary> = { uk, en };

/**
 * Словник для локалі.
 *
 * Синхронна, а не `async` як у гайді Next: обидва словники — звичайні модулі,
 * що потрапляють у серверний бандл. Динамічний `import()` економив би трафік
 * лише в клієнтському бандлі, а сюди словник приходить пропсом уже готовим.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Опис фото галереї за шляхом до файлу.
 *
 * Ключ — ім'я файлу без розширення: у `gallery.ts` лишається лише перелік
 * знімків, а тексти живуть у словнику разом з рештою. Незнайомий файл
 * (додали восьме фото, підпис ще не написали) віддає те, що вказано в
 * `gallery.ts`, тож нова картка не лишається без `alt`.
 */
export function photoText(
  t: Dictionary,
  src: string,
  fallback: { alt: string; caption?: string },
) {
  const name = src.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  return (
    t.gallerySection.items[name as keyof Dictionary["gallerySection"]["items"]] ??
    fallback
  );
}

/**
 * Місто зі словника за slug'ом із бази.
 *
 * `LOCATIONS[].slug` типізований як `string`, бо кабінети живуть у таблиці, а
 * не в переліку — тож індексувати ним словник напряму не можна. Незнайомий
 * slug (додали третій кабінет, переклад ще не написали) віддає порожні рядки,
 * і викликач показує дані з БД замість того, щоб упасти.
 */
export function cityLabel(t: Dictionary, slug: string) {
  return (
    t.cities[slug as keyof Dictionary["cities"]] ?? { city: "", address: "" }
  );
}
