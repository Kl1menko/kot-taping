"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createClientAction,
  saveClient,
  saveClientNotes,
  type ClientState,
} from "@/app/admin/clients/actions";
import { loadClientHistory } from "@/app/admin/clients/history";
import { searchClientsAction } from "@/app/admin/clients/search";
import { dayTitle, timeLabel } from "@/lib/calendar";
import { formatPhone, phoneMatches } from "@/lib/phone";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import type { ClientWithStats } from "@/lib/db/clients";
import { StatusBadge } from "./ui";
import { Sheet } from "./sheet";
import { Button, Chip, EmptyState, formatMoney } from "./ui";
import { INPUT_CLS } from "@/lib/form";

const INITIAL: ClientState = { status: "idle" };


export function ClientsScreen({
  clients,
  hasMore = false,
}: {
  clients: ClientWithStats[];
  /** Список упрів у ліміт — показуємо це, а не вдаємо, що клієнтів рівно стільки. */
  hasMore?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ClientWithStats | null>(null);
  const [creating, setCreating] = useState(false);
  /**
   * Добірка з бази — лише коли завантаженої сторінки не досить (див. нижче).
   * Тримаємо разом із запитом, щоб відкинути відповідь, яка спізнилась.
   */
  const [remote, setRemote] = useState<{
    query: string;
    rows: ClientWithStats[];
  } | null>(null);

  // Фільтруємо на клієнті: список невеликий, а миттєвий відгук важливіший
  // за економію на запиті. Пошук за нотаткою можливий лише тут — у SQL ми за
  // нотатками не шукаємо, бо це чутливе поле і воно не індексоване.
  const local = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        phoneMatches(c.phone, q) ||
        c.notes?.toLowerCase().includes(q),
    );
  }, [clients, query]);

  /**
   * Доповнюємо локальний пошук базою, коли список обрізаний лімітом.
   *
   * Без цього пошук мовчки брехав би: людина, якої немає на завантаженій
   * сторінці, не знаходилась би взагалі. Ходимо тільки якщо `hasMore` — поки
   * база вміщається у сторінку, миттєвого фільтра досить і запит зайвий.
   */
  useEffect(() => {
    const q = query.trim();
    if (!hasMore || q.length < 2) return;

    let cancelled = false;
    // Пауза, щоб не слати запит на кожну літеру.
    const timer = setTimeout(() => {
      searchClientsAction(q)
        .then((found) => {
          // Результат зберігаємо разом із запитом, під який його отримано:
          // поки летить відповідь, у полі вже може бути інший текст.
          if (!cancelled) setRemote({ query: q, rows: found });
        })
        // Мовчки: локальний результат уже на екрані, і показувати помилку
        // замість нього означало б зробити гірше, ніж було.
        .catch(() => {});
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasMore]);

  // Об'єднуємо: те, що знайшлося локально (зокрема за нотаткою), плюс те, що
  // приїхало з бази. Дублікати прибираємо за id.
  const visible = useMemo(() => {
    // Застарілу відповідь (від попереднього запиту) ігноруємо.
    const remoteRows =
      remote && remote.query === query.trim() ? remote.rows : null;
    if (!remoteRows) return local;
    const merged = new Map(local.map((c) => [c.id, c]));
    for (const c of remoteRows) merged.set(c.id, c);
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "uk"));
  }, [local, remote, query]);

  const returning = clients.filter((c) => c.visits > 1).length;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] leading-tight sm:text-[28px]">Клієнти</h1>
          <span className="tnum mt-1 block text-[14px] text-ink-muted">
            {/* При обрізанні «500» без позначки читалось би як «усього 500». */}
            {hasMore ? `перші ${clients.length}` : clients.length}
            {returning > 0 && ` · ${returning} повторних`}
          </span>
        </div>

        {/* Кнопка в заголовку, а не внизу списку: завести картку треба саме
            тоді, коли людини в списку немає, — тобто коли шукали й не знайшли.

            Сам «плюс», без підпису: значок зрозумілий і не з'їдає рядок поруч
            із заголовком. Підпис лишається для читача з екрана — див. sr-only
            та aria-label, інакше кнопка озвучувалась би просто як «кнопка». */}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="Додати клієнтку"
          title="Додати клієнтку"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="mt-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук за іменем, телефоном або нотаткою…"
          aria-label="Пошук клієнтів"
          className="min-h-[52px] w-full rounded-full border border-line bg-surface px-5 text-[16px] transition-colors duration-200 focus:border-ink focus:outline-none"
        />
      </div>

      {/* Мовчазний зріз списку — найгірший варіант: людина шукає клієнтку, не
          знаходить і робить висновок, що її в базі немає. Тому кажемо прямо. */}
      {hasMore && (
        <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-[14px] leading-relaxed text-ink-muted">
          Показано перших {clients.length} клієнтів за абеткою. Якщо потрібної
          немає в списку — введіть ім&apos;я або номер у пошук, він шукає по всій
          базі.
        </p>
      )}

      <div className="mt-5">
        {visible.length === 0 ? (
          <div>
            <EmptyState
              title={query ? "Нікого не знайдено" : "Клієнтів поки немає"}
              hint={
                query
                  ? "Спробуйте частину імені або останні цифри номера — або заведіть картку."
                  : "Клієнти з'являються автоматично, коли ви створюєте запис або приймаєте заявку."
              }
            />
            {/* Саме тут людина найчастіше й розуміє, що картки ще немає. */}
            <div className="mt-4 flex justify-center">
              <Button tone="light" onClick={() => setCreating(true)}>
                Додати клієнтку
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((client) => (
              <li key={client.id}>
                <ClientCard client={client} onOpen={setActive} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={active !== null}
        onClose={() => setActive(null)}
        title="Клієнт"
      >
        {active && (
          <ClientDetails client={active} onClose={() => setActive(null)} />
        )}
      </Sheet>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Нова клієнтка"
      >
        {/* key скидає стан форми між відкриттями: інакше після успішного
            створення в полях лишалися б дані попередньої клієнтки. */}
        {creating && (
          <ClientCreateForm
            key={String(creating)}
            initialQuery={query}
            onDone={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        )}
      </Sheet>
    </>
  );
}

function ClientCard({
  client,
  onOpen,
}: {
  client: ClientWithStats;
  onOpen: (c: ClientWithStats) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(client)}
      className="w-full cursor-pointer rounded-[var(--radius-tile)] bg-surface p-5 text-left transition-colors duration-200 hover:bg-sand"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[18px] leading-snug">{client.name}</p>
        {client.nextVisit && (
          <span className="shrink-0 rounded-full bg-blush px-3 py-1 text-[13px]">
            {dayTitle(new Date(client.nextVisit))}
          </span>
        )}
      </div>

      <p className="tnum mt-1 text-[15px] text-ink-muted">
        {formatPhone(client.phone)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip>
          {client.visits === 0
            ? "ще не була"
            : client.visits === 1
              ? "1 візит"
              : `${client.visits} візитів`}
        </Chip>
        {client.totalSpent > 0 && (
          <Chip tone="sand">{formatMoney(client.totalSpent)}</Chip>
        )}
        {/* Куди ходить. Міст може бути два — показуємо обидва, бо «Львів» на
            картці людини, яка буває і в Києві, збивав би з пантелику. */}
        {client.cities.map((city) => (
          <Chip key={city} tone="blush">
            {city}
          </Chip>
        ))}
        {client.lastVisit && (
          <span className="text-[13px] text-ink-muted">
            остання {dayTitle(new Date(client.lastVisit))}
          </span>
        )}
      </div>

      {/* Нотатка — те, заради чого майстер і відкриває картку, тож колір
          звичайний ink, а не приглушений. Сірим по сірому (#646464 на
          #ededed) вона формально проходила AA (5.05:1), але на тлі темних
          чипів і темного імені читалась як другорядна. */}
      {client.notes && (
        <p className="mt-3 line-clamp-2 rounded-xl bg-canvas px-3 py-2 text-[14px] leading-relaxed text-ink">
          {client.notes}
        </p>
      )}
    </button>
  );
}

function SubmitNotes() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} tone="light" full>
      {pending ? "Зберігаю…" : "Зберегти нотатки"}
    </Button>
  );
}

