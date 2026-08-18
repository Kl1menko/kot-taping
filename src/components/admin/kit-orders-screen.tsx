"use client";

import { useState, useTransition } from "react";
import { setKitOrderStatus, setKitPrice } from "@/app/admin/kits/actions";
import { dayTitle } from "@/lib/calendar";
import { formatPhone } from "@/lib/phone";
import type { KitOrderWithKit } from "@/lib/db/kit-orders";
import type { KitRow } from "@/lib/db/types";
import {
  KIT_ORDER_FLOW,
  KIT_ORDER_LABEL,
  isOpenKitOrder,
  isWorldwide,
  nextKitStatus,
  type KitOrderStatus,
} from "@/lib/kits";
import { Sheet } from "./sheet";
import { Button, Chip, EmptyState } from "./ui";
import { INPUT_CLS } from "@/lib/form";

const FILTERS: { id: KitOrderStatus | "open" | "all"; label: string }[] = [
  { id: "open", label: "У роботі" },
  { id: "shipped", label: "Відправлені" },
  { id: "cancelled", label: "Скасовані" },
  { id: "all", label: "Усі" },
];

/** Куди писати клієнту — та сама логіка, що й у заявках на процедуру. */
function contactLink(order: KitOrderWithKit): { label: string; href: string } {
  const handle = order.contact_handle;

  if (order.contact_channel === "instagram" && handle) {
    return {
      label: `Instagram @${handle}`,
      href: `https://instagram.com/${handle}`,
    };
  }
  if (order.contact_channel === "telegram" && handle) {
    return { label: `Telegram @${handle}`, href: `https://t.me/${handle}` };
  }
  return { label: "Подзвонити", href: `tel:${order.phone}` };
}

