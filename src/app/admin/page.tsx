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
      className="rounded-[var(--radius-tile)] bg-surface p-6 transition-colors duration-200 hover:bg-sand"
    >
      <p className="text-[14px] text-ink-muted">{label}</p>
      <p className="tnum mt-3 text-[36px] leading-none">{value}</p>
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

      {/* Головне питання екрана — «що в мене зараз», тож список іде перед
          лічильниками, а не після них. */}
      <div className="mt-6">
        <TodayList appointments={today} now={now} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </>
  );
}
