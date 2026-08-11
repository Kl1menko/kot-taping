"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { GALLERY, type GalleryItem } from "@/lib/gallery";
import { Card, Container, SectionLabel } from "./ui";

/**
 * Галерея робіт — стрічка карток із перекриттям.
 *
 * На телефоні це горизонтальна прокрутка (як стрічка категорій у послугах), на
 * десктопі — «віяло»: картки заходять одна на одну й трохи нахилені, а центральна
 * стоїть прямо й вища за решту. Саме центральна й читається як головна.
 *
 * Клік відкриває фото на весь екран: на картці воно обрізане під однакову
 * пропорцію, і без перегляду деталь аплікації не роздивитись.
 */
export function Gallery() {
  const [active, setActive] = useState<number | null>(null);

  // Без фото секції немає — порожня рамка з підписом «Роботи» виглядала б як
  // помилка. Файли додаються у src/lib/gallery.ts.
  if (GALLERY.length === 0) return null;

  return (
    <Card as="section" id="gallery" tone="canvas" className="py-20 md:py-28">
      <Container>
        <SectionLabel>Роботи</SectionLabel>

        <h2 className="mx-auto mt-10 max-w-[26ch] text-center text-[30px] leading-[1.15] sm:text-[40px] lg:text-[46px]">
          Як це виглядає на практиці
        </h2>
      </Container>

      {/* Віяло навмисно ширше за екран: крайні картки зрізаються бічним краєм,
          і ряд читається як фрагмент довшої стрічки, а не як усе, що є.

          Ховаємо тільки горизонтальне переповнення (`overflow-x-clip`), а не
          все: звичайний `overflow-hidden` зрізав би ще й верх із низом — нахил
          крайніх карток, збільшену центральну та їхні тіні. Вертикальні поля
          дають цьому місце. `clip`, а не `auto`, щоб зайва ширина не вмикала
          горизонтальну прокрутку сторінки. */}
      <div className="mt-12 overflow-x-clip py-8 sm:py-10">
        <ul
          className="flex items-center justify-center"
          style={fanStyle()}
        >
          {GALLERY.map((item, i) => (
            <li key={item.src} className={cardCls(i, GALLERY.length)}>
              <GalleryCard
                item={item}
                priority={i < 3}
                onOpen={() => setActive(i)}
              />
            </li>
          ))}
        </ul>
      </div>

      {active !== null && (
        <Lightbox
          items={GALLERY}
          index={active}
          onClose={() => setActive(null)}
          onMove={setActive}
        />
      )}
    </Card>
  );
}

/**
 * Розкладка картки у віялі — однакова на всіх ширинах.
 *
 * Картки заходять одна на одну й нахилені від центру, центральна стоїть прямо
 * й трохи більша. Ширина й перекриття задаються змінними (див. `fanStyle`), тож
 * ряд однаково вписується і в 390 px телефона, і в десктоп.
 *
 * Підписи під картками у віялі не вміщаються (сусідні наїжджали б одна на
 * одну), тож назву показує перегляд на весь екран.
 */
function cardCls(index: number, total: number): string {
  const middle = Math.floor(total / 2);
  const offset = index - middle;
  const isMiddle = offset === 0;

  const base =
    "shrink-0 transition-transform duration-300 ease-[var(--ease-out-soft)]";

  // Одна-дві картки віяла не утворюють: ставимо їх рівно й з проміжком.
  if (total < 3) {
    return `${base} w-[min(64vw,240px)] sm:w-[280px] mx-2`;
  }

  // Центральна більша, тож і тінь під нею глибша — інакше вона «зависає»
  // на тій самій висоті, що й сусідні, і збільшення читається як помилка.
  const tilt = isMiddle
    ? "rotate-0 scale-105 drop-shadow-[0_24px_36px_rgba(0,0,0,0.22)]"
    : offset < 0
      ? "-rotate-3"
      : "rotate-3";

  // Ближчі до центру — вище в стосі, тож центральна не опиняється під сусідніми.
  const layer = ["z-0", "z-10", "z-20"][Math.max(0, 2 - Math.abs(offset))];

  return [
    base,
    "gallery-card",
    tilt,
    layer,
    "md:hover:z-30 md:hover:-translate-y-2 md:hover:rotate-0",
  ].join(" ");
}

/**
 * Ширина картки й перекриття — через CSS-змінні, а не фіксовані класи.
 *
 * Картка має власний розмір (не частку від контейнера), тож ряд свідомо ширший
 * за екран: крайні картки зрізаються, і видно, що стрічка триває. Розмір
 * росте з екраном — `clamp` тримає його між 132 px на телефоні й 260 px на
 * десктопі, щоб фото не ставало ні маркою, ні банером.
 *
 * Перекриття — частка ширини картки, а не окреме число: інакше при зміні
 * розміру картки віяло то розповзалося б, то злипалось.
 */
function fanStyle(): React.CSSProperties {
  return {
    // Верхня межа велика навмисно: на широкому екрані картки мають бути
    // великими, щоб ряд не вміщався й виходив за краї. Нижня тримає телефон
    // читабельним.
    ["--fan-card" as string]: "clamp(132px, 26vw, 420px)",
    ["--fan-overlap" as string]: "calc(var(--fan-card) * 0.28)",
  };
}

