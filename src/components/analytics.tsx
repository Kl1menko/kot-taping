"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Аналітика — усюди, крім адмінки.
 *
 * Кореневий layout обгортає і лендінг, і `/admin`, тож без цієї перевірки в
 * статистику щодня йшла б робота майстрині: десятки переглядів календаря,
 * заявок і карток клієнтів. Вони перебивали б реальні цифри вітрини — саме ті,
 * заради яких аналітику й ставлять.
 *
 * Заразом це питання приватності: адреси на кшталт `/admin/clients` з
 * переходами між картками не мають їхати ні в Google, ні у Vercel.
 *
 * Лічильників два, і вони не дублюються, а відповідають на різні питання.
 * Google Analytics — про людей і джерела: звідки прийшли, що дивились, скільки
 * дійшло до заявки. Vercel Web Analytics — про сторінки: перегляди без
 * cookies, тобто цифри лишаються й для тих, хто відхилив банер чи ріже
 * трекери, а вони ріжуть саме gtag. Speed Insights міряє Core Web Vitals на
 * реальних телефонах відвідувачок, а не в лабораторному Lighthouse.
 *
 * Клієнтський компонент, бо `usePathname` — хук. Решта тут теж клієнтські,
 * тож зайвої межі це не додає.
 */
export function Analytics({ gaId }: { gaId?: string }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Порожній ідентифікатор = лічильника немає: локально й у прев'ю
          статистика студії не має засмічуватись власними заходами. */}
      {gaId && <GoogleAnalytics gaId={gaId} />}
      {/* Vercel-скрипти вимикають себе самі поза продакшеном, тож окремої
          перевірки оточення їм не треба. */}
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
}
