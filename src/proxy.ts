import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n";

/**
 * Визначення мови до рендеру сторінки.
 *
 * У Next 16 файл називається `proxy`, а не `middleware` — стара назва
 * позначена як deprecated.
 *
 * Модель маршрутів:
 *   /            → rewrite на /uk            (українська без префікса в URL)
 *   /en          → лишається як є
 *   /poslugy     → rewrite на /uk/poslugy
 *
 * Rewrite, а не redirect: адреса в рядку браузера не змінюється, тож
 * проіндексовані посилання лишаються чинними, а `app/[lang]` усе одно отримує
 * локаль параметром.
 *
 * Автовизначення працює один раз і тільки на корені. Перекидати людину з
 * будь-якої внутрішньої сторінки означало б ламати прямі посилання: хтось
 * надіслав /poslugy/lymph-face — і англомовний браузер відкрив би замість
 * цього іншу сторінку. На корені ж вибір мови нічого не коштує.
 *
 * Cookie запам'ятовує ЛИШЕ свідомий вибір — клік по перемикачу, який додає
 * `?lang=`. Раніше вона писалась на кожному перегляді /en, і це замикало
 * людину в англійській: клік на «UA» вів на «/», proxy бачив там `lang=en`
 * і кидав назад на /en. Вийти з такої петлі було неможливо.
 */

/** Позначка свідомого вибору мови — її ставить перемикач у посиланні. */
const CHOICE_PARAM = "lang";

/** Куди proxy не втручається: статика, API, службові файли, адмінка. */
const SKIP = /^\/(?:_next|api|admin|images|icons|video|favicon|sw\.js|manifest|robots|sitemap|opengraph-image)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP.test(pathname)) return NextResponse.next();

  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");
  const chosen = request.nextUrl.searchParams.get(CHOICE_PARAM);

  /**
   * Клік по перемикачу: запам'ятовуємо вибір і прибираємо позначку з адреси.
   *
   * Редирект, а не тихий запис: інакше `?lang=uk` лишався б у рядку браузера,
   * потрапляв у поділені посилання й дублював би сторінку для пошуковика.
   */
  if (chosen && isLocale(chosen)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(CHOICE_PARAM);

    const response = NextResponse.redirect(clean);
    response.cookies.set(LOCALE_COOKIE, chosen, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    // Ця відповідь несе персональну cookie — CDN не має роздавати її іншим.
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // Англійська вже в шляху — рендеримо як є.
  if (isEnglish) return NextResponse.next();

  /**
   * Корінь: одноразове автовизначення.
   *
   * Cookie має пріоритет над `Accept-Language`: якщо людина натиснула
   * перемикач, її вибір важливіший за налаштування системи — інакше кожен
   * захід на головну скидав би його назад.
   */
  if (pathname === "/") {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      saved && isLocale(saved)
        ? saved
        : localeFromAcceptLanguage(request.headers.get("accept-language"));

    if (locale !== DEFAULT_LOCALE) {
      const response = NextResponse.redirect(new URL("/en", request.url));
      // Рішення залежить від cookie та Accept-Language цього відвідувача —
      // спільний кеш віддавав би чужий вибір усім наступним.
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  // Українська: непомітний rewrite у сегмент [lang].
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}


export const config = {
  /**
   * Виключаємо статику й службові шляхи ще на рівні matcher, а не лише в коді:
   * без цього proxy виконувався б на кожній картинці й кожному чанку JS.
   *
   * `payment` — не статика, а сторінка повернення з банку. Вона лежить поза
   * сегментом [lang], бо адресу задає monobank у `redirectUrl` і мовного
   * префікса там не буде ніколи. Без цього виключення proxy переписував її
   * на /uk/payment/done, якого не існує, — і клієнтка бачила 404 одразу
   * після оплати, тобто рівно в той момент, коли їй потрібне підтвердження.
   */
  matcher: [
    "/((?!_next/static|_next/image|api|admin|payment|images|icons|video|favicon.ico|sw.js).*)",
  ],
};