function GalleryCard({
  item,
  priority,
  onOpen,
}: {
  item: GalleryItem;
  priority: boolean;
  onOpen: () => void;
}) {
  // Підпис у віялі не малюємо: сусідні картки перекриваються, і підписи
  // наїжджали б один на одного. Назву показує перегляд на весь екран, а для
  // читача з екрана вона є в aria-label кнопки.
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        item.caption
          ? `Відкрити фото: ${item.caption}. ${item.alt}`
          : `Відкрити фото: ${item.alt}`
      }
      // Дві тіні: щільна близька відділяє картку від сусідньої в перекритті,
      // м'яка далека кладе віяло на площину — без неї картки здаються
      // наклейками на тлі.
      className="group block w-full cursor-pointer overflow-hidden rounded-[18px] bg-sand shadow-[0_2px_8px_-2px_rgba(0,0,0,0.18),0_24px_48px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5 sm:rounded-[24px]"
    >
      {/* Однакова пропорція в усіх карток — інакше віяло стало б нерівним.
          Кадр обрізається під неї, а повністю його показує перегляд по кліку. */}
      <div className="relative aspect-[3/4] bg-canvas">
        <Image
          src={item.src}
          alt={item.alt}
          fill
          // Збігається з `--fan-card` у fanStyle: браузер має обрати файл під
          // реальний розмір картки, а не під ширину екрана.
          sizes="(min-width: 1600px) 420px, (min-width: 640px) 26vw, 132px"
          priority={priority}
          className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] motion-reduce:transform-none"
        />
      </div>
    </button>
  );
}

/**
 * Перегляд на весь екран.
 *
 * Керується з клавіатури: Esc закриває, стрілки гортають — інакше з фокусом
 * усередині діалога звідти не вийти.
 */
function Lightbox({
  items,
  index,
  onClose,
  onMove,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onMove: (i: number) => void;
}) {
  const item = items[index];

  const move = useCallback(
    (delta: number) => {
      // По колу: з останнього — на перший, і навпаки.
      onMove((index + delta + items.length) % items.length);
    },
    [index, items.length, onMove],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, move]);

  // Портал вимагає DOM. Діалог і так з'являється лише після кліку, тобто вже
  // в браузері, але під час серверного рендера `document` не існує.
  if (typeof document === "undefined") return null;

  /**
   * Через портал у `<body>`.
   *
   * Секція галереї лежить усередині `Reveal`, який анімує `transform` — а
   * трансформований предок стає точкою відліку для `position: fixed`. Через це
   * діалог розтягувався по секції, а не по вікну: зверху й знизу лишались
   * світлі смуги сторінки. Портал виносить його з-під цього предка.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.caption ?? item.alt}
      // `dvh`, а не `vh`: на iOS адресний рядок ховається, і `100vh` вилазить
      // за екран разом із підписом.
      className="fixed inset-0 z-[200] h-[100dvh] w-screen bg-[#141414]/97 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Сітка: підпис унизу має своє місце, тож фото ніколи його не накриває
          і не притискається до краю. */}
      <div className="grid h-full grid-rows-[auto_1fr] gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4">
        {/* Назва послуги вгорі, поруч із лічильником: там її видно одразу, ще
            до того, як око піде розглядати аплікацію. Знизу вона забирала б у
            фото цілий рядок. */}
        <div className="flex items-center justify-between gap-4 px-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-snug text-white sm:text-[17px]">
              {item.caption ?? item.alt}
            </p>
            {items.length > 1 && (
              <p className="tnum mt-0.5 text-[13px] text-white/45">
                {index + 1} / {items.length}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* min-h-0 — щоб рядок сітки міг стискатись, а не розпирати сітку під
            власну висоту фото. */}
        <div
          className="relative flex min-h-0 items-center justify-center"
          // Клік у порожнє поле обабіч фото закриває перегляд — як і по тлу.
          onClick={onClose}
        >
          {items.length > 1 && (
            <>
              <Nav direction="prev" onClick={() => move(-1)} />
              <Nav direction="next" onClick={() => move(1)} />
            </>
          )}

          {/* Клік по самому фото не має закривати перегляд — лише по тлу.

              `fill` замість width/height: з ними `next/image` тримає власний
              розмір і фото лишалось острівцем посеред темного поля, хоч місця
              вистачало. Тепер воно розтягується на весь вільний рядок сітки, а
              `object-contain` не дає обрізати ані кадру. */}
          <Image
            key={item.src}
            src={item.src}
            alt={item.alt}
            fill
            sizes="100vw"
            // `object-contain` вписує кадр у рядок без обрізання, а сам `img`
            // при цьому лишається клікабельним рівно там, де видно фото.
            onClick={(e) => e.stopPropagation()}
            className="object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Nav({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={isPrev ? "Попереднє фото" : "Наступне фото"}
      className={[
        "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full",
        "bg-white/10 text-white backdrop-blur transition-colors duration-200 hover:bg-white/20",
        isPrev ? "left-3 sm:left-6" : "right-3 sm:right-6",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={isPrev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
