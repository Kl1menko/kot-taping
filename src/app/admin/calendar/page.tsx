import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listAppointments, listLocations } from "@/lib/db/appointments";
import { loadedRange, startOfDay } from "@/lib/calendar";
import { CalendarScreen } from "@/components/admin/calendar-screen";

export const dynamic = "force-dynamic";

/** `2026-08-08` з URL, або сьогодні. Некоректне значення мовчки ігноруємо. */
function parseDate(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
  }
  return startOfDay(new Date());
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; location?: string }>;
}) {
  await requireSession();

  const { date, location } = await searchParams;
  const selected = parseDate(date);

  // Місяць плюс тиждень навколо — на цей же діапазон спирається клієнт,
  // вирішуючи, чи потрібен новий запит при кроці стрілкою (див. loadedRange).
  const { start, end } = loadedRange(selected);

  const locations = await listLocations();

  // Невідомий slug у URL ігноруємо — показуємо всі кабінети, а не порожньо.
  const activeLocation = locations.some((l) => l.slug === location)
    ? (location as string)
    : "";

  const [appointments, servicesResult] = await Promise.all([
    listAppointments(start, end, activeLocation || undefined),
    db().from("services").select("*").eq("is_active", true).order("sort"),
  ]);

  if (servicesResult.error) {
    throw new Error(`Не вдалося прочитати прайс: ${servicesResult.error.message}`);
  }

  return (
    <CalendarScreen
      appointments={appointments}
      services={servicesResult.data ?? []}
      locations={locations}
      selectedDate={selected}
      selectedLocation={activeLocation}
    />
  );
}