function SubmitClient() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} full>
      {pending ? "Зберігаю…" : "Зберегти"}
    </Button>
  );
}

function ClientDetails({
  client,
  onClose,
}: {
  client: ClientWithStats;
  onClose: () => void;
}) {
  const [notesState, notesAction] = useActionState(saveClientNotes, INITIAL);
  const [editing, setEditing] = useState(false);
  const [visits, setVisits] = useState<AppointmentWithRefs[] | null>(null);

  // Історія тягнеться при відкритті картки, а не разом зі списком: інакше
  // телефони й медичні нотатки всіх клієнтів лежали б у HTML сторінки.
  useEffect(() => {
    let cancelled = false;
    loadClientHistory(client.id).then((rows) => {
      if (!cancelled) setVisits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [client.id]);

  const done = (visits ?? []).filter((v) => v.status === "done");
  // `nextVisit` рахує сервер — тут лише звіряємось із ним, щоб не смикати
  // Date.now() під час рендеру (нестабільний результат між рендерами).
  const upcoming = client.nextVisit
    ? (visits ?? []).filter(
        (v) => v.status === "planned" && v.starts_at >= client.nextVisit!,
      )
    : [];

  if (editing) {
    return (
      <ClientEditForm
        client={client}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <div className="rounded-[var(--radius-tile)] bg-surface p-5">
        <h3 className="text-[24px] leading-tight">{client.name}</h3>
        <p className="tnum mt-1 text-[16px] text-ink-muted">
          {formatPhone(client.phone)}
        </p>
        {client.email && (
          <p className="mt-1 text-[15px] text-ink-muted">{client.email}</p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <Stat label="Візитів" value={String(client.visits)} />
          <Stat label="Сума" value={formatMoney(client.totalSpent)} />
          <Stat
            label="Остання"
            value={
              client.lastVisit ? dayTitle(new Date(client.lastVisit)) : "—"
            }
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`tel:${client.phone}`}
          className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-full bg-ink px-6 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
        >
          Подзвонити
        </a>
        <Button tone="light" onClick={() => setEditing(true)} full>
          Редагувати
        </Button>
      </div>

      <form action={notesAction} className="mt-5">
        <input type="hidden" name="id" value={client.id} />
        <label className="block">
          <span className="text-[14px] text-ink-muted">
            Нотатки — протипоказання, особливості, домовленості
          </span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={client.notes ?? ""}
            className={`${INPUT_CLS} min-h-[104px] resize-y py-3 leading-relaxed`}
          />
        </label>

        {notesState.status === "error" && (
          <p role="alert" className="mt-2 text-[14px] text-[#b3261e]">
            {notesState.message}
          </p>
        )}
        {notesState.status === "success" && (
          <p className="mt-2 text-[14px] text-ink-muted">{notesState.message}</p>
        )}

        <div className="mt-3">
          <SubmitNotes />
        </div>
      </form>

      {upcoming.length > 0 && (
        <section className="mt-6">
          <h4 className="text-[15px] text-ink-muted">Попереду</h4>
          <ul className="mt-3 space-y-2">
            {upcoming.map((v) => (
              <VisitRow key={v.id} visit={v} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h4 className="text-[15px] text-ink-muted">
          Історія візитів{done.length > 0 && ` · ${done.length}`}
        </h4>
        {visits === null ? (
          <p className="mt-3 rounded-2xl bg-surface px-4 py-4 text-[15px] text-ink-muted">
            Завантажую…
          </p>
        ) : visits.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface px-4 py-4 text-[15px] text-ink-muted">
            Візитів ще не було.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visits
              .filter((v) => !upcoming.includes(v))
              .map((v) => (
                <VisitRow key={v.id} visit={v} />
              ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <Button tone="light" onClick={onClose} full>
          Закрити
        </Button>
      </div>
    </div>
  );
}

/**
 * Окремий компонент, а не гілка всередині картки: власний useActionState
 * монтується разом із формою, тож після успішного збереження і повторного
 * входу в редагування стан чистий — без ефектів, що його скидають.
 */
function ClientEditForm({
  client,
  onDone,
  onCancel,
}: {
  client: ClientWithStats;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(saveClient, INITIAL);

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={client.id} />

      <label className="block">
        <span className="text-[14px] text-ink-muted">Ім’я</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={client.name}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">Телефон</span>
        <input
          name="phone"
          type="tel"
          required
          defaultValue={client.phone}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">
          Email (необов’язково)
        </span>
        <input
          name="email"
          type="email"
          defaultValue={client.email ?? ""}
          className={INPUT_CLS}
        />
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-[14px] text-[#b3261e]">
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button tone="light" onClick={onCancel} full>
          Скасувати
        </Button>
        <SubmitClient />
      </div>
    </form>
  );
}

function SubmitCreate() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} full>
      {pending ? "Зберігаю…" : "Додати"}
    </Button>
  );
}

/**
 * Нова картка клієнтки.
 *
 * Окрема від `ClientEditForm`: там `id` у прихованому полі й «Зберегти», тут
 * створення й нотатки одразу в формі — картку часто заводять саме заради них
 * (протипокази, домовленості з телефонної розмови).
 */
function ClientCreateForm({
  initialQuery,
  onDone,
  onCancel,
}: {
  /** Те, що майстриня вже ввела в пошук: найчастіше саме ім'я або номер. */
  initialQuery: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(createClientAction, INITIAL);

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  // Шукали людину, не знайшли, тиснете «Додати» — введене не має пропасти.
  // Цифри — це номер, решта — ім'я.
  const q = initialQuery.trim();
  const looksLikePhone = q.length > 0 && /^[\d\s+()-]+$/.test(q);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-[14px] text-ink-muted">Ім’я</span>
        <input
          name="name"
          type="text"
          required
          autoFocus
          defaultValue={looksLikePhone ? "" : q}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">Телефон</span>
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          placeholder="0XX XXX XX XX або +380…"
          defaultValue={looksLikePhone ? q : ""}
          className={INPUT_CLS}
        />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">
          Email (необов’язково)
        </span>
        <input name="email" type="email" className={INPUT_CLS} />
      </label>

      <label className="block">
        <span className="text-[14px] text-ink-muted">
          Нотатки (необов’язково)
        </span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Протипокази, особливості шкіри, домовленості"
          className={`${INPUT_CLS} min-h-[96px] resize-y py-3 leading-relaxed`}
        />
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-[14px] text-[#b3261e]">
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button tone="light" onClick={onCancel} full>
          Скасувати
        </Button>
        <SubmitCreate />
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </p>
      <p className="tnum mt-1 text-[17px] leading-tight">{value}</p>
    </div>
  );
}

function VisitRow({ visit }: { visit: AppointmentWithRefs }) {
  const start = new Date(visit.starts_at);
  return (
    <li className="rounded-2xl bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px]">{visit.service.title}</p>
          <p className="tnum mt-0.5 text-[13px] text-ink-muted">
            {dayTitle(start)}, {timeLabel(start)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={visit.status} />
          {visit.price > 0 && (
            <span className="tnum text-[14px]">{formatMoney(visit.price)}</span>
          )}
        </div>
      </div>
    </li>
  );
}
