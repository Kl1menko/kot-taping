"use client";

import { durationLabel, timeRange } from "@/lib/calendar";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import { Chip, StatusBadge, formatMoney } from "./ui";

/** Картка запису у списку. */
export function AppointmentCard({
  appointment,
  onOpen,
}: {
  appointment: AppointmentWithRefs;
  onOpen: (a: AppointmentWithRefs) => void;
}) {
  const start = new Date(appointment.starts_at);
  const cancelled = appointment.status === "cancelled";

  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      className={[
        "flex w-full cursor-pointer overflow-hidden rounded-[var(--radius-tile)] bg-surface text-left",
        "transition-colors duration-200 hover:bg-canvas",
        cancelled ? "opacity-60" : "",
      ].join(" ")}
    >
      <span className="min-w-0 flex-1 p-5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="tnum shrink-0 text-[15px]">
            {timeRange(start, appointment.duration_min)}
          </span>
          {appointment.price > 0 && (
            <span className="tnum shrink-0 text-[15px]">
              {formatMoney(appointment.price)}
            </span>
          )}
        </span>

        <span className="mt-2 block truncate text-[18px] leading-snug">
          {appointment.client.name}
        </span>
        <span className="mt-0.5 block truncate text-[15px] text-ink-muted">
          {appointment.service.title}
        </span>

        <span className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          <Chip>{durationLabel(appointment.duration_min)}</Chip>
          {appointment.source === "site" && <Chip tone="blush">з сайту</Chip>}
        </span>
      </span>
    </button>
  );
}
