import type { ReactNode } from "react";
import { BookingModalProvider } from "./booking-modal";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MobileCta } from "./mobile-cta";
import { Breadcrumbs } from "./breadcrumbs";
import { Card, Container } from "./ui";
import type { Service } from "@/lib/services";

/**
 * Каркас внутрішньої сторінки.
 *
 * Лендінг має власний, зрощений із героєм: там шапка лежить усередині першого
 * екрана. Внутрішнім сторінкам потрібне інше — звичайна шапка, крихти, вміст,
 * футер, — і повторювати цю обв'язку в кожному маршруті означало б розсинхрон
 * при першій же правці.
 *
 * `services` іде в провайдер модалки: анкета запису відкривається з будь-якої
 * сторінки, і їй потрібен той самий прайс, що й на головній.
 */
export function PageShell({
  children,
  services,
  trail,
}: {
  children: ReactNode;
  services: Service[];
  trail: { name: string; path: string }[];
}) {
  return (
    <BookingModalProvider services={services}>
      <Card as="div" className="border-b border-line">
        <SiteHeader />
      </Card>

      <main id="main" className="pb-24 md:pb-0">
        <Card as="div" tone="canvas" className="pt-6">
          <Container>
            <Breadcrumbs trail={trail} />
          </Container>
        </Card>

        {children}

        <SiteFooter />
      </main>

      <MobileCta />
    </BookingModalProvider>
  );
}
