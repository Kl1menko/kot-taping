import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listAppointments } from "@/lib/db/appointments";
import { dayRange, dayTitle } from "@/lib/calendar";
import { TodayList } from "@/components/admin/today-list";

export const metadata = { title: "Сьогодні" };

// Персональні дані й лічильники, що змінюються щохвилини — кешувати нічого.
export const dynamic = "force-dynamic";

async function counts() {
  const supabase = db();

  const [newRequests, clients, activeServices] = await Promise.all([
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  // Помилку не ковтаємо: її ловить error.tsx і показує зрозумілий екран із
  // кнопкою «Спробувати ще». Раніше сторінка малювала власне повідомлення —
  // тепер це дублювання, до того ж без можливості повторити запит.
  const failure = newRequests.error ?? clients.error ?? activeServices.error;
  if (failure) {
    throw new Error(`Не вдалося прочитати дані: ${failure.message}`);
  }

  return {
    newRequests: newRequests.count ?? 0,
    clients: clients.count ?? 0,
    activeServices: activeServices.count ?? 0,
  };
}

/**
 * Лічильник-плитка.
 *
 * Свідомо компактна: на телефоні цих плиток чотири в одну колонку, і з
 * великими числами вони займали весь екран, відсуваючи головне — список на
 * сьогодні — за межу видимості. Тут вони довідка, а не заголовок, тож число
 * і підпис стоять в один рядок.
 */
function Tile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 transition-colors duration-200 hover:bg-sand sm:flex-col sm:items-start sm:gap-1 sm:px-5 sm:py-4"
    >
      {/* min-w-0 на підписі й shrink-0 на числі: у вузькій колонці довгий
          підпис має переноситись усередині плитки, а не виштовхувати число. */}
      <span className="min-w-0 text-[14px] leading-snug text-ink-muted">
        {label}
      </span>
      <span className="tnum shrink-0 text-[22px] leading-none sm:text-[26px]">
        {value}
      </span>
    </Link>
  );
}

export default async function AdminHome() {
  await requireSession();

  const now = new Date();
  const { start, end } = dayRange(now);

  // Кількість записів на сьогодні окремим запитом не рахуємо: список усе одно
  // їх читає, тож беремо довжину звідти.
  const [data, today] = await Promise.all([
    counts(),
    listAppointments(start, end),
  ]);

  const planned = today.filter((a) => a.status !== "cancelled").length;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Сьогодні</h1>
        <span className="text-[15px] text-ink-muted">{dayTitle(now)}</span>
      </div>

      {/* Лічильники зверху — це швидкий зріз стану й переходи в розділи.
          Компактні навмисно: на телефоні вони мусять поміститись над списком,
          не відсуваючи його, бо головне питання екрана — «що в мене зараз». */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Tile
          label="Нові заявки"
          value={data.newRequests}
          href="/admin/requests"
        />
        <Tile
          label="Записів сьогодні"
          value={planned}
          href="/admin/calendar"
        />
        <Tile label="Клієнтів" value={data.clients} href="/admin/clients" />
        <Tile
          label="Активних послуг"
          value={data.activeServices}
          href="/admin/services"
        />
      </div>

      <div className="mt-8">
        <TodayList appointments={today} now={now} />
      </div>
    </>
  );
}
