"use client";

import { useTransition } from "react";
import {
  dayTitle,
  durationLabel,
  timeRange,
} from "@/lib/calendar";
import { formatPhone } from "@/lib/phone";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import type { AppointmentStatus } from "@/lib/db/types";
import {
  deleteAppointment,
  setAppointmentStatus,
} from "@/app/admin/calendar/actions";
import { Button, Chip, StatusBadge, formatMoney } from "./ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-line px-5 py-4 first:border-t-0">
      <p className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-[17px] leading-snug">{value}</p>
    </div>
  );
}

const NEXT_STATUS: { id: AppointmentStatus; label: string }[] = [
  { id: "done", label: "Виконано" },
  { id: "no_show", label: "Не прийшов" },
  { id: "cancelled", label: "Скасувати" },
];

export function AppointmentDetails({
  appointment,
  onEdit,
  onRepeat,
  onClose,
}: {
  appointment: AppointmentWithRefs;
  onEdit: (a: AppointmentWithRefs) => void;
  /** Створити наступний запис цьому ж клієнту, не вводячи дані заново. */
  onRepeat: (a: AppointmentWithRefs) => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const start = new Date(appointment.starts_at);

  const changeStatus = (status: AppointmentStatus) => {
    startTransition(async () => {
      await setAppointmentStatus(appointment.id, status);
      onClose();
    });
  };

  const remove = () => {
    // Видалення незворотне й прибирає запис з історії доходу — питаємо.
    if (
      !confirm(
        `Видалити запис «${appointment.client.name}» ${dayTitle(start)}? Цю дію не можна скасувати.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteAppointment(appointment.id);
      onClose();
    });
  };

  return (
    <div>
      <div className="rounded-[var(--radius-tile)] bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <StatusBadge status={appointment.status} />
          <span className="text-[15px] text-ink-muted">{dayTitle(start)}</span>
        </div>

        <h3 className="mt-4 text-[26px] leading-tight">
          {appointment.client.name}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="sand">{appointment.service.title}</Chip>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="tnum text-[17px]">
            {timeRange(start, appointment.duration_min)}
            <span className="ml-2 text-[15px] text-ink-muted">
              {durationLabel(appointment.duration_min)}
            </span>
          </span>
          {appointment.price > 0 && (
            <span className="tnum rounded-full bg-canvas px-4 py-2 text-[17px]">
              {formatMoney(appointment.price)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-tile)] bg-surface">
        <Row label="Клієнт" value={appointment.client.name} />
        <Row label="Телефон" value={formatPhone(appointment.client.phone)} />
        {appointment.client.notes && (
          <Row label="Нотатки про клієнта" value={appointment.client.notes} />
        )}
        {appointment.note && <Row label="Коментар" value={appointment.note} />}
        {appointment.source === "site" && (
          <Row label="Джерело" value="Заявка з сайту" />
        )}
      </div>

      <div className="mt-5 space-y-3">
        <a
          href={`tel:${appointment.client.phone}`}
          className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-ink px-6 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" />
          </svg>
          Подзвонити
        </a>

        {appointment.status === "planned" && (
          <div className="grid grid-cols-3 gap-2">
            {NEXT_STATUS.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(s.id)}
                className="min-h-[48px] cursor-pointer rounded-full border border-line px-3 text-[14px] transition-colors duration-200 hover:border-ink disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Курс — це 3–7 візитів того самого клієнта, тож наступний запис
            створюється частіше, ніж редагується поточний. Звідси окремий
            рядок і повна ширина, а не третя кнопка в ряду з видаленням. */}
        <Button onClick={() => onRepeat(appointment)} full>
          Наступний запис
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button tone="light" onClick={() => onEdit(appointment)} full>
            Редагувати
          </Button>
          <Button tone="danger" onClick={remove} disabled={pending} full>
            Видалити
          </Button>
        </div>
      </div>
    </div>
  );
}
