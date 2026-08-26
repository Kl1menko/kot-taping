/**
 * SEO-шар: заголовки, описи й канонічні адреси в одному місці.
 *
 * Метадані рознесені по сторінках швидко розповзаються: десь `metadataBase`
 * забули, десь canonical лишився відносним, десь OG-заголовок не збігається з
 * `<title>`. Тут — одна функція, яка збирає повний набір, і одне джерело
 * текстів для кожного маршруту.
 *
 * Довжини не випадкові: Google обрізає `<title>` приблизно на 60 символах, а
 * опис — на 155–160. Тексти нижче написані під ці межі, тож у видачі видно
 * речення цілком, а не хвіст із трьома крапками.
 */

import type { Metadata } from "next";
import { CATEGORIES, type ServiceCategory } from "./services.ts";
import { LOCATIONS } from "./contacts.ts";
import { cityLabel, getDictionary } from "./dictionary.ts";
import {
  DEFAULT_LOCALE,
  LOCALES,
  OG_LOCALE,
  localePath,
  type Locale,
} from "./i18n.ts";

export const SITE_NAME = "Kotova Taping";

/** Опис усього сайту — головна сторінка й фолбек для решти. */
export const SITE_DESCRIPTION =
  "Естетичне та лімфодренажне тейпування обличчя і тіла у Львові та Києві. " +
  "Індивідуальний підбір схем, гіпоалергенні матеріали, видимий результат " +
  "після першого сеансу.";

/**
 * Збирає метадані сторінки.
 *
 * `canonical` приймаємо відносним шляхом — `metadataBase` з кореневого layout
 * достроює домен сам. Абсолютні адреси тут були б дублюванням, яке легко
 * розсинхронити з `SITE_URL`.
 */
export function pageMetadata({
  locale = DEFAULT_LOCALE,
  title,
  description,
  path,
  keywords,
  image,
  noIndex,
}: {
  /** Мова сторінки. Визначає canonical, hreflang та og:locale. */
  locale?: Locale;
  /** Без суфікса «· Kotova Taping» — його додає `template` у layout. */
  title: string;
  description: string;
  /** Відносний шлях від кореня, з провідним «/». */
  path: string;
  keywords?: string[];
  /** Своя OG-картинка. Без неї береться `opengraph-image` маршруту. */
  image?: string;
  noIndex?: boolean;
}): Metadata {
  // OG-заголовок пишемо повністю: `template` на нього не поширюється, і без
  // назви студії прев'ю у месенджері втрачає, чиє воно.
  const ogTitle = path === "/" ? title : `${title} · ${SITE_NAME}`;

  /**
   * `hreflang` для обох мов + `x-default`.
   *
   * Без цього Google трактує /en як дубль головної й лишає у видачі лише
   * одну з версій — зазвичай не ту, якою людина шукала. `x-default` вказує,
   * куди вести тих, чия мова не збігається з жодною нашою.
   */
  const languages = Object.fromEntries(
    LOCALES.map((l) => [l, localePath(l, path)]),
  );

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        ...languages,
        "x-default": localePath(DEFAULT_LOCALE, path),
      },
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      url: localePath(locale, path),
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
    /**
     * `follow: true` попри `index: false` — навмисно: сторінку не показуємо у
     * видачі, але посиланням з неї даємо працювати далі. `nofollow` обірвав би
     * шлях краулера й нічого не додав: приховати сторінку достатньо `noindex`.
     */
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

// — Категорії послуг —

/**
 * Тексти сторінок категорій.
 *
 * Опис категорії — не переказ назви, а відповідь на запит, з яким людина
 * приходить: що це, кому підходить, чого чекати. Саме цей абзац бачить
 * пошуковик у сніпеті, тож він написаний як речення для людини, а не як
 * перелік ключів.
 *
 * `intro` показується на сторінці, `description` іде в `<meta>`. Вони різні
 * навмисно: у видачі потрібно 155 символів по суті, на сторінці — живий текст.
 */
export type CategorySeo = {
  /** Заголовок `<h1>` і `<title>`. Довший за назву категорії з меню. */
  heading: string;
  /** `<meta name="description">`, до ~160 символів. */
  description: string;
  /** Вступний абзац на сторінці. */
  intro: string;
  keywords: string[];
};

