import Image from "next/image";
import { TONE_CLASS, formatPrice, type Service } from "@/lib/services";
import { BookNowButton } from "./book-now-button";
import type { Dictionary } from "@/lib/dictionary";

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
 *
 * Фото показуємо лише власне — те, що майстриня завантажила саме цій послузі.
 * Спільний знімок категорії тут навмисно не підставляємо (на відміну від
 * лендінгу): на цій сторінці всі картки з однієї категорії, і три однакові
 * портрети в ряд читаються як помилка верстки, та ще й під тим самим фото в
 * героєві. Без власного фото лишається теплий блок кольору послуги —
 * `sand`/`clay`/`blush` уже в даних, розрізняють сусідні картки й тримають ту
 * саму палітру, що й лендінг.
 */
export function ServiceList({
  services,
  t,
}: {
  services: Service[];
  t: Dictionary;
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        // Не `serviceMeta`: він підставляє `badge`, коли немає `wear`, а бейдж
        // уже стоїть у кольоровому блоці — вийшов би той самий рядок двічі.
        const meta = service.wear;
        return (
          <li key={service.slug}>
            <article className="flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none">
              {/* Блок кольору тримає ціну — найбільше число картки на
                  найтихішому тлі. Є власне фото — воно лягає під той самий
                  блок, а колір лишається тлом, поки знімок вантажиться, і
                  проступає крізь затемнення знизу. Тому висота тут росте до
                  портретної: під фото смужка в 132px виглядала б обрізком. */}
              <div
                className={`relative flex items-end justify-between gap-3 overflow-hidden rounded-[20px] p-5 ${TONE_CLASS[service.tone]} ${service.image ? "aspect-[4/3]" : "min-h-[132px]"}`}
              >
                {service.image && (
                  <>
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    {/* Ціна лежить поверх знімка, і на світлому фото темний
                        текст інакше зливається з тлом. */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/45 to-transparent"
                    />
                  </>
                )}

                <span
                  className={`tnum relative text-[30px] leading-none sm:text-[34px] ${service.image ? "text-white" : ""}`}
                >
                  {formatPrice(service)}
                </span>
                {service.badge && (
                  <span className="relative rounded-full bg-surface/70 px-3 py-1.5 text-[13px] text-ink-muted backdrop-blur">
                    {service.badge}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-1 flex-col rounded-[20px] bg-canvas p-5">
                <h3 className="text-[19px] leading-snug">{service.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                  {service.summary}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
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
                    aria-label={t.services.bookAria.replace("{service}", service.title)}
                  >
                    {t.services.book}
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
