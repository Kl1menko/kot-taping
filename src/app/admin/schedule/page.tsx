import { requireSession } from "@/lib/auth/session";
import { listLocations } from "@/lib/db/appointments";
import { listWorkingDays } from "@/lib/db/working-days";
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

  const locations = await listLocations();

  // Невідомий slug у URL ігноруємо — беремо перший кабінет, а не порожній
  // екран: графік без кабінету намалювати неможливо.
  const active =
    locations.find((l) => l.slug === location) ?? locations[0] ?? null;

  // Тягнемо рівно сітку 6×7, а не календарний місяць: клітинки з сусідніх
  // місяців теж клікабельні, і без їхнього стану вони малювались би
  // закритими, хоч насправді відкриті.
  const grid = monthGrid(month);
  const days = active
    ? await listWorkingDays(
        active.id,
        dateKey(grid[0]),
        dateKey(grid[grid.length - 1]),
      )
    : [];

  return (
    <ScheduleScreen
      locations={locations}
      activeLocation={active}
      month={month}
      days={days}
    />
  );
}
