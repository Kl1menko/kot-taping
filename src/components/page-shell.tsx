import type { ReactNode } from "react";
import { BookingModalProvider } from "./booking-modal";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MobileCta } from "./mobile-cta";
import { Card } from "./ui";
import type { Service } from "@/lib/services";
import type { WorkingDay } from "@/lib/schedule";

/**
 * Каркас внутрішньої сторінки.
 *
 * Лендінг має власний, зрощений із героєм: там шапка лежить усередині першого
 * екрана. Внутрішнім сторінкам потрібне інше — звичайна шапка, вміст, футер, —
 * і повторювати цю обв'язку в кожному маршруті означало б розсинхрон при
 * першій же правці.
 *
 * Крихти живуть у `PageHero`, а не тут: окремою смужкою над героєм вони
 * розрізали сторінку зайвим швом, якого немає на головній.
 *
 * `services` і `schedule` ідуть у провайдер модалки: анкета запису
 * відкривається з будь-якої сторінки, і їй потрібні той самий прайс і той
 * самий графік робочих днів, що й на головній.
 */
export function PageShell({
  children,
  services,
  schedule,
}: {
  children: ReactNode;
  services: Service[];
  /** Графік для анкети — так само, як прайс: потрібен на кожній сторінці. */
  schedule?: Record<string, WorkingDay[]>;
}) {
  return (
    <BookingModalProvider services={services} schedule={schedule}>
      {/* Шапка на своєму тлі, без лінії знизу: герой під нею білий, і межа
          між ними була б рискою впоперек порожнього місця. */}
      <Card as="div">
        <SiteHeader />
      </Card>

      <main id="main" className="pb-24 md:pb-0">
        {children}

        <SiteFooter />
      </main>

      <MobileCta />
    </BookingModalProvider>
  );
}
