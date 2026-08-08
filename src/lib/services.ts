/**
 * Каталог послуг для публічного сайту.
 *
 * Дані взято з реального прайсу студії. Коли з'явиться адмінка, ці рядки
 * переїдуть у Supabase, а цей файл стане seed-скриптом.
 */

export type ServiceCategory =
  | "muscle"
  | "neuro"
  | "lymph-body"
  | "lymph-face"
  | "face-modeling"
  | "sets";

export type Service = {
  slug: string;
  title: string;
  summary: string;
  /** Гривні. Разом із `priceFrom` дає «від 2200 ₴». */
  price: number;
  /** Ціна залежить від розміру / обсягу роботи — показуємо «від». */
  priceFrom?: boolean;
  /** Скільки тримається тейп. Порожньо, якщо в прайсі не вказано. */
  wear?: string;
  /** Підпис-бейдж під ціною: розмір або формат курсу. */
  badge?: string;
  category: ServiceCategory;
  /** Фон медіа-блоку картки. */
  tone: "sand" | "clay" | "blush";
};

export const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: "muscle", label: "М'язеві корекції" },
  { id: "neuro", label: "Неврологічні" },
  { id: "lymph-body", label: "Лімфодренаж тіла" },
  { id: "lymph-face", label: "Лімфодренаж обличчя" },
  { id: "face-modeling", label: "Моделювання обличчя" },
  { id: "sets", label: "Набори" },
];

