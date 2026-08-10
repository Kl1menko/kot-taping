"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  moveService,
  saveService,
  toggleService,
  type ServiceState,
} from "@/app/admin/services/actions";
import { CATEGORIES } from "@/lib/services";
import { durationLabel } from "@/lib/calendar";
import type { ServiceRow } from "@/lib/db/types";
import { Sheet } from "./sheet";
import { Button, Chip, EmptyState, formatMoney } from "./ui";
import { INPUT_CLS } from "@/lib/form";

const INITIAL: ServiceState = { status: "idle" };


export function ServicesScreen({ services }: { services: ServiceRow[] }) {
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [sheet, setSheet] = useState<
    { kind: "closed" } | { kind: "form"; service?: ServiceRow }
  >({ kind: "closed" });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (!showHidden && !s.is_active) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.badge?.toLowerCase().includes(q)
      );
    });
  }, [services, query, showHidden]);

  const grouped = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        items: visible.filter((s) => s.category === cat.id),
      })).filter((g) => g.items.length > 0),
    [visible],
  );

  const hiddenCount = services.filter((s) => !s.is_active).length;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Прайс</h1>
        <span className="tnum shrink-0 text-[14px] text-ink-muted">
          {services.filter((s) => s.is_active).length} активних
        </span>
      </div>

      <div className="mt-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук послуги…"
          aria-label="Пошук послуги"
          className="min-h-[52px] w-full rounded-full border border-line bg-surface px-5 text-[16px] transition-colors duration-200 focus:border-ink focus:outline-none"
        />
      </div>

      {hiddenCount > 0 && (
        <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-muted">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="size-4 cursor-pointer accent-[#111111]"
          />
          Показати приховані ({hiddenCount})
        </label>
      )}

      <div className="mt-5 space-y-8">
        {grouped.length === 0 ? (
          <EmptyState
            title={query ? "Нічого не знайдено" : "Прайс порожній"}
            hint={
              query
                ? "Спробуйте іншу назву."
                : "Додайте першу послугу кнопкою внизу."
            }
          />
        ) : (
          grouped.map((group) => (
            <section key={group.id}>
              <h2 className="text-[15px] text-ink-muted">
                <span aria-hidden="true">/ </span>
                {group.label}
              </h2>

              <ul className="mt-3 overflow-hidden rounded-[var(--radius-tile)] bg-surface">
                {group.items.map((service, i) => (
                  <ServiceRowItem
                    key={service.id}
                    service={service}
                    first={i === 0}
                    last={i === group.items.length - 1}
                    onEdit={(s) => setSheet({ kind: "form", service: s })}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheet({ kind: "form" })}
        aria-label="Нова послуга"
        className="fixed bottom-24 right-5 z-30 grid size-14 cursor-pointer place-items-center rounded-full bg-ink text-white shadow-lg transition-transform duration-200 hover:scale-105 md:bottom-8 md:right-8"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <Sheet
        open={sheet.kind !== "closed"}
        onClose={() => setSheet({ kind: "closed" })}
        title={
          sheet.kind === "form" && sheet.service ? "Послуга" : "Нова послуга"
        }
      >
        {sheet.kind === "form" && (
          <ServiceForm
            service={sheet.service}
            onDone={() => setSheet({ kind: "closed" })}
          />
        )}
      </Sheet>
    </>
  );
}

function ServiceRowItem({
  service,
  first,
  last,
  onEdit,
}: {
  service: ServiceRow;
  first: boolean;
  last: boolean;
  onEdit: (s: ServiceRow) => void;
}) {
  const [pending, startTransition] = useTransition();

  const move = (direction: "up" | "down") => {
    startTransition(() => moveService(service.id, direction));
  };

  return (
    <li
      className={`flex items-center gap-2 border-t border-line px-4 py-3 first:border-t-0 ${service.is_active ? "" : "opacity-55"}`}
    >
      <button
        type="button"
        onClick={() => onEdit(service)}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[16px]">{service.title}</span>
          <span className="tnum shrink-0 text-[16px]">
            {service.price_from && (
              <span className="text-[13px] text-ink-muted">від </span>
            )}
            {formatMoney(service.price)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-muted">
            {durationLabel(service.duration_min)}
          </span>
          {service.badge && (
            <span className="text-[13px] text-ink-muted">· {service.badge}</span>
          )}
          {!service.is_active && <Chip>приховано</Chip>}
        </div>
      </button>

      {/* Стрілки порядку — лише коли є куди рухати. */}
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={first || pending}
          aria-label={`Підняти «${service.title}»`}
          className="cursor-pointer p-1 text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-default disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={last || pending}
          aria-label={`Опустити «${service.title}»`}
          className="cursor-pointer p-1 text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-default disabled:opacity-25"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} full>
      {pending ? "Зберігаю…" : editing ? "Зберегти" : "Створити послугу"}
    </Button>
  );
}

function ServiceForm({
  service,
  onDone,
}: {
  service?: ServiceRow;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveService, INITIAL);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  const toggle = () => {
    if (!service) return;
    startTransition(async () => {
      await toggleService(service.id, !service.is_active);
      onDone();
    });
  };

  return (
    <form action={action} noValidate className="space-y-5">
      {service && <input type="hidden" name="id" value={service.id} />}

      <label className="block">
        <span className="text-[14px] text-ink-muted">Назва</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={service?.title ?? ""}
          className={INPUT_CLS}
        />
        {state.fieldErrors?.title && (
          <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
            {state.fieldErrors.title}
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">Опис</span>
        <textarea
          name="summary"
          rows={3}
          defaultValue={service?.summary ?? ""}
          className={`${INPUT_CLS} min-h-[88px] resize-y py-3 leading-relaxed`}
        />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">Категорія</span>
        <select
          name="category"
          required
          defaultValue={service?.category ?? CATEGORIES[0].id}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.category && (
          <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
            {state.fieldErrors.category}
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
        <label className="block">
          <span className="text-[14px] text-ink-muted">Ціна, ₴</span>
          <input
            name="price"
            type="number"
            min={0}
            step={50}
            required
            defaultValue={service?.price ?? 0}
            className={`${INPUT_CLS} tnum`}
          />
          {state.fieldErrors?.price && (
            <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
              {state.fieldErrors.price}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-[14px] text-ink-muted">Тривалість, хв</span>
          <input
            name="duration"
            type="number"
            min={5}
            step={5}
            required
            defaultValue={service?.duration_min ?? 60}
            className={`${INPUT_CLS} tnum`}
          />
          {state.fieldErrors?.duration && (
            <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
              {state.fieldErrors.duration}
            </span>
          )}
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
        <input
          type="checkbox"
          name="priceFrom"
          defaultChecked={service?.price_from ?? false}
          className="size-4 cursor-pointer accent-[#111111]"
        />
        Ціна «від» — залежить від обсягу роботи
      </label>

      <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
        <label className="block">
          <span className="text-[14px] text-ink-muted">Носіння</span>
          <input
            name="wear"
            type="text"
            placeholder="5–10 днів"
            defaultValue={service?.wear ?? ""}
            className={INPUT_CLS}
          />
        </label>

        <label className="block">
          <span className="text-[14px] text-ink-muted">Бейдж</span>
          <input
            name="badge"
            type="text"
            placeholder="Курс 5 процедур"
            defaultValue={service?.badge ?? ""}
            className={INPUT_CLS}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[14px] text-ink-muted">Фон картки на сайті</span>
        <select
          name="tone"
          defaultValue={service?.tone ?? "sand"}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          <option value="sand">Пісок</option>
          <option value="clay">Глина</option>
          <option value="blush">Рум’янець</option>
        </select>
      </label>

      <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={service?.is_active ?? true}
          className="size-4 cursor-pointer accent-[#111111]"
        />
        Показувати на сайті та у формі запису
      </label>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[14px] text-[#b3261e]">
          {state.message}
        </p>
      )}

      <div className="space-y-2 pt-1">
        <Submit editing={Boolean(service)} />

        {service && (
          <Button tone="light" onClick={toggle} disabled={pending} full>
            {service.is_active ? "Прибрати з прайсу" : "Повернути в прайс"}
          </Button>
        )}
      </div>

      {service && (
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Послуги не видаляються — інакше зникла б історія доходу за ними.
          Прибрана з прайсу послуга просто не пропонується клієнтам.
        </p>
      )}
    </form>
  );
}
