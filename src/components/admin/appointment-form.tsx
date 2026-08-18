"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveAppointment,
  type AppointmentState,
} from "@/app/admin/calendar/actions";
import { toDateTimeLocal } from "@/lib/calendar";
import type { AppointmentWithRefs } from "@/lib/db/appointments";
import type { LocationRow, ServiceRow } from "@/lib/db/types";
import { DATE_INPUT_CLS, INPUT_CLS } from "@/lib/form";
import { Button } from "./ui";

const INITIAL: AppointmentState = { status: "idle" };

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[14px] text-ink-muted">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
          {error}
        </span>
      )}
    </label>
  );
}

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} full>
      {pending ? "Зберігаю…" : editing ? "Зберегти зміни" : "Створити запис"}
    </Button>
  );
}

export function AppointmentForm({
  services,
  locations,
  appointment,
  repeatOf,
  defaultStart,
  onDone,
}: {
  services: ServiceRow[];
  locations: LocationRow[];
  /** Присутній — режим редагування. */
  appointment?: AppointmentWithRefs;
  /**
   * Повтор: створюємо новий запис, але поля заповнюємо з попереднього.
   *
   * Курс — це 3–7 візитів того самого клієнта на ту саму послугу, і без цього
   * майстриня щоразу вбивала ім'я, телефон, послугу, ціну й тривалість заново.
   * Від `appointment` відрізняється тим, що `id` не передається: у базу піде
   * вставка, а не оновлення.
   */
  repeatOf?: AppointmentWithRefs;
  defaultStart?: Date;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveAppointment, INITIAL);

  // Звідки брати значення полів: редагований запис, попередній (повтор) або
  // порожньо. Далі формі байдуже, який саме це випадок, — крім `id`, який
  // ставиться лише в редагуванні.
  const source = appointment ?? repeatOf;

  // Ціна й тривалість підставляються з прайсу, але лишаються редагованими:
  // реальний сеанс часто відрізняється від типового.
  const [serviceId, setServiceId] = useState(
    source?.service_id ?? services[0]?.id ?? "",
  );
  const selected = services.find((s) => s.id === serviceId);

  const [price, setPrice] = useState(
    String(source?.price ?? services[0]?.price ?? 0),
  );
  const [duration, setDuration] = useState(
    String(source?.duration_min ?? services[0]?.duration_min ?? 60),
  );

  const pickService = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    // Підставляємо лише при створенні з нуля. І в редагуванні, і в повторі
    // майстриня вже могла домовитись про іншу ціну — затирати її було б грубо.
    if (!source) {
      setPrice(String(svc.price));
      setDuration(String(svc.duration_min));
    }
  };

  // Закриваємо лист після успіху — саме в ефекті, бо onDone міняє стан
  // батька, а робити це під час рендеру не можна.
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  // Час — єдине, що в повторі НЕ переноситься: сенс наступного запису саме в
  // тому, щоб призначити інший день.
  const start =
    appointment?.starts_at != null
      ? new Date(appointment.starts_at)
      : (defaultStart ?? new Date());

  return (
    <form action={action} noValidate className="space-y-5">
      {appointment && <input type="hidden" name="id" value={appointment.id} />}

      <Field label="Ім'я клієнта" error={state.fieldErrors?.name}>
        <input
          name="name"
          type="text"
          required
          defaultValue={source?.client.name ?? ""}
          autoComplete="off"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Телефон" error={state.fieldErrors?.phone}>
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          placeholder="0XX XXX XX XX або +380…"
          defaultValue={source?.client.phone ?? ""}
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Послуга" error={state.fieldErrors?.service}>
        <select
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => pickService(e.target.value)}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </Field>

      {/* Кабінет ховаємо, коли він один — зайвий вибір без вибору. */}
      {locations.length > 1 ? (
        <Field label="Кабінет" error={state.fieldErrors?.location}>
          <select
            name="locationId"
            required
            defaultValue={source?.location_id ?? locations[0]?.id ?? ""}
            className={`${INPUT_CLS} cursor-pointer`}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.city} — {l.address}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input
          type="hidden"
          name="locationId"
          value={source?.location_id ?? locations[0]?.id ?? ""}
        />
      )}

      <Field label="Дата й час" error={state.fieldErrors?.startsAt}>
        <input
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={toDateTimeLocal(start)}
          className={`${INPUT_CLS} ${DATE_INPUT_CLS} cursor-pointer`}
        />
      </Field>

      {/* [&>*]:min-w-0 — колонки сітки не мають розсуватись під вміст. */}
      <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
        <Field label="Тривалість, хв" error={state.fieldErrors?.duration}>
          <input
            name="duration"
            type="number"
            min={5}
            step={5}
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`${INPUT_CLS} tnum`}
          />
        </Field>

        <Field label="Ціна, ₴" error={state.fieldErrors?.price}>
          <input
            name="price"
            type="number"
            min={0}
            step={50}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${INPUT_CLS} tnum`}
          />
        </Field>
      </div>

      {selected?.price_from && (
        <p className="text-[13px] leading-relaxed text-ink-muted">
          У прайсі ця послуга йде «від {selected.price.toLocaleString("uk-UA")} ₴»
          — уточніть суму під розмір роботи.
        </p>
      )}

      <Field label="Коментар">
        <textarea
          name="note"
          rows={2}
          defaultValue={appointment?.note ?? ""}
          className={`${INPUT_CLS} min-h-[80px] resize-y py-3 leading-relaxed`}
        />
      </Field>

      {state.status === "error" && state.message && (
        <div role="alert" className="rounded-2xl bg-blush px-4 py-3">
          <p className="text-[14px] leading-relaxed">{state.message}</p>
          {/* Накладка — не помилка вводу, тож даємо явний шлях далі. */}
          {state.message.startsWith("Накладка") && (
            <button
              type="submit"
              name="force"
              value="1"
              className="mt-3 cursor-pointer rounded-full border border-ink px-4 py-2 text-[14px] transition-colors duration-200 hover:bg-ink hover:text-white"
            >
              Зберегти попри накладку
            </button>
          )}
        </div>
      )}

      <div className="pt-1">
        <Submit editing={Boolean(appointment)} />
      </div>
    </form>
  );
}
