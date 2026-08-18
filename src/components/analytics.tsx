"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Google Analytics — усюди, крім адмінки.
 *
 * Кореневий layout обгортає і лендінг, і `/admin`, тож без цієї перевірки в
 * статистику щодня йшла б робота майстрині: десятки переглядів календаря,
 * заявок і карток клієнтів. Вони перебивали б реальні цифри вітрини — саме ті,
 * заради яких аналітику й ставлять.
 *
 * Заразом це питання приватності: адреси на кшталт `/admin/clients` з
 * переходами між картками не мають їхати в Google.
 *
 * Клієнтський компонент, бо `usePathname` — хук. Сам `GoogleAnalytics` теж
 * клієнтський, тож зайвої межі це не додає.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
