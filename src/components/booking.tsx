"use client";

import { useSearchParams } from "next/navigation";
import { CONTACTS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { BookingForm } from "./booking-form";
import type { Service } from "@/lib/services";
import { Card, SectionLabel } from "./ui";

export function Booking({ services }: { services: Service[] }) {
  const preselected = useSearchParams().get("service") ?? "";

  return (
    <Card as="section" id="booking">
      <div className="grid lg:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col justify-between bg-blush px-5 py-16 md:px-14 md:py-20 lg:pl-[var(--gutter-edge-lg)]">
          <div>
            <SectionLabel>Запис</SectionLabel>
            <h2 className="mt-8 max-w-[18ch] text-[30px] leading-[1.15] sm:text-[38px] lg:text-[42px]">
              Залиште заявку — підберемо зручний час
            </h2>
            <p className="mt-6 max-w-[38ch] text-[16px] leading-relaxed text-ink-muted">
              Це не миттєве бронювання: я переглядаю кожну заявку особисто й
              телефоную, щоб підтвердити дату та відповісти на запитання.
            </p>
          </div>

          <div className="mt-12">
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

        <div className="px-5 py-16 md:px-14 md:py-20 lg:pr-[var(--gutter-edge-lg)]">
          <BookingForm services={services} preselected={preselected} />
        </div>
      </div>
    </Card>
  );
}
