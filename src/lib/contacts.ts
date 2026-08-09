/**
 * Contact details and social profiles.
 * Source: https://linktr.ee/KotovaTaping
 */

export const CONTACTS = {
  email: "kotova.taping@gmail.com",
  phone: "+380506568341",
  phoneDisplay: "+380 50 656 83 41",
  /** External booking system currently used by the studio. */
  booking: "https://easyweek.com.ua/kotova-taping?source=4",
  /** Google Form for ordering a home-care tape kit. */
  orderKit:
    "https://docs.google.com/forms/d/e/1FAIpQLSeEXn3IaKKQPkLaDWCGClrP-QGrLFp8iF7_L3ZyMNdX7KJ3GA/viewform",
} as const;

/**
 * Кабінети студії. Джерело — сторінка студії на EasyWeek.
 * Після міграції 0002 ці ж рядки живуть у таблиці `locations`; тут вони
 * лишаються для публічного сайту й як seed.
 */
export const LOCATIONS: {
  slug: string;
  city: string;
  address: string;
}[] = [
  { slug: "lviv", city: "Львів", address: "вул. Зелена, 204б" },
  { slug: "kyiv", city: "Київ", address: "просп. Берестейський, 67А" },
];

export type SocialId = "instagram" | "telegram" | "tiktok" | "facebook";

export const SOCIALS: {
  id: SocialId;
  label: string;
  href: string;
  handle: string;
}[] = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/kotova_taping",
    handle: "@kotova_taping",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/viktoriialotovva",
    handle: "@viktoriialotovva",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://tiktok.com/@kotova_taping",
    handle: "@kotova_taping",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/kotova.taping",
    handle: "kotova.taping",
  },
];
