"use client";

import { usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_SHORT,
  LOCALE_LABEL,
  type Locale,
} from "@/lib/i18n";

/**
 * Перемикач мови: два сегменти в одній пігулці.
 *
 * Не випадайка: мов рівно дві, і список, який треба спершу розкрити, щоб
 * побачити другий пункт, тут коштував би зайвий клік. Обидва варіанти видно
 * одразу, активний підсвічений — це той самий елемент, що й сегментований
 * контрол у налаштуваннях телефона.
 *
 * Посилання, а не кнопки: у кожної мови свій URL, тож перехід має працювати
 * з клавіатури, у новій вкладці й у пошуковій видачі. `<button>` забрав би
 * усе це заради того самого результату.
 *
 * Звичайний `<a>`, а не `<Link>`: зміна мови — це зміна документа цілком, і
 * потрібне повне перезавантаження. `<Link>` робить клієнтський перехід із
 * RSC-запитом, тож редирект із `Set-Cookie`, яким proxy запам'ятовує вибір,
 * до навігації не застосовувався — на проді перемикач «залипав» і не
 * повертав з англійської назад.
 */
export function LanguageSwitch({
  locale,
  label,
  tone = "light",
}: {
  locale: Locale;
  /** Підпис для читача екрана — своєю мовою, тому приходить зі словника. */
  label: string;
  /** `dark` — для темної панелі мобільного меню. */
  tone?: "light" | "dark";
}) {
  const pathname = usePathname();

  /**
   * Той самий шлях іншою мовою.
   *
   * `usePathname` у клієнті вже містить префікс `/en`, але для української
   * віддає шлях без префікса — саме так, як його бачить відвідувач, бо
   * українська підставляється rewrite'ом у proxy. Тому просто зрізаємо або
   * додаємо `/en`, не намагаючись вгадати внутрішній сегмент `[lang]`.
   */
  const pathFor = (target: Locale) => {
    const bare = pathname.startsWith("/en")
      ? pathname.slice(3) || "/"
      : pathname;
    if (target === DEFAULT_LOCALE) return bare;
    return bare === "/" ? "/en" : `/en${bare}`;
  };

  /**
   * `?lang=` — позначка свідомого вибору для `proxy.ts`: побачивши її, він
   * запише cookie й одразу прибере параметр із адреси.
   *
   * Через URL, а не записом у `document.cookie`: перехід лишається звичайним
   * посиланням (працює в новій вкладці, з клавіатури), а React Compiler не
   * пропускає запис у глобальний об'єкт із обробника події.
   */
  const hrefFor = (target: Locale) => {
    // Якір має лишатися в кінці адреси: `/#about?lang=uk` браузер прочитав би
    // як фрагмент «about?lang=uk», і параметр не дійшов би до proxy.
    const [path, hash] = pathFor(target).split("#");
    return `${path}?lang=${target}${hash ? `#${hash}` : ""}`;
  };

  const dark = tone === "dark";

  return (
    <nav
      aria-label={label}
      className={[
        "inline-flex shrink-0 items-center rounded-full p-[3px] text-[13px]",
        dark ? "bg-white/10" : "bg-canvas",
      ].join(" ")}
    >
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <a
            key={item}
            href={hrefFor(item)}
            hrefLang={item}
            // Активна мова — поточна сторінка, і це саме те, що `aria-current`
            // означає для читача екрана.
            aria-current={active ? "true" : undefined}
            title={LOCALE_LABEL[item]}
            className={[
              "grid min-h-[30px] min-w-[38px] place-items-center rounded-full px-2",
              "transition-colors duration-200",
              active
                ? dark
                  ? "bg-white text-ink"
                  : "bg-ink text-white"
                : dark
                  ? "text-white/60 hover:text-white"
                  : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {LOCALE_SHORT[item]}
          </a>
        );
      })}
    </nav>
  );
}
