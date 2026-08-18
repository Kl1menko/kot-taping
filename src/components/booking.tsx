"use client";

import { CONTACTS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { BookNowButton } from "./book-now-button";
import { Card, Container, SectionLabel } from "./ui";

/**
 * Секція запису: обіцянка й кнопка, а не сама анкета.
 *
 * Розгорнута форма займала цілий екран і робила кінець сторінки схожим на
 * бланк. Тепер анкета живе в тому самому модальному вікні, яке відкривають
 * картки послуг і липка кнопка на телефоні: один шлях до запису замість двох,
 * а поля показуються тоді, коли людина вже вирішила їх заповнювати.
 */
export function Booking() {
  return (
    <Card as="section" id="booking" tone="blush">
      <Container className="py-16 md:py-24">
        <SectionLabel>Запис</SectionLabel>

        {/* Заклик і контакти поруч: на телефоні стовпчиком, від lg — двома
            колонками, де ліва веде до дії, а права лишається довідкою. */}
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
          <div>
            <h2 className="max-w-[18ch] text-[30px] leading-[1.15] sm:text-[38px] lg:text-[42px]">
              Залиште заявку — підберемо зручний час
            </h2>
            <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-ink-muted">
              Це не миттєве бронювання: я переглядаю кожну заявку особисто й
              телефоную, щоб підтвердити дату та відповісти на запитання.
            </p>

            <div className="mt-10">
              <BookNowButton size="lg">Записатись на сеанс</BookNowButton>
            </div>
          </div>

          <div className="lg:pb-2">
            <dl className="space-y-3 text-[15px]">
              <div className="flex gap-3">
                <dt className="text-ink-muted">Пошта</dt>
                <dd>
                  <a
                    href={`mailto:${CONTACTS.email}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {CONTACTS.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-ink-muted">Графік</dt>
                <dd>Пн–Сб, 10:00–19:00</dd>
              </div>
            </dl>

            <nav aria-label="Соцмережі" className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${s.label} — ${s.handle}`}
                  className="grid size-11 place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
                >
                  <SocialIcon id={s.id} />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </Container>
    </Card>
  );
}
