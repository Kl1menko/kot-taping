import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listAppointments } from "@/lib/db/appointments";
import { dayRange, dayTitle, timeLabel } from "@/lib/calendar";
import { buildAgenda, todaySummary } from "@/lib/agenda";
import { needsReview } from "@/lib/intake";
import type { KitOrderStatus } from "@/lib/kits";
import { TodayList } from "@/components/admin/today-list";
import { Agenda } from "@/components/admin/agenda";
import { PushToggle } from "@/components/admin/push-toggle";

export const metadata = { title: "Сьогодні" };

// Персональні дані й лічильники, що змінюються щохвилини — кешувати нічого.
export const dynamic = "force-dynamic";

/**
 * Сигнали для списку справ.
 *
 * Заявки читаємо рядками, а не `count`: серед них треба відрізнити ті, де
 * клієнт відмітив протипоказання, — це окрема, важливіша справа. Нових заявок
 * за визначенням небагато, тож зайвої ваги це не додає.
 */
async function agendaInput() {
  const supabase = db();

  const [requests, kitOrders] = await Promise.all([
    supabase.from("requests").select("contraindications").eq("status", "new"),
    supabase
      .from("kit_orders")
      .select("status")
      .in("status", ["new", "confirmed", "paid"]),
  ]);

  // Помилку не ковтаємо: її ловить error.tsx і показує екран із кнопкою
  // «Спробувати ще».
  const failure = requests.error ?? kitOrders.error;
  if (failure) {
    throw new Error(`Не вдалося прочитати дані: ${failure.message}`);
  }

  const requestRows = requests.data ?? [];
  const counts: Partial<Record<KitOrderStatus, number>> = {};
  for (const row of kitOrders.data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  return {
    newRequests: requestRows.length,
    flaggedRequests: requestRows.filter((r) => needsReview(r.contraindications))
      .length,
    kitOrders: counts,
  };
}

export default async function AdminHome() {
  await requireSession();

  const now = new Date();
  const { start, end } = dayRange(now);

  const [signals, today] = await Promise.all([
    agendaInput(),
    listAppointments(start, end),
  ]);

  const planned = today.filter((a) => a.status !== "cancelled");
  // Наступний — перший запланований, що ще не почався. Він же й задає час у
  // підсумку дня.
  const next = planned.find(
    (a) => a.status === "planned" && new Date(a.starts_at) >= now,
  );
  const upcoming = planned.filter(
    (a) => new Date(a.starts_at) >= now,
  ).length;

  const tasks = buildAgenda({ ...signals, upcomingToday: upcoming });

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-[24px] leading-tight sm:text-[28px]">Сьогодні</h1>
        <span className="text-[15px] text-ink-muted">{dayTitle(now)}</span>
      </div>

      {/* Стан дня одним рядком — те, що майстриня хоче знати першим. */}
      <p className="mt-2 text-[17px] leading-snug">
        {todaySummary(
          planned.length,
          upcoming,
          next ? timeLabel(new Date(next.starts_at)) : null,
        )}
      </p>

      {/* Справи перед розкладом: розклад — це те, що станеться саме собою, а
          справи чекають, поки за них візьмуться. */}
      <section className="mt-7">
        <h2 className="text-[13px] uppercase tracking-[0.12em] text-ink-muted">
          Що зробити
        </h2>
        <div className="mt-3">
          <Agenda tasks={tasks} />
        </div>
      </section>

      <section className="mt-9">
        <h2 className="text-[13px] uppercase tracking-[0.12em] text-ink-muted">
          Розклад на день
        </h2>
        <div className="mt-3">
          <TodayList appointments={today} now={now} />
        </div>
      </section>

      {/* Вмикач пушів — унизу головного екрана адмінки: він же стартовий для
          PWA (див. `start_url` у manifest.ts), тож саме тут майстриня його й
          побачить, вперше відкривши застосунок на телефоні. Налаштування
          разове, тому місце під розкладом, а не над ним. */}
      <section className="mt-9">
        <h2 className="text-[13px] uppercase tracking-[0.12em] text-ink-muted">
          Налаштування
        </h2>
        <div className="mt-3">
          <PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </div>
      </section>
    </>
  );
}
