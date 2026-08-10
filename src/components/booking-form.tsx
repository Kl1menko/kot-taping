"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitBooking, type BookingState } from "@/app/actions";
import { CATEGORIES, SERVICES, formatPrice } from "@/lib/services";
import { LOCATIONS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { INPUT_CLS } from "@/lib/form";

const INITIAL: BookingState = { status: "idle" };

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[14px] text-ink-muted">{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-1.5 block text-[13px] text-ink-muted">{hint}</span>
      )}
      {error && (
        <span role="alert" className="mt-1.5 block text-[13px] text-[#b3261e]">
          {error}
        </span>
      )}
    </label>
  );
}


function SubmitButton({ full }: { full?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "group inline-flex min-h-[56px] cursor-pointer items-center gap-4 rounded-full bg-ink py-2 pl-7 pr-2 text-[15px] text-white",
        "transition-colors duration-200 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50",
        full ? "w-full justify-between" : "",
      ].join(" ")}
    >
      {pending ? "Надсилаю…" : "Надіслати заявку"}
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-200 group-hover:translate-x-0.5">
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
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}

export function BookingForm({
  preselected = "",
  /** Rendered in the modal: lets the sheet close itself from the success state. */
  onDone,
  fullWidthSubmit,
}: {
  preselected?: string;
  onDone?: () => void;
  fullWidthSubmit?: boolean;
}) {
  const [state, action] = useActionState(submitBooking, INITIAL);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex h-full flex-col justify-center py-6 text-center sm:py-10"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-white">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>

        <h3 className="mt-7 text-[26px] leading-tight sm:text-[30px]">
          Заявку надіслано
        </h3>
        <p className="mx-auto mt-3 max-w-[38ch] text-[16px] leading-relaxed text-ink-muted">
          {state.message}
        </p>

        <div className="mx-auto mt-6 max-w-[38ch] rounded-2xl bg-canvas px-5 py-4">
          <p className="text-[15px] leading-relaxed text-ink-muted">
            Якщо питання термінове — напишіть напряму:
          </p>
          <nav aria-label="Соцмережі" className="mt-3 flex justify-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${s.label} — ${s.handle}`}
                className="grid size-11 place-items-center rounded-full bg-surface text-ink transition-colors duration-200 hover:bg-ink hover:text-white"
              >
                <SocialIcon id={s.id} />
              </a>
            ))}
          </nav>
        </div>

        {onDone && (
          <div className="mt-8">
            <button
              type="button"
              onClick={onDone}
              className="min-h-[52px] w-full cursor-pointer rounded-full bg-ink px-8 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a] sm:w-auto"
            >
              Закрити
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-6">
      <Field label="Ім'я" error={state.fieldErrors?.name}>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          aria-invalid={Boolean(state.fieldErrors?.name)}
          className={INPUT_CLS}
        />
      </Field>

      <Field
        label="Телефон"
        error={state.fieldErrors?.phone}
        hint="Зателефоную для підтвердження"
      >
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="+380 __ ___ __ __"
          aria-invalid={Boolean(state.fieldErrors?.phone)}
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Послуга" error={state.fieldErrors?.service}>
        <select
          name="service"
          required
          defaultValue={preselected}
          aria-invalid={Boolean(state.fieldErrors?.service)}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          <option value="" disabled>
            Оберіть послугу
          </option>
          {CATEGORIES.map((cat) => (
            <optgroup key={cat.id} label={cat.label}>
              {SERVICES.filter((s) => s.category === cat.id).map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title} — {formatPrice(s)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field label="Кабінет" error={state.fieldErrors?.location}>
        <select
          name="location"
          required
          defaultValue=""
          aria-invalid={Boolean(state.fieldErrors?.location)}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          <option value="" disabled>
            Оберіть місто
          </option>
          {LOCATIONS.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.city} — {l.address}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Бажана дата" error={state.fieldErrors?.date}>
        <input
          name="date"
          type="date"
          required
          aria-invalid={Boolean(state.fieldErrors?.date)}
          className={`${INPUT_CLS} cursor-pointer`}
        />
      </Field>

      <Field label="Коментар (необов'язково)">
        <textarea
          name="note"
          rows={3}
          className={`${INPUT_CLS} min-h-[96px] resize-y py-3 leading-relaxed`}
        />
      </Field>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[14px] text-[#b3261e]">
          {state.message}
        </p>
      )}

      <div className="pt-2">
        <SubmitButton full={fullWidthSubmit} />
      </div>
    </form>
  );
}
