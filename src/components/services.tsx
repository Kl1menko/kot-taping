"use client";

import { useState } from "react";
import Image from "next/image";
import { useBookingModal } from "./booking-modal";
import {
  CATEGORIES,
  SERVICES,
  TONE_CLASS,
  formatPrice,
  serviceMeta,
  type Service,
  type ServiceCategory,
} from "@/lib/services";
import { Card, Container, SectionLabel } from "./ui";

function ServiceCard({ service }: { service: Service }) {
  const meta = serviceMeta(service);
  const { open } = useBookingModal();
  return (
    <article className="flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] motion-reduce:transform-none">
      {/* Tall portrait media tile, inset from the card edge */}
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-[20px] ${TONE_CLASS[service.tone]}`}
      >
        <Image
          src={`/images/services/${service.category}.jpg`}
          alt=""
          fill
          // Дві колонки на планшеті, три на десктопі — інакше браузер тягнув би
          // повнорозмірний файл під картку в 400px.
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />

        {/* Затемнення знизу: кнопка й ціна лежать поверх фото, і на світлому
            знімку білий пілл інакше зливається з тлом. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/25 to-transparent"
        />

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => open(service.slug)}
            aria-label={`Записатись на «${service.title}»`}
            className="group inline-flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-full bg-white/85 py-1.5 pl-4 pr-1.5 text-[15px] backdrop-blur transition-colors duration-200 hover:bg-white"
          >
            <span className="truncate">Записатись</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink ring-1 ring-inset ring-line transition-transform duration-200 group-hover:translate-x-0.5">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>

          <span className="tnum grid min-h-[48px] shrink-0 place-items-center whitespace-nowrap rounded-full bg-ink px-4 text-[15px] text-white">
            {formatPrice(service)}
          </span>
        </div>
      </div>

      {/* Caption block — its own rounded surface, as in the reference */}
      <div className="mt-3 flex min-h-[104px] flex-1 flex-col rounded-[20px] bg-canvas p-5">
        <h3 className="text-[19px] leading-snug">{service.title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
          {service.summary}
        </p>
        {meta && (
          <span className="tnum mt-auto pt-4 text-[14px] text-ink-muted">
            <span aria-hidden="true">/ </span>
            {meta}
          </span>
        )}
      </div>
    </article>
  );
}

export function Services() {
  // Перша категорія зі списку — щоб активна вкладка збігалася з тією, що
  // стоїть ліворуч, а не була четвертою всередині стрічки.
  const [active, setActive] = useState<ServiceCategory>(CATEGORIES[0].id);
  const visible = SERVICES.filter((s) => s.category === active);

  return (
    <Card
      as="section"
      id="services"
      className="scroll-mt-0 py-20 md:py-28"
    >
      <Container>
      <SectionLabel>Послуги</SectionLabel>

      <h2 className="mt-6 max-w-[24ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
        Схеми, підібрані під вашу задачу, а не за шаблоном
      </h2>

      {/* Numbered pill tabs from the reference. Six categories don't fit one
          mobile row, so the strip scrolls horizontally instead of wrapping.

          The strip bleeds into the container gutter so the first and last pill
          can sit flush with the screen edge while scrolling. `min-w-0` keeps
          the `w-max` row from widening this flex/grid ancestor, and
          `overscroll-x-contain` stops a swipe past the end from chaining out
          to the document. */}
      <div className="mt-10 -mx-5 min-w-0 overflow-x-auto overscroll-x-contain px-5 md:mx-0 md:overflow-x-visible md:px-0">
        <div
          role="tablist"
          aria-label="Категорії послуг"
          className="flex w-max gap-2 md:w-auto md:flex-wrap"
        >
          {CATEGORIES.map((cat, i) => {
            const selected = cat.id === active;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls="services-panel"
                id={`tab-${cat.id}`}
                onClick={() => setActive(cat.id)}
                className={[
                  "inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-5 text-[15px]",
                  "cursor-pointer transition-colors duration-200",
                  selected
                    ? "border-ink text-ink"
                    : "border-line text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                <span className="tnum text-[11px] text-ink-muted">
                  0{i + 1}
                </span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="services-panel"
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="mt-12 flex flex-wrap justify-start gap-5"
      >
        {visible.map((service) => (
          <div
            key={service.slug}
            className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
          >
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
      </Container>
    </Card>
  );
}