export const SERVICES: Service[] = [
  // — М'язеві корекції —
  {
    slug: "znebolennya",
    title: "Знеболення",
    summary:
      "Додається комплекс спеціально розроблених вправ для пролонгування ефекту.",
    price: 800,
    wear: "5–10 днів",
    category: "muscle",
    tone: "sand",
  },
  {
    slug: "spyna",
    title: "Спина",
    summary: "Знеболення, підтримка, фіксація + комплекс вправ.",
    price: 800,
    wear: "5–10 днів",
    category: "muscle",
    tone: "clay",
  },
  {
    slug: "postava",
    title: "Постава",
    summary:
      "Фіксація фізіологічного положення. Підходить для всіх вікових груп, + комплекс вправ.",
    price: 800,
    wear: "5–10 днів",
    category: "muscle",
    tone: "blush",
  },
  {
    slug: "diastaz",
    title: "Діастаз",
    summary:
      "М'язева корекція при розходженні прямого м'яза живота. Виконується курсом.",
    price: 800,
    badge: "Розмір універсальний",
    category: "muscle",
    tone: "sand",
  },

  // — Неврологічні —
  {
    slug: "nevrologichni",
    title: "Неврологічні",
    summary: "Комплексна робота з МДК та двохетапним тестуванням.",
    price: 900,
    wear: "5–10 днів",
    category: "neuro",
    tone: "clay",
  },

  // — Лімфодренаж тіла —
  {
    slug: "lymph-belly-single",
    title: "Живіт — одинарне",
    summary:
      "З кожного боку по 1 стрічці 5 см, порізаній на дрібні смужки. Розтяжки, зменшення об'ємів, тургор шкіри, ліфтинг-ефект.",
    price: 2200,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "blush",
  },
  {
    slug: "lymph-belly-double",
    title: "Живіт — подвійне",
    summary:
      "По дві стрічки 5 см спереду та ззаду — охоплює весь торс по колу. Розтяжки, об'єми, тургор, ліфтинг.",
    price: 3000,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "sand",
  },
  {
    slug: "lymph-chest",
    title: "Груди",
    summary:
      "Усунення розтяжок, покращення тургору, ліфтинг-ефект, відновлення тонусу й однорідного кольору шкіри.",
    price: 2500,
    wear: "14–16 днів",
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "clay",
  },
  {
    slug: "post-surgery",
    title: "Пост-хірургія",
    summary:
      "Зменшення післяопераційного набряку та больових відчуттів, пришвидшення реабілітації, попередження гематом.",
    price: 2000,
    wear: "10–14 днів",
    category: "lymph-body",
    tone: "blush",
  },
  {
    slug: "lymph-arms-single",
    title: "Руки — одинарне",
    summary:
      "З кожного боку по 1 стрічці 2.5 см, порізаній на смужки. Набряк, об'єми, тургор, ліфтинг (пост-онкологія, лімфедема).",
    price: 1700,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "sand",
  },
  {
    slug: "lymph-arms-double",
    title: "Руки — подвійне",
    summary:
      "По дві стрічки 5 см спереду та ззаду — охоплює всю руку. Для пост-онкологічних пацієнтів з лімфедемою після лімфодисекції.",
    price: 2200,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "clay",
  },
  {
    slug: "lymph-hips-single",
    title: "Бедра — одинарне",
    summary:
      "Одна стрічка 5 см на кожну ногу. Целюліт, зменшення об'ємів, тургор шкіри, ліфтинг-ефект.",
    price: 3200,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "blush",
  },
  {
    slug: "lymph-hips-double",
    title: "Бедра — подвійне",
    summary:
      "Дві стрічки 5 см на кожну ногу. Целюліт, зменшення об'ємів, тургор, ліфтинг-ефект.",
    price: 5600,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "sand",
  },
  {
    slug: "lymph-legs-double",
    title: "Ноги — подвійне",
    summary:
      "Дві стрічки 5 см на кожну ногу по всій довжині. Целюліт, об'єми, тургор, ліфтинг-ефект.",
    price: 7200,
    priceFrom: true,
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "clay",
  },
  {
    slug: "lymph-calves",
    title: "Гомілки",
    summary:
      "Комплекс вправ для пролонгування ефекту + моніторинг результату «до-після» у форматі фото-відео та замірів у см.",
    price: 1800,
    priceFrom: true,
    wear: "14–16 днів",
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "blush",
  },
  {
    slug: "lymph-glutes",
    title: "Сідниці",
    summary:
      "Комплекс вправ для пролонгування ефекту + моніторинг результату «до-після» у форматі фото-відео та замірів у см.",
    price: 1600,
    priceFrom: true,
    wear: "14–16 днів",
    badge: "Розмір S-M-L",
    category: "lymph-body",
    tone: "sand",
  },
  {
    slug: "scars",
    title: "Шрами",
    summary:
      "Точковий лімфодренаж. Пришвидшує реабілітацію та загоєння, покращує трофіку ушкодженої ділянки. Виконується курсом.",
    price: 800,
    badge: "Розмір універсальний",
    category: "lymph-body",
    tone: "clay",
  },

  // — Лімфодренаж обличчя —
  {
    slug: "lymph-face-neck",
    title: "Обличчя + шия",
    summary:
      "Комплекс вправ для пролонгування ефекту + моніторинг результату «до-після» у форматі фото-відео.",
    price: 1500,
    wear: "14–16 днів",
    badge: "Розмір універсальний",
    category: "lymph-face",
    tone: "blush",
  },
  {
    slug: "kholka",
    title: "Холка",
    summary:
      "Забирає набряк на 7-му шийному хребці, усуває головний біль, покращує кровопостачання до голови, знімає біль у шийному відділі.",
    price: 1500,
    badge: "Розмір S-M-L",
    category: "lymph-face",
    tone: "sand",
  },
  {
    slug: "lymph-face-course",
    title: "Лімфодренаж обличчя та шиї",
    summary:
      "Усунення набряку з обличчя, 2-го підборіддя, кілець Венери; покращення загальної якості шкіри. Для ургентних набряків у післяопераційному періоді.",
    price: 3000,
    badge: "Курс 3 процедури",
    category: "lymph-face",
    tone: "clay",
  },

  // — Моделювання обличчя —
  {
    slug: "cheeks",
    title: "Лімфодренаж щік",
    summary:
      "Усунення набряку з середньої та нижньої третини обличчя. Для зменшення носогубних валиків та після стоматології.",
    price: 2000,
    badge: "Курс 5 процедур",
    category: "face-modeling",
    tone: "blush",
  },
  {
    slug: "purse-wrinkles",
    title: "Кисетні зморшки",
    summary:
      "Тейп моделюючий для усунення кисетних зморшок навколо губ та розслаблення колового м'яза рота.",
    price: 1000,
    badge: "Курс 5 процедур",
    category: "face-modeling",
    tone: "sand",
  },
  {
    slug: "forehead-wrinkles",
    title: "Зморшки чола",
    summary:
      "Тейп моделюючий для розгладження горизонтальних зморшок на чолі та розслаблення лобного черевця потиличного м'яза.",
    price: 1000,
    badge: "Курс 10 процедур",
    category: "face-modeling",
    tone: "clay",
  },

  // — Набори для моделювання обличчя —
  {
    slug: "set-3-zones-3",
    title: "3 зони — курс на 3 процедури",
    summary: "Зморшки чола + носогубна зморшки + кисетні зморшки.",
    price: 2100,
    badge: "Курс 3 процедури",
    category: "sets",
    tone: "blush",
  },
  {
    slug: "set-3-zones-5",
    title: "3 зони — курс на 5 процедур",
    summary: "Зморшки чола + носогубна зморшки + кисетні зморшки.",
    price: 3300,
    badge: "Курс 5 процедур",
    category: "sets",
    tone: "sand",
  },
  {
    slug: "set-3-zones-7",
    title: "3 зони — курс на 7 процедур",
    summary: "Зморшки чола + носогубна зморшки + кисетні зморшки.",
    price: 6300,
    badge: "Курс 7 процедур",
    category: "sets",
    tone: "clay",
  },
];

export const TONE_CLASS: Record<Service["tone"], string> = {
  sand: "bg-sand",
  clay: "bg-clay",
  blush: "bg-blush",
};

export function formatPrice(service: Pick<Service, "price" | "priceFrom">) {
  const value = `${service.price.toLocaleString("uk-UA")} ₴`;
  return service.priceFrom ? `від ${value}` : value;
}

/** Правий підпис у блоці опису: тривалість носіння або формат. */
export function serviceMeta(service: Service) {
  return service.wear ?? service.badge ?? null;
}
