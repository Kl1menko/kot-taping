import { requireSession } from "@/lib/auth/session";
import { listLocations } from "@/lib/db/appointments";
import { listWorkingDaysByLocation } from "@/lib/db/working-days";
import { dateKey, monthGrid, startOfDay } from "@/lib/calendar";
import { ScheduleScreen } from "@/components/admin/schedule-screen";

export const metadata = { title: "Графік" };
export const dynamic = "force-dynamic";

/** `2026-08` з URL, або поточний місяць. Некоректне значення ігноруємо. */
function parseMonth(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    const parsed = new Date(y, m - 1, 1);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const today = startOfDay(new Date());
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; location?: string }>;
}) {
  await requireSession();

  const { month: monthParam, location } = await searchParams;
  const month = parseMonth(monthParam);

  // Тягнемо рівно сітку 6×7, а не календарний місяць: клітинки з сусідніх
  // місяців теж клікабельні, і без їхнього стану вони малювались би
  // закритими, хоч насправді відкриті.
  const grid = monthGrid(month);
  const from = dateKey(grid[0]);
  const to = dateKey(grid[grid.length - 1]);

  /**
   * Кабінети й графік — одночасно, хоч другий і потребує id першого.
   *
   * Залежність тут удавана: графік фільтрується по `location_id`, а
   * котрий саме кабінет активний, вирішує slug з URL — і його ми вже маємо.
   * Тому читаємо графік усіх кабінетів діапазону одним запитом і лишаємо
   * потрібний у пам'яті. Послідовний виклик коштував би зайвий круговий рейс
   * на кожне гортання місяця, а кабінетів у студії два.
   */
  const [locations, schedules] = await Promise.all([
    listLocations(),
    listWorkingDaysByLocation(from, to),
  ]);

  // Невідомий slug у URL ігноруємо — беремо перший кабінет, а не порожній
  // екран: графік без кабінету намалювати неможливо.
  const active =
    locations.find((l) => l.slug === location) ?? locations[0] ?? null;

  const days = active ? (schedules[active.id] ?? []) : [];

  return (
    <ScheduleScreen
      locations={locations}
      activeLocation={active}
      month={month}
      days={days}
    />
  );
}
