"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  convertRequest,
  setRequestStatus,
  type ConvertState,
} from "@/app/admin/requests/actions";
import { dayTitle, toDateTimeLocal } from "@/lib/calendar";
import { formatPhone } from "@/lib/phone";
import { LOCATIONS } from "@/lib/contacts";
import type { RequestWithService } from "@/lib/db/requests";
import type { RequestStatus, ServiceRow } from "@/lib/db/types";
import { Sheet } from "./sheet";
import { Button, Chip, EmptyState, formatMoney } from "./ui";

const FILTERS: { id: RequestStatus | "all"; label: string }[] = [
  { id: "new", label: "Нові" },
  { id: "converted", label: "Записані" },
  { id: "declined", label: "Відхилені" },
  { id: "all", label: "Усі" },
];

/** Назва міста за slug — заявка зберігає slug, а не назву. */
function cityFor(slug: string): string {
  return LOCATIONS.find((l) => l.slug === slug)?.city ?? slug;
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "Нова",
  converted: "Записано",
  declined: "Відхилено",
};

export function RequestsScreen({
  requests,
  services,
}: {
  requests: RequestWithService[];
  services: ServiceRow[];
}) {
  const [filter, setFilter] = useState<RequestStatus | "all">("new");
  const [active, setActive] = useState<RequestWithService | null>(null);

  const visible =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const newCount = requests.filter((r) => r.status === "new").length;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Заявки</h1>
        {newCount > 0 && (
          <span className="tnum shrink-0 rounded-full bg-ink px-3 py-1.5 text-[14px] text-white">
            {newCount} нових
          </span>
        )}
      </div>

      <div className="mt-5 -mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-10 md:px-10 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-full bg-surface p-1">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? requests.length
                : requests.filter((r) => r.status === f.id).length;
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
              filter === "new" ? "Нових заявок немає" : "У цьому фільтрі порожньо"
            }
            hint="Заявки з форми на сайті з'являться тут одразу після надсилання."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} onOpen={setActive} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={active !== null}
        onClose={() => setActive(null)}
        title="Заявка"
      >
        {active && (
          <RequestDetails
            request={active}
            services={services}
            onClose={() => setActive(null)}
          />
        )}
      </Sheet>
    </>
  );
}

function RequestCard({
  request,
  onOpen,
}: {
  request: RequestWithService;
  onOpen: (r: RequestWithService) => void;
}) {
  const created = new Date(request.created_at);
  const isNew = request.status === "new";

  return (
    <button
      type="button"
      onClick={() => onOpen(request)}
      className={[
        "relative w-full cursor-pointer overflow-hidden rounded-[var(--radius-tile)] bg-surface p-5 text-left",
        "transition-colors duration-200 hover:bg-sand",
        request.status === "declined" ? "opacity-60" : "",
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
          <p className="text-[18px] leading-snug">{request.name}</p>
          <span className="shrink-0 text-[13px] text-ink-muted">
            {dayTitle(created)}
          </span>
        </div>

        <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
          {request.serviceTitle ?? (
            <span className="italic">послуги більше немає в прайсі</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip>{formatPhone(request.phone)}</Chip>
          {request.location_slug && (
            <Chip tone="sand">{cityFor(request.location_slug)}</Chip>
          )}
          {request.preferred_date && (
            <Chip tone="blush">
              бажано {dayTitle(new Date(request.preferred_date))}
            </Chip>
          )}
          {!isNew && (
            <span className="text-[13px] text-ink-muted">
              {STATUS_LABEL[request.status]}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} full>
      {pending ? "Створюю…" : "Створити запис"}
    </Button>
  );
}

const INITIAL: ConvertState = { status: "idle" };

const inputCls =
  "mt-2 block min-h-[52px] w-full rounded-2xl border border-line bg-canvas px-4 text-[16px] " +
  "transition-colors duration-200 focus:border-ink focus:outline-none";

function RequestDetails({
  request,
  services,
  onClose,
}: {
  request: RequestWithService;
  services: ServiceRow[];
  onClose: () => void;
}) {
  const [state, action] = useActionState(convertRequest, INITIAL);
  const [pending, startTransition] = useTransition();
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state.status, onClose]);

  const service = services.find((s) => s.slug === request.service_slug);

  // Бажана дата клієнтки — заготовка; час майстер обирає сама.
  const suggested = request.preferred_date
    ? new Date(`${request.preferred_date}T10:00`)
    : new Date();

  const decline = () => {
    startTransition(async () => {
      await setRequestStatus(request.id, "declined");
      onClose();
    });
  };

  const reopen = () => {
    startTransition(async () => {
      await setRequestStatus(request.id, "new");
      onClose();
    });
  };

  return (
    <div>
      <div className="rounded-[var(--radius-tile)] bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[24px] leading-tight">{request.name}</h3>
          <span className="shrink-0 text-[13px] text-ink-muted">
            {STATUS_LABEL[request.status]}
          </span>
        </div>

        <p className="mt-2 text-[16px] text-ink-muted">
          {request.serviceTitle ?? "послуги більше немає в прайсі"}
        </p>

        <dl className="mt-5 space-y-3">
          <div>
            <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
              Телефон
            </dt>
            <dd className="mt-1 text-[17px]">{formatPhone(request.phone)}</dd>
          </div>
          {request.preferred_date && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Бажана дата
              </dt>
              <dd className="mt-1 text-[17px]">
                {dayTitle(new Date(request.preferred_date))}
              </dd>
            </div>
          )}
          {request.note && (
            <div>
              <dt className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Коментар
              </dt>
              <dd className="mt-1 text-[16px] leading-relaxed">
                {request.note}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <a
        href={`tel:${request.phone}`}
        className="mt-4 inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-ink px-6 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
      >
        Подзвонити
      </a>

      {request.status === "converted" ? (
        <p className="mt-4 rounded-2xl bg-sand px-4 py-3 text-[15px] leading-relaxed">
          Заявку вже перетворено на запис — він у календарі.
        </p>
      ) : converting ? (
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={request.id} />

          <label className="block">
            <span className="text-[14px] text-ink-muted">Дата й час</span>
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(suggested)}
              className={`${inputCls} cursor-pointer`}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[14px] text-ink-muted">Тривалість, хв</span>
              <input
                name="duration"
                type="number"
                min={5}
                step={5}
                required
                defaultValue={service?.duration_min ?? 60}
                className={`${inputCls} tnum`}
              />
            </label>
            <label className="block">
              <span className="text-[14px] text-ink-muted">Ціна, ₴</span>
              <input
                name="price"
                type="number"
                min={0}
                step={50}
                required
                defaultValue={service?.price ?? 0}
                className={`${inputCls} tnum`}
              />
            </label>
          </div>

          {service?.price_from && (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              У прайсі — «від {formatMoney(service.price)}». Уточніть суму під
              обсяг роботи.
            </p>
          )}

          {state.status === "error" && state.message && (
            <p role="alert" className="text-[14px] text-[#b3261e]">
              {state.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button tone="light" onClick={() => setConverting(false)} full>
              Назад
            </Button>
            <Submit />
          </div>
        </form>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {request.status === "declined" ? (
            <Button tone="light" onClick={reopen} disabled={pending} full>
              Повернути в нові
            </Button>
          ) : (
            <Button tone="light" onClick={decline} disabled={pending} full>
              Відхилити
            </Button>
          )}
          <Button onClick={() => setConverting(true)} full>
            Записати
          </Button>
        </div>
      )}
    </div>
  );
}
