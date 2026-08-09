import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

// Персональні дані й лічильники, що змінюються щохвилини — кешувати нічого.
export const dynamic = "force-dynamic";

async function counts() {
  const supabase = db();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [newRequests, todayAppointments, clients, activeServices] =
    await Promise.all([
      supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", startOfToday.toISOString())
        .lt("starts_at", endOfToday.toISOString())
        .eq("status", "planned"),
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  return {
    newRequests: newRequests.count ?? 0,
    todayAppointments: todayAppointments.count ?? 0,
    clients: clients.count ?? 0,
    activeServices: activeServices.count ?? 0,
    error:
      newRequests.error ??
      todayAppointments.error ??
      clients.error ??
      activeServices.error ??
      null,
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

  const data = await counts();

  if (data.error) {
    return (
      <>
        <h1 className="text-[28px] leading-tight">Огляд</h1>
        <div className="mt-8 rounded-[var(--radius-tile)] bg-surface p-6">
          <p className="text-[16px]">Не вдалося прочитати базу.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
            {data.error.message}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
            Перевірте, що міграція <code>supabase/migrations/0001_init.sql</code>{" "}
            виконана, а <code>SUPABASE_URL</code> і{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> у <code>.env.local</code>{" "}
            правильні.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[28px] leading-tight">Огляд</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Нові заявки"
          value={data.newRequests}
          href="/admin/requests"
        />
        <Tile
          label="Записів сьогодні"
          value={data.todayAppointments}
          href="/admin/calendar"
        />
        <Tile label="Клієнтів" value={data.clients} href="/admin/clients" />
        <Tile
          label="Активних послуг"
          value={data.activeServices}
          href="/admin/services"
        />
      </div>

      <div className="mt-6">
        <Link
          href="/admin/calendar"
          className="inline-flex min-h-[52px] items-center rounded-full bg-ink px-7 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
        >
          Відкрити календар
        </Link>
      </div>
    </>
  );
}
