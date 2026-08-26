"use client";

import { useEffect } from "react";
import { HTML_LANG, type Locale } from "@/lib/i18n";

/**
 * Виставляє `lang` на `<html>` для англійських сторінок.
 *
 * `<html>` рендериться кореневим layout'ом, який лежить вище сегмента
 * `[lang]` — під ним є ще адмінка й /payment, тож перенести його всередину
 * не можна, а `next/root-params` без цього не працює.
 *
 * Атрибут важливий не для вигляду, а для читачів з екрана: із `lang="uk"`
 * англійський текст озвучується українською вимовою й стає нерозбірливим.
 * Він же підказує браузеру, чи пропонувати переклад сторінки.
 *
 * Серверна розмітка приходить із `lang="uk"`, і для англійської сторінки цей
 * ефект виправляє його одразу після гідратації. Для пошуковика цього досить:
 * Google виконує JS, а головний сигнал мови для нього — `hreflang` у `<head>`
 * і сам текст сторінки, які віддаються правильними вже в HTML.
 */
export function HtmlLang({
  locale,
  skipToContent,
}: {
  locale: Locale;
  /** Підпис посилання «пропустити навігацію» мовою сторінки. */
  skipToContent: string;
}) {
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];

    // Посилання живе в кореневому layout — вище сегмента [lang], тож на
    // сервері воно завжди українське. Для читача з екрана англійської
    // сторінки це перше, що озвучується, тож підпис має збігатися з мовою.
    const skip = document.querySelector<HTMLAnchorElement>('a[href="#main"]');
    if (skip) skip.textContent = skipToContent;
  }, [locale, skipToContent]);

  return null;
}
