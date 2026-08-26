import type { ServiceCategory } from "./services";

/**
 * Колір картки запису — за категорією послуги.
 *
 * Палітра та сама, що на лендінгу (пісок / глина / рум'янець) плюс два
 * похідні відтінки: календар має читатись як частина того ж проєкту, а не
 * як окремий застосунок. Колір несе інформацію (тип роботи), тому пари
 * підібрані так, щоб сусідні категорії не зливались.
 */

export type Tone = {
  bg: string;
  /** Кант ліворуч — єдиний насичений елемент. */
  bar: string;
  hover: string;
};

const TONES: Record<ServiceCategory, Tone> = {
  muscle: {
    bg: "bg-[#f2e6dc]",
    bar: "bg-[#a87f5e]",
    hover: "hover:bg-[#ecdccd]",
  },
  neuro: {
    bg: "bg-[#e7e4dd]",
    bar: "bg-[#7d7a6d]",
    hover: "hover:bg-[#dedbd2]",
  },
  "lymph-body": {
    bg: "bg-[#f6ece9]",
    bar: "bg-[#c08a7f]",
    hover: "hover:bg-[#f0e0db]",
  },
  "lymph-face": {
    bg: "bg-[#eee7ee]",
    bar: "bg-[#8e7a90]",
    hover: "hover:bg-[#e6dbe6]",
  },
  "face-modeling": {
    bg: "bg-[#e8ecea]",
    bar: "bg-[#6f8580]",
    hover: "hover:bg-[#dee4e1]",
  },
  sets: {
    bg: "bg-[#efeade]",
    bar: "bg-[#9a8c63]",
    hover: "hover:bg-[#e7e0cf]",
  },
};

/** Нейтральний варіант — для послуг, категорія яких випала з довідника. */
const FALLBACK: Tone = {
  bg: "bg-canvas",
  bar: "bg-ink-muted",
  hover: "hover:bg-sand",
};

export function toneFor(category: string): Tone {
  return TONES[category as ServiceCategory] ?? FALLBACK;
}

/** Скасовані записи втрачають колір: слот вільний, і це має бути видно. */
export const CANCELLED_TONE: Tone = {
  bg: "bg-canvas",
  bar: "bg-line",
  hover: "hover:bg-canvas",
};
