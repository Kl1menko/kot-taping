import Image from "next/image";
import {
  TONE_CLASS,
  formatPrice,
  serviceMeta,
  type Service,
} from "@/lib/services";
import { BookNowButton } from "./book-now-button";

/**
 * Перелік послуг категорії.
 *
 * Серверний компонент, на відміну від секції на лендінгу: на сторінці категорії
 * немає вкладок, отже немає й стану, а весь текст має лежати в HTML одразу —
 * саме його читає краулер. Кнопка запису лишається клієнтською, але вона одна
 * й маленька, а не обгортка над усім списком.
 *
 * Розмітка `<article>` на кожну картку — не для краси: список послуг зі
 * `<h3>`, ціною та описом читається з екрана як окремі одиниці, а не як суцільне
 * полотно тексту.
 */
export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service, i) => {
        const meta = serviceMeta(service);
        return (
          <li key={service.slug}>
            <article className="flex h-full flex-col rounded-[26px] bg-surface p-3">
              <div
                className={`relative aspect-[4/5] overflow-hidden rounded-[20px] ${TONE_CLASS[service.tone]}`}
              >
                <Image
                  src={`/images/services/${service.category}.jpg`}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  // Перші дві картки вантажимо звичайно, решту — ліниво.
                  // Верхні дві часто потрапляють у перший екран і тоді
                  // визначають LCP, а `loading="lazy"` на них його відкладає.
                  loading={i < 2 ? "eager" : "lazy"}
                  className="object-cover"
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/25 to-transparent"
                />

                <div className="absolute inset-x-3 bottom-3 flex items-center justify-end">
                  <span className="tnum grid min-h-[44px] shrink-0 place-items-center whitespace-nowrap rounded-full bg-ink px-4 text-[15px] text-white">
                    {formatPrice(service)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-1 flex-col rounded-[20px] bg-canvas p-5">
                <h3 className="text-[19px] leading-snug">{service.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                  {service.summary}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                  {meta ? (
                    <span className="tnum text-[14px] text-ink-muted">
                      <span aria-hidden="true">/ </span>
                      {meta}
                    </span>
                  ) : (
                    <span />
                  )}
                  <BookNowButton
                    service={service.slug}
                    aria-label={`Записатись на «${service.title}»`}
                  >
                    Записатись
                  </BookNowButton>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