const CATEGORY_SEO_UK: Record<ServiceCategory, CategorySeo> = {
  muscle: {
    heading: "М'язеві корекції тейпами",
    description:
      "Тейпування спини, постави та діастазу: знеболення, підтримка й фіксація " +
      "фізіологічного положення. Разом із комплексом вправ. Львів і Київ.",
    intro:
      "М'язеве тейпування знімає навантаження з перевтомленого м'яза й утримує " +
      "суглоб у фізіологічному положенні. Тейп працює цілодобово — під одягом, " +
      "у русі та уві сні, — тож ефект накопичується між сеансами. До кожної " +
      "схеми додається комплекс вправ, який продовжує результат.",
    keywords: [
      "м'язеве тейпування",
      "тейпування спини",
      "тейпування постави",
      "тейпування діастазу",
      "кінезіотейпування",
    ],
  },
  neuro: {
    heading: "Неврологічне тейпування",
    description:
      "Комплексна робота з МДК та двохетапним тестуванням. Неврологічне " +
      "тейпування у студії Kotova Taping — Львів і Київ.",
    intro:
      "Неврологічне тейпування працює з м'язово-дистонічними компонентами: " +
      "схема будується після двохетапного тестування, а не за шаблоном. Це " +
      "означає, що аплікація враховує саме ваш патерн напруження, і після " +
      "сеансу ми перевіряємо, як тіло на неї відповіло.",
    keywords: [
      "неврологічне тейпування",
      "тейпування МДК",
      "кінезіотейпування неврологія",
    ],
  },
  "lymph-body": {
    heading: "Лімфодренажне тейпування тіла",
    description:
      "Живіт, руки, ноги, сідниці, груди: зменшення набряку й об'ємів, тургор " +
      "шкіри, ліфтинг-ефект. Пост-хірургія та лімфедема. Львів і Київ.",
    intro:
      "Лімфодренажна аплікація піднімає шкіру над фасцією й відкриває шлях " +
      "лімфі — набряк іде, об'єми зменшуються, шкіра підтягується. Тейп " +
      "тримається 14–16 днів і працює весь цей час, тому одна процедура дає " +
      "більше, ніж курс масажу тієї ж тривалості. Окремі схеми — для " +
      "післяопераційної реабілітації та лімфедеми після лімфодисекції.",
    keywords: [
      "лімфодренажне тейпування",
      "тейпування живота",
      "тейпування ніг",
      "лімфодренаж тіла",
      "тейпування від целюліту",
      "тейпування після операції",
      "лімфедема тейпування",
    ],
  },
  "lymph-face": {
    heading: "Лімфодренажне тейпування обличчя та шиї",
    description:
      "Усунення набряку обличчя, другого підборіддя й кілець Венери. Робота з " +
      "холкою. Курс або окрема процедура. Львів і Київ.",
    intro:
      "Набряк обличчя — це не «риси такі», а застій лімфи, який добре " +
      "піддається корекції. Аплікація на обличчя й шию знімає ранкову " +
      "одутлість, працює з другим підборіддям і кільцями Венери. Окрема схема " +
      "для холки повертає рухливість шиї та прибирає головний біль від застою " +
      "на сьомому шийному хребці.",
    keywords: [
      "лімфодренажне тейпування обличчя",
      "тейпування від набряків обличчя",
      "тейпування шиї",
      "тейпування холки",
      "друге підборіддя тейп",
    ],
  },
  "face-modeling": {
    heading: "Моделююче тейпування обличчя",
    description:
      "Кисетні зморшки, зморшки чола, лімфодренаж щік. Ліфтинг без ін'єкцій — " +
      "курсом, із видимим результатом. Львів і Київ.",
    intro:
      "Моделююче тейпування розслабляє м'яз, який утримує зморшку, і водночас " +
      "підтягує тканину над ним. Це не альтернатива ін'єкціям, а інший шлях: " +
      "повільніший, зате без голки й із поверненням природної мімікри. " +
      "Виконується курсом — 3, 5 або 10 процедур залежно від зони.",
    keywords: [
      "моделююче тейпування обличчя",
      "тейпування від зморшок",
      "кисетні зморшки тейп",
      "зморшки чола тейпування",
      "ліфтинг обличчя без ін'єкцій",
      "тейпування щік",
    ],
  },
  sets: {
    heading: "Курси тейпування обличчя",
    description:
      "Комплексні курси на 3, 5 і 7 процедур: зморшки чола, носогубні та " +
      "кисетні зморшки разом. Вигідніше за окремі зони. Львів і Київ.",
    intro:
      "Три зони обличчя в одному курсі: чоло, носогубна ділянка й область " +
      "навколо губ. Разом вони працюють краще, ніж поодинці, — обличчя " +
      "змінюється рівномірно, без ефекту однієї підтягнутої зони поруч із " +
      "рештою. Курс на 3, 5 або 7 процедур залежно від початкового стану.",
    keywords: [
      "курс тейпування обличчя",
      "набір тейпування",
      "тейпування трьох зон",
      "комплексне тейпування обличчя",
    ],
  },
};


