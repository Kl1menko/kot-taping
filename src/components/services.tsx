"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useBookingModal } from "./booking-modal";
import {
  CATEGORIES,
  TONE_CLASS,
  formatPrice,
  serviceImage,
  serviceMeta,
  type Service,
  type ServiceCategory,
} from "@/lib/services";
import { Card, Container, SectionLabel } from "./ui";
import type { Dictionary } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";

/**
 * Ширини картки й правило вибору — одні для самої картки і для прогріву.
 *
 * Розійдись вони, і прогрів тягнув би варіант, якого картка ніколи не
 * попросить: користь зникає, а трафік лишається.
 *
 * Список — те, що Next реально кладе в `srcset` для цього `sizes`: він бере
 * `imageSizes` + `deviceSizes` із `next.config.ts` і відкидає ширини, дрібніші
 * за найменший можливий розмір картки (128 і 200 сюди не потрапляють — навіть
 * на вузькому екрані картка ширша). Значення звірені з розміткою, а не
 * переписані з конфіга.
 */
const CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
const CARD_WIDTHS = [256, 300, 400, 640, 750, 828, 1080];

function ServiceCard({
  service,
  t,
  eager,
}: {
  service: Service;
  t: Dictionary;
  /** Перші картки — вантажаться одразу, не чекаючи на прокрут. */
  eager?: boolean;
}) {
  const meta = serviceMeta(service);
  const { open } = useBookingModal();
  return (
    <article className="flex h-full flex-col rounded-[26px] bg-surface p-3 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] motion-reduce:transform-none">
      {/* Tall portrait media tile, inset from the card edge */}
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-[20px] ${TONE_CLASS[service.tone]}`}
      >
        <Image
          src={serviceImage(service)}
          alt=""
          fill
          // Дві колонки на планшеті, три на десктопі — інакше браузер тягнув би
          // повнорозмірний файл під картку в 400px.
          sizes={CARD_SIZES}
          /**
           * Перший ряд карток вантажимо одразу.
           *
           * Секція обгорнута в `Reveal`, який до появи в кадрі тримає її
           * прозорою. Браузер не починає завантаження lazy-картинки в
           * невидимому блоці, тож фото стартували аж тоді, коли людина
           * докрутила — і перші пів секунди картка стояла порожньою.
           *
           * `priority` тут був би зайвим: він змагався б за канал із героєм,
           * який справді на першому екрані. Достатньо зняти відкладення.
           */
          loading={eager ? "eager" : "lazy"}
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
            aria-label={t.services.bookAria.replace("{service}", service.title)}
            className="group inline-flex min-h-[48px] min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-full bg-white/85 py-1.5 pl-4 pr-1.5 text-[15px] backdrop-blur transition-colors duration-200 hover:bg-white"
          >
            <span className="truncate">{t.services.book}</span>
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

/**
 * Прайс приходить пропсом із серверного компонента — джерело правди в базі,
 * тож правки в адмінці видно на сайті. Список категорій звужуємо до тих, у
 * яких справді є послуги: майстриня може сховати всю категорію, і порожня
 * вкладка виглядала б як помилка.
 */
export function Services({
  services,
  t,
  locale,
}: {
  services: Service[];
  t: Dictionary;
  locale: Locale;
}) {
  const categories = CATEGORIES.filter((cat) =>
    services.some((s) => s.category === cat.id),
  );

  // Перша непорожня категорія — щоб активна вкладка збігалася з тією, що
  // стоїть ліворуч, а не була четвертою всередині стрічки.
  const [active, setActive] = useState<ServiceCategory | null>(
    categories[0]?.id ?? null,
  );
  /**
   * Панель кожної категорії лишається в DOM — ховаємо неактивні через CSS.
   *
   * Раніше рендерилась тільки активна, тож при кліку картки монтувались
   * уперше, і фото починали вантажитись аж у цю мить: людина бачила порожні
   * плитки. Тепер розмітка готова заздалегідь, лишається дати браузеру
   * привід узятись за знімки — цим займається `warm` нижче.
   *
   * `hidden` знімає панель і з дерева доступності — читач з екрана бачить
   * рівно те саме, що й раніше.
   */
  const panels = categories.map((cat) => ({
    id: cat.id,
    items: services.filter((s) => s.category === cat.id),
  }));

  // Які категорії вже грілися. `useRef`, а не звичайний Set: він має пережити
  // рендер, інакше кожне наведення слало б ті самі запити наново.
  const warmed = useRef<Set<string>>(new Set());

  /**
   * Гріємо знімки категорії ще до кліку.
   *
   * `loading="lazy"` у прихованій панелі браузер не виконує — картинка
   * лишається незавантаженою, поки панель не покажуть. Тому просимо її
   * заздалегідь окремим `Image()`: відповідь лягає в кеш HTTP, і клік по
   * вкладці показує фото миттєво.
   *
   * Момент — наведення й фокус: до кліку лишаються сотні мілісекунд, яких
   * вистачає на 10 КБ AVIF, а на телефоні `touchstart` спрацьовує ще до
   * того, як палець відпустили.
   *
   * Ширину не вгадуємо: задаємо той самий `srcset` і `sizes`, що й у картці,
   * і браузер вибирає з них рівно те, що потім запросить сама картка. Зашите
   * число тут промахувалось би саме там, де прогрів найпотрібніший — на
   * телефоні картка займає всю ширину, і при DPR 2 береться 828, а не 640.
   *
   * Адреси ведуть через `/_next/image`: оригінальний файл лежить за іншим
   * URL, і його кеш картці нічого не дає.
   */
  const warm = (category: ServiceCategory) => {
    if (category === active || warmed.current.has(category)) return;
    warmed.current.add(category);

    for (const service of services.filter((s) => s.category === category)) {
      const url = encodeURIComponent(serviceImage(service));
      const img = new window.Image();
      img.sizes = CARD_SIZES;
      img.srcset = CARD_WIDTHS.map(
        (w) => `/_next/image?url=${url}&w=${w}&q=75 ${w}w`,
      ).join(", ");
    }
  };

  if (categories.length === 0) return null;

  return (
    <Card
      as="section"
      id="services"
      className="scroll-mt-0 py-20 md:py-28"
    >
      <Container>
      <SectionLabel>{t.services.label}</SectionLabel>

      <h2 className="mt-6 max-w-[24ch] text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
        {t.services.title}
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
          aria-label={t.services.tabs}
          className="flex w-max gap-2 md:w-auto md:flex-wrap"
        >
          {categories.map((cat, i) => {
            const selected = cat.id === active;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${cat.id}`}
                id={`tab-${cat.id}`}
                onClick={() => setActive(cat.id)}
                onMouseEnter={() => warm(cat.id)}
                onFocus={() => warm(cat.id)}
                onTouchStart={() => warm(cat.id)}
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
                {t.categories[cat.id].label}
              </button>
            );
          })}
        </div>
      </div>

      {panels.map((panel, panelIndex) => (
        <div
          key={panel.id}
          id={`panel-${panel.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${panel.id}`}
          hidden={panel.id !== active}
          className="mt-12 flex flex-wrap justify-start gap-5"
        >
          {panel.items.map((service, i) => (
            <div
              key={service.slug}
              className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
            >
              {/* Перший ряд першої вкладки — без відкладення.

                  Умова навмисно про `index`, а не про активність панелі:
                  атрибут `loading` браузер читає при монтуванні, і зміна
                  lazy→eager після кліку вже нічого не робить. Фото решти
                  вкладок готує `warm` — вони приходять із кешу. */}
              <ServiceCard
                service={service}
                t={t}
                eager={panelIndex === 0 && i < 3}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Посилання на сторінку активної категорії.

          Головна — найвагоміша сторінка сайту, і саме звідси краулер має
          дійти до категорій. Заразом це відповідь людині, якій потрібен опис
          довший за картку: тут короткий прайс, там — розгорнутий текст. */}
      {active && (
        <div className="mt-12">
          <Link
            href={localePath(locale, `/poslugy/${active}`)}
            className="inline-flex min-h-[52px] items-center gap-3 rounded-full bg-canvas px-7 text-[15px] transition-colors duration-200 hover:bg-ink hover:text-white"
          >
            {t.services.more.replace(
              "{category}",
              t.categories[active].label,
            )}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
      </Container>
    </Card>
  );
}