export function KitOrdersScreen({
  orders,
  kits,
}: {
  orders: KitOrderWithKit[];
  kits: KitRow[];
}) {
  const [filter, setFilter] = useState<KitOrderStatus | "open" | "all">("open");
  const [active, setActive] = useState<KitOrderWithKit | null>(null);

  const visible =
    filter === "all"
      ? orders
      : filter === "open"
        ? orders.filter((o) => isOpenKitOrder(o.status))
        : orders.filter((o) => o.status === filter);

  const openCount = orders.filter((o) => isOpenKitOrder(o.status)).length;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Набори</h1>
        {openCount > 0 && (
          <span className="tnum shrink-0 rounded-full bg-ink px-3 py-1.5 text-[14px] text-white">
            {openCount} у роботі
          </span>
        )}
      </div>

      <div className="mt-5 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-full bg-surface p-1">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? orders.length
                : f.id === "open"
                  ? openCount
                  : orders.filter((o) => o.status === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={[
                  "cursor-pointer rounded-full px-4 py-2.5 text-[14px] whitespace-nowrap transition-colors duration-200",
                  filter === f.id
                    ? "bg-ink text-white"
                    : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {f.label}
                <span className="tnum ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        {visible.length === 0 ? (
          <EmptyState
            title={
              filter === "open"
                ? "Замовлень у роботі немає"
                : "У цьому фільтрі порожньо"
            }
            hint="Замовлення з форми на сайті з'являться тут одразу."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} onOpen={setActive} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PriceList kits={kits} />

      <Sheet
        open={active !== null}
        onClose={() => setActive(null)}
        title="Замовлення"
      >
        {active && (
          <OrderDetails order={active} onClose={() => setActive(null)} />
        )}
      </Sheet>
    </>
  );
}

function OrderCard({
  order,
  onOpen,
}: {
  order: KitOrderWithKit;
  onOpen: (o: KitOrderWithKit) => void;
}) {
  const isNew = order.status === "new";
  const worldwide = isWorldwide(order.country);

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      className={[
        "relative w-full cursor-pointer overflow-hidden rounded-[var(--radius-tile)] bg-surface p-5 text-left",
        "transition-colors duration-200 hover:bg-sand",
        order.status === "cancelled" ? "opacity-60" : "",
      ].join(" ")}
    >
      {isNew && (
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-1 rounded-full bg-ink"
        />
      )}

      <div className={isNew ? "pl-3" : ""}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[18px] leading-snug">{order.name}</p>
          <span className="shrink-0 text-[13px] text-ink-muted">
            {dayTitle(new Date(order.created_at))}
          </span>
        </div>

        <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
          {order.kitTitle ?? (
            <span className="italic">набору більше немає в каталозі</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>{formatPhone(order.phone)}</Chip>
          <Chip tone={worldwide ? "blush" : "sand"}>
            {worldwide ? `${order.country}, ${order.city}` : order.city}
          </Chip>
          <span className="text-[13px] text-ink-muted">
            {KIT_ORDER_LABEL[order.status]}
          </span>
        </div>
      </div>
    </button>
  );
}

function OrderDetails({
  order,
  onClose,
}: {
  order: KitOrderWithKit;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(order.tracking ?? "");

  const contact = contactLink(order);
  const next = nextKitStatus(order.status);
  const step = KIT_ORDER_FLOW.find((s) => s.id === order.status);
  const worldwide = isWorldwide(order.country);

  const advance = (to: KitOrderStatus) => {
    startTransition(async () => {
      // Накладну передаємо лише разом із відправленням — на інших кроках її
      // ще не існує.
      await setKitOrderStatus(order.id, to, to === "shipped" ? tracking : undefined);
      onClose();
    });
  };

  const cancel = () => {
    startTransition(async () => {
      await setKitOrderStatus(order.id, "cancelled");
      onClose();
    });
  };

  return (
    <div>
      <div className="rounded-[var(--radius-tile)] bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[24px] leading-tight">{order.name}</h3>
          <span className="shrink-0 text-[13px] text-ink-muted">
            {KIT_ORDER_LABEL[order.status]}
          </span>
        </div>

        <p className="mt-2 text-[16px] text-ink-muted">
          {order.kitTitle ?? "набору більше немає в каталозі"}
        </p>

        <dl className="mt-5 space-y-3">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
              Телефон
            </dt>
            <dd className="mt-1 text-[17px]">{formatPhone(order.phone)}</dd>
          </div>

          {order.contact_handle && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                {order.contact_channel === "instagram" ? "Instagram" : "Telegram"}
              </dt>
              <dd className="mt-1 text-[17px]">@{order.contact_handle}</dd>
            </div>
          )}

          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
              Доставка
            </dt>
            <dd className="mt-1 text-[17px]">
              {order.country}, {order.city}
              {worldwide && (
                <span className="mt-1 block text-[14px] text-ink-muted">
                  За кордон — порахувати вартість до оплати.
                </span>
              )}
            </dd>
          </div>

          {(order.tape_color || order.measurements) && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Параметри
              </dt>
              <dd className="mt-1 space-y-0.5 text-[16px] leading-relaxed">
                {order.tape_color && <p>Колір: {order.tape_color}</p>}
                {/* Як і в заявках: без підпису заміри зливалися з рядком вище. */}
                {order.measurements && <p>Заміри: {order.measurements}</p>}
              </dd>
            </div>
          )}

          {order.note && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Коментар
              </dt>
              <dd className="mt-1 text-[16px] leading-relaxed">{order.note}</dd>
            </div>
          )}

          {order.tracking && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Накладна
              </dt>
              <dd className="tnum mt-1 text-[17px]">{order.tracking}</dd>
            </div>
          )}
        </dl>
      </div>

      <a
        href={contact.href}
        {...(contact.href.startsWith("http")
          ? { target: "_blank", rel: "noreferrer noopener" }
          : {})}
        className="mt-4 inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-ink px-6 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
      >
        {contact.label}
      </a>

      {step?.action && next && (
        <p className="mt-4 rounded-2xl bg-sand px-4 py-3 text-[15px] leading-relaxed">
          Далі: {step.action.toLowerCase()}.
        </p>
      )}

      {/* Накладна потрібна саме на кроці відправлення — тоді її й питаємо. */}
      {next === "shipped" && (
        <label className="mt-4 block">
          <span className="text-[14px] text-ink-muted">
            Накладна для відстеження
          </span>
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="20450000000000"
            className={`${INPUT_CLS} tnum`}
          />
        </label>
      )}

      {isOpenKitOrder(order.status) ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button tone="light" onClick={cancel} disabled={pending} full>
            Скасувати
          </Button>
          {next && (
            <Button onClick={() => advance(next)} disabled={pending} full>
              {KIT_ORDER_LABEL[next]}
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink-muted">
          Замовлення закрите.
        </p>
      )}
    </div>
  );
}

/**
 * Ціни наборів. Каталог редагується рідко, тож окремого екрана він не вартий —
 * але ціна має бути під рукою: без неї сайт показує «уточнюється».
 */
function PriceList({ kits }: { kits: KitRow[] }) {
  const [pending, startTransition] = useTransition();

  if (kits.length === 0) return null;

  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="text-[18px]">Ціни наборів</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
        Порожня ціна показується на сайті як «вартість уточнюється».
      </p>

      <ul className="mt-5 space-y-2">
        {kits.map((kit) => (
          <li
            key={kit.slug}
            className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3"
          >
            <span className="text-[15px]">{kit.title}</span>
            <label className="flex shrink-0 items-center gap-2">
              <span className="sr-only">Ціна набору «{kit.title}»</span>
              <input
                type="number"
                min={0}
                step={50}
                defaultValue={kit.price}
                disabled={pending}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (value === kit.price) return;
                  startTransition(() => setKitPrice(kit.slug, value));
                }}
                className="tnum h-[44px] w-[110px] rounded-xl border border-line bg-canvas px-3 text-right text-[15px] focus:border-ink focus:outline-none"
              />
              <span className="text-[15px] text-ink-muted">₴</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
