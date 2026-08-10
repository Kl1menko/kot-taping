import Link from "next/link";
import { dateKey, durationLabel, timeLabel, timeRange } from "@/lib/calendar";
import { formatPhone } from "@/lib/phone";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import { Chip, StatusBadge, formatMoney } from "./ui";

/**
 * Записи на сьогодні на головному екрані.
 *
 * Server Component без жодного стану: це перелік «що в мене зараз», а не ще
 * один календар. Редагування живе в /admin/calendar, тому єдина дія тут —
 * подзвонити, і вона ж найчастіша (попередити, що чекаємо, або перенести).
 *
 * Скасовані записи не показуємо: у списку на день вони лише шумлять, а факт
 * скасування видно в календарі.
 */
export function TodayList({
  appointments,
  now,
}: {
  appointments: AppointmentWithRefs[];
  /** Передається зі сторінки, щоб «наступний» рахувався від часу рендера. */
  now: Date;
}) {
  const visible = appointments.filter((a) => a.status !== "cancelled");

  if (visible.length === 0) {
    return (
      <div className="rounded-[var(--radius-tile)] bg-surface p-6">
        <p className="text-[17px]">Сьогодні записів немає.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          Вільний день. Записи на інші дні — у календарі.
        </p>
        <Link
          href="/admin/calendar"
          className="mt-5 inline-flex min-h-[52px] items-center rounded-full border border-line px-6 text-[15px] transition-colors duration-200 hover:border-ink"
        >
          Відкрити календар
        </Link>
      </div>
    );
  }

  // Перший запланований, що ще не почався — його виділяємо як «наступний».
  const nextId = visible.find(
    (a) => a.status === "planned" && new Date(a.starts_at) >= now,
  )?.id;

  return (
    <ul className="space-y-3">
      {visible.map((appointment) => {
        const start = new Date(appointment.starts_at);
        const isNext = appointment.id === nextId;
        // Час завершення, а не початку: запис, що триває просто зараз, ще не
        // минулий — саме він найчастіше й на екрані.
        const isPast =
          new Date(start.getTime() + appointment.duration_min * 60_000) < now;

        return (
          <li
            key={appointment.id}
            className={[
              "rounded-[var(--radius-tile)] bg-surface p-5",
              // Наступний запис підсвічуємо кантом, а не кольором тла:
              // на екрані з 8 записів заливка рябіла б.
              isNext ? "ring-2 ring-ink" : "",
              // Те, що вже позаду, приглушуємо — щоб погляд одразу падав на
              // решту дня, а не на початок списку.
              isPast ? "opacity-55" : "",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="tnum text-[15px]">
                {timeRange(start, appointment.duration_min)}
              </span>
              {appointment.price > 0 && (
                <span className="tnum shrink-0 text-[15px]">
                  {formatMoney(appointment.price)}
                </span>
              )}
            </div>

            <p className="mt-2 truncate text-[18px] leading-snug">
              {appointment.client.name}
            </p>
            <p className="mt-0.5 truncate text-[15px] text-ink-muted">
              {appointment.service.title} · {appointment.location.city}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isNext && <Chip tone="sand">наступний о {timeLabel(start)}</Chip>}
              <StatusBadge status={appointment.status} />
              <Chip>{durationLabel(appointment.duration_min)}</Chip>
              {appointment.source === "site" && <Chip tone="blush">з сайту</Chip>}
            </div>

            {appointment.client.notes && (
              <p className="mt-3 line-clamp-2 rounded-xl bg-canvas px-3 py-2 text-[14px] leading-relaxed text-ink-muted">
                {appointment.client.notes}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`tel:${appointment.client.phone}`}
                className="inline-flex min-h-[48px] items-center rounded-full bg-ink px-5 text-[14px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
              >
                {formatPhone(appointment.client.phone)}
              </a>
              {/* dateKey, а не зріз ISO-рядка: той дав би дату в UTC і на
                  вечірньому записі відкрив би календар на добу назад. */}
              <Link
                href={`/admin/calendar?date=${dateKey(start)}`}
                className="inline-flex min-h-[48px] items-center rounded-full border border-line px-5 text-[14px] transition-colors duration-200 hover:border-ink"
              >
                У календарі
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