/**
 * Англійські тексти категорій.
 *
 * Не переклад слово в слово: пошукові запити англійською інші, тож `keywords`
 * зібрані під них («kinesio taping face», «lymphatic taping»), а не
 * транслітеровані з українських. Медичні формулювання й терміни носіння
 * передані точно.
 */
const CATEGORY_SEO_EN: Record<ServiceCategory, CategorySeo> = {
  muscle: {
    heading: "Muscle taping",
    description:
      "Taping for the back, posture and diastasis: pain relief, support and " +
      "a physiological position held in place. With an exercise plan. Lviv " +
      "and Kyiv.",
    intro:
      "Muscle taping takes the load off an overworked muscle and holds the " +
      "joint in a physiological position. The tape works around the clock — " +
      "under clothing, in movement and in your sleep — so the effect builds " +
      "between sessions. Every application comes with an exercise plan that " +
      "carries the result further.",
    keywords: [
      "muscle taping",
      "kinesio taping back",
      "posture taping",
      "diastasis taping",
      "kinesiology taping",
    ],
  },
  neuro: {
    heading: "Neurological taping",
    description:
      "Comprehensive work with muscular dystonia and two-stage testing. " +
      "Neurological taping at Kotova Taping — Lviv and Kyiv.",
    intro:
      "Neurological taping addresses muscular-dystonic patterns: the " +
      "application follows two-stage testing rather than a template. That " +
      "means it accounts for your particular pattern of tension, and after " +
      "the session we check how your body responded.",
    keywords: [
      "neurological taping",
      "kinesio taping neurology",
      "muscular dystonia taping",
    ],
  },
  "lymph-body": {
    heading: "Body lymphatic drainage taping",
    description:
      "Abdomen, arms, legs, buttocks, chest: less swelling and volume, " +
      "better skin tone, a lifting effect. Post-surgery and lymphoedema. " +
      "Lviv and Kyiv.",
    intro:
      "A lymphatic drainage application lifts the skin above the fascia and " +
      "opens a path for the lymph — swelling subsides, volume goes down, the " +
      "skin tightens. The tape stays on for 14 to 16 days and works the whole " +
      "time, which is why one treatment does more than a course of massage of " +
      "the same length. Separate applications exist for post-operative " +
      "recovery and for lymphoedema after lymph node dissection.",
    keywords: [
      "lymphatic drainage taping",
      "abdominal taping",
      "leg taping",
      "body lymphatic drainage",
      "cellulite taping",
      "post surgery taping",
      "lymphedema taping",
    ],
  },
  "lymph-face": {
    heading: "Face and neck lymphatic drainage taping",
    description:
      "Reduces facial swelling, a double chin and neck rings. Work on the " +
      "upper back hump. As a course or a single treatment. Lviv and Kyiv.",
    intro:
      "Facial swelling is not simply your features — it is stagnant lymph, " +
      "and it responds well to treatment. An application across the face and " +
      "neck clears morning puffiness, works on a double chin and on the rings " +
      "around the neck. A separate application for the upper back hump " +
      "restores neck mobility and relieves the headaches that come from " +
      "congestion at the seventh cervical vertebra.",
    keywords: [
      "facial lymphatic drainage taping",
      "face taping for swelling",
      "neck taping",
      "double chin taping",
      "kinesio taping face",
    ],
  },
  "face-modeling": {
    heading: "Facial contouring tape",
    description:
      "Lip lines, forehead wrinkles, cheek lymphatic drainage. Lifting " +
      "without injections — as a course, with visible results. Lviv and Kyiv.",
    intro:
      "Contouring tape relaxes the muscle holding a wrinkle in place while " +
      "lifting the tissue above it. It is not a substitute for injections but " +
      "a different route: slower, yet with no needle and with natural " +
      "expression preserved. Done as a course of 3, 5 or 10 treatments " +
      "depending on the area.",
    keywords: [
      "facial contouring tape",
      "taping for wrinkles",
      "lip lines tape",
      "forehead wrinkles taping",
      "face lifting without injections",
      "cheek taping",
    ],
  },
  sets: {
    heading: "Facial taping courses",
    description:
      "Complete courses of 3, 5 and 7 treatments: forehead, nasolabial and " +
      "lip lines together. Better value than separate areas. Lviv and Kyiv.",
    intro:
      "Three areas of the face in a single course: the forehead, the " +
      "nasolabial area and around the mouth. Together they work better than " +
      "any one alone — the face changes evenly, without one lifted area " +
      "sitting next to the rest. A course of 3, 5 or 7 treatments depending " +
      "on where you start.",
    keywords: [
      "facial taping course",
      "taping set",
      "three zone taping",
      "complete facial taping",
    ],
  },
};

