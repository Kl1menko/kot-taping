"use client";

import { BookNowButton } from "./book-now-button";
import { Card, Container, SectionLabel } from "./ui";
import type { Dictionary } from "@/lib/dictionary";

/**
 * Секція запису: обіцянка й кнопка, а не сама анкета.
 *
 * Розгорнута форма займала цілий екран і робила кінець сторінки схожим на
 * бланк. Тепер анкета живе в тому самому модальному вікні, яке відкривають
 * картки послуг і липка кнопка на телефоні: один шлях до запису замість двох,
 * а поля показуються тоді, коли людина вже вирішила їх заповнювати.
 *
 * Пошта, графік і соцмережі звідси прибрані: вони дублювали підвал і
 * розтягували секцію на дві колонки, відтягуючи увагу від самої кнопки.
 */
export function Booking({ t }: { t: Dictionary }) {
  return (
    <Card as="section" id="booking" tone="blush">
      <Container className="py-16 md:py-24">
        <SectionLabel>{t.booking.label}</SectionLabel>

        <div className="mt-8">
          <h2 className="max-w-[18ch] text-[30px] leading-[1.15] sm:text-[38px] lg:text-[42px]">
            {t.booking.title}
          </h2>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-ink-muted">
            {t.booking.text}
          </p>

          <div className="mt-10">
            <BookNowButton size="lg">{t.booking.cta}</BookNowButton>
          </div>
        </div>
      </Container>
    </Card>
  );
}
