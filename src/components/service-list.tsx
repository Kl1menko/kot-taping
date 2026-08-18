import { TONE_CLASS, formatPrice, type Service } from "@/lib/services";
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
 *
 * Фото тут немає навмисно, хоч на лендінгу воно є. Знімок один на категорію, а
 * на цій сторінці всі картки — з однієї категорії: три однакові портрети в ряд
 * читаються як помилка верстки, та ще й під тим самим фото в героєві. Замість
 * нього — теплий блок кольору послуги: `sand`/`clay`/`blush` уже лежать у
 * даних, розрізняють сусідні картки й тримають ту саму палітру, що й лендінг.
 */
export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        // Не `serviceMeta`: він підставляє `badge`, коли немає `wear`, а бейдж
        // уже стоїть у кольоровому блоці — вийшов би той самий рядок двічі.
        const meta = service.wear;
        return (
          <li key={service.slug}>
            <article className="flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] motion-reduce:transform-none">
              {/* Кольоровий блок замість фото: він і розділяє сусідні картки, і
                  тримає ціну — найбільше число картки на найтихішому тлі. */}
              <div
                className={`relative flex min-h-[132px] items-end justify-between gap-3 overflow-hidden rounded-[20px] p-5 ${TONE_CLASS[service.tone]}`}
              >
                <span className="tnum text-[30px] leading-none sm:text-[34px]">
                  {formatPrice(service)}
                </span>
                {service.badge && (
                  <span className="rounded-full bg-surface/70 px-3 py-1.5 text-[13px] text-ink-muted">
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