/** Тексти категорій потрібною мовою. */
export function categorySeo(
  id: ServiceCategory,
  locale: Locale = DEFAULT_LOCALE,
): CategorySeo {
  return (locale === "en" ? CATEGORY_SEO_EN : CATEGORY_SEO_UK)[id];
}

/** Ярлик категорії з меню — щоб не тягнути `CATEGORIES` у кожен компонент. */
export function categoryLabel(
  id: ServiceCategory,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (locale === "en") return getDictionary("en").categories[id].label;
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

// — Міста —

export type CitySeo = {
  /** Місто у місцевому відмінку: «у Львові», «у Києві». */
  locative: string;
  description: string;
  intro: string;
  keywords: string[];
  /** Орієнтири поруч — так сторінка відповідає на «де це». */
  landmark: string;
};

const CITY_SEO_UK: Record<string, CitySeo> = {
  lviv: {
    locative: "у Львові",
    description:
      "Студія естетичного тейпування у Львові, вул. Зелена, 204б. " +
      "Лімфодренаж обличчя й тіла, моделювання, м'язеві корекції. Запис за телефоном.",
    intro:
      "Львівський кабінет — на вул. Зеленій, 204б. Сюди приходять на " +
      "лімфодренаж обличчя перед подією, на курс моделювання й на роботу з " +
      "набряками тіла. Приймаю за попереднім записом, щоб на кожну людину " +
      "вистачило часу без поспіху.",
    keywords: [
      "тейпування Львів",
      "лімфодренажне тейпування Львів",
      "естетичне тейпування Львів",
      "тейпування обличчя Львів",
    ],
    landmark: "Зелена",
  },
  kyiv: {
    locative: "у Києві",
    description:
      "Студія естетичного тейпування у Києві, просп. Берестейський, 67А. " +
      "Лімфодренаж обличчя й тіла, моделювання, м'язеві корекції. Запис за телефоном.",
    intro:
      "Київський кабінет — на проспекті Берестейському, 67А. Той самий перелік " +
      "послуг і той самий підхід, що й у Львові: схема підбирається під запит, " +
      "а не за шаблоном. Приймаю за попереднім записом.",
    keywords: [
      "тейпування Київ",
      "лімфодренажне тейпування Київ",
      "естетичне тейпування Київ",
      "тейпування обличчя Київ",
    ],
    landmark: "Берестейський",
  },
};


/** Англійські тексти сторінок міст. Адреси транслітеровані, не перекладені. */
const CITY_SEO_EN: Record<string, CitySeo> = {
  lviv: {
    locative: "in Lviv",
    description:
      "Aesthetic taping studio in Lviv, 204b Zelena St. Face and body " +
      "lymphatic drainage, contouring, muscle support. Booking by phone.",
    intro:
      "The Lviv studio is at 204b Zelena Street. People come here for facial " +
      "lymphatic drainage before an event, for a course of contouring, and " +
      "for work on body swelling. By appointment only, so there is time for " +
      "everyone without rushing.",
    keywords: [
      "taping Lviv",
      "lymphatic drainage taping Lviv",
      "aesthetic taping Lviv",
      "face taping Lviv",
    ],
    landmark: "Zelena",
  },
  kyiv: {
    locative: "in Kyiv",
    description:
      "Aesthetic taping studio in Kyiv, 67A Beresteiskyi Ave. Face and body " +
      "lymphatic drainage, contouring, muscle support. Booking by phone.",
    intro:
      "The Kyiv studio is at 67A Beresteiskyi Avenue. The same list of " +
      "treatments and the same approach as in Lviv: the application is chosen " +
      "for your concern, not from a template. By appointment only.",
    keywords: [
      "taping Kyiv",
      "lymphatic drainage taping Kyiv",
      "aesthetic taping Kyiv",
      "face taping Kyiv",
    ],
    landmark: "Beresteiskyi",
  },
};

/**
 * Місто за slug — разом з адресою.
 *
 * Назва міста й адреса приходять зі словника, а не з `contacts.ts`: там вони
 * лише українською, і англійська сторінка показувала б «Львів» посеред
 * англійського тексту.
 */
export function cityBySlug(slug: string, locale: Locale = DEFAULT_LOCALE) {
  const location = LOCATIONS.find((l) => l.slug === slug);
  const seo = (locale === "en" ? CITY_SEO_EN : CITY_SEO_UK)[slug];
  if (!location || !seo) return null;

  const label = cityLabel(getDictionary(locale), slug);
  return {
    ...location,
    ...seo,
    city: label.city || location.city,
    address: label.address || location.address,
  };
}
