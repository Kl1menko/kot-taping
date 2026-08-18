"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBooking, type BookingState } from "@/app/actions";
import { CATEGORIES, formatPrice, type Service } from "@/lib/services";
import { LOCATIONS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { DATE_INPUT_CLS, INPUT_CLS } from "@/lib/form";
import {
  CONTACT_CHANNELS,
  CONTRAINDICATIONS,
  PREFERRED_TIMES,
  TAPE_COLORS,
  needsHandle,
  type ContactChannel,
} from "@/lib/intake";

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


/**
 * Підзаголовок групи полів. Анкета довга, і суцільний стовпчик із двадцяти
 * полів читається як медична форма, а не як запис зі сторіз, — розділювачі
 * тримають її на око короткою.
 */
function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-6 border-t border-line pt-7">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="text-[15px] text-ink">{title}</p>
        {hint && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {hint}
          </p>
        )}
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Радіо-кнопка як плитка: пальцем влучити легше, ніж у нативний кружок.
 *
 * Поле навмисно некероване, а виділення малює CSS через `has-[:checked]`.
 * Керований варіант тут був би пасткою: `checked` без `onChange` React
 * заморожує, і кнопка перестає перемикатись — саме так і сталося з вибором
 * часу. Кому потрібне значення в React (канал зв'язку), той слухає `onSelect`,
 * але вибір усе одно лишається за браузером.
 */
function Choice({
  name,
  value,
  defaultChecked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  /** Необов'язковий: потрібен лише тим, хто показує залежні поля. */
  onSelect?: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex min-h-[52px] cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-[15px]",
        "border-line bg-canvas transition-colors duration-200",
        "has-[:focus-visible]:border-ink",
        "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={() => onSelect?.(value)}
        className="sr-only"
      />
      {children}
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
  services,
  preselected = "",
  /** Rendered in the modal: lets the sheet close itself from the success state. */
  onDone,
  fullWidthSubmit,
}: {
  /** Прайс із бази: у списку лише те, на що справді можна записатись. */
  services: Service[];
  preselected?: string;
  onDone?: () => void;
  fullWidthSubmit?: boolean;
}) {
  const [state, action] = useActionState(submitBooking, INITIAL);

  // Канал тримаємо в стані лише щоб показати/сховати поле ніка. Решта форми —
  // некерована: значення живуть у DOM і переживають повернення з помилкою.
  const [channel, setChannel] = useState<ContactChannel>("telegram");

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
        hint="Потрібен для підтвердження запису"
      >
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="0XX XXX XX XX або +380…"
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
          {CATEGORIES.map((cat) => {
            const items = services.filter((s) => s.category === cat.id);
            // Порожня категорія дала б порожню групу в списку — пропускаємо.
            if (items.length === 0) return null;

            return (
              <optgroup key={cat.id} label={cat.label}>
                {items.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.title} — {formatPrice(s)}
                  </option>
                ))}
              </optgroup>
            );
          })}
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
          className={`${INPUT_CLS} ${DATE_INPUT_CLS} cursor-pointer`}
        />
      </Field>

      <Field label="Коли зручно">
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PREFERRED_TIMES.map((t) => (
            <Choice key={t.id} name="time" value={t.id}>
              <span className="leading-tight">
                {t.label}
                <span className="mt-0.5 block text-[12px] opacity-70">
                  {t.range}
                </span>
              </span>
            </Choice>
          ))}
        </div>
        <span className="mt-1.5 block text-[13px] text-ink-muted">
          Точний час узгодимо — підберу вільне вікно в цьому проміжку.
        </span>
      </Field>

      <Group
        title="Як із вами зв'язатися"
        hint="Напишу підтвердження з деталями запису."
      >
        <div className="grid grid-cols-3 gap-2">
          {CONTACT_CHANNELS.map((c) => (
            <Choice
              key={c.id}
              name="channel"
              value={c.id}
              defaultChecked={c.id === "telegram"}
              onSelect={(v) => setChannel(v as ContactChannel)}
            >
              {c.label}
            </Choice>
          ))}
        </div>

        {CONTACT_CHANNELS.filter((c) => c.id === channel).map((c) =>
          needsHandle(c.id) ? (
            <Field
              key={c.id}
              label={c.handleLabel!}
              error={state.fieldErrors?.handle}
              hint={c.hint}
            >
              <input
                name="handle"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="@nickname"
                aria-invalid={Boolean(state.fieldErrors?.handle)}
                className={INPUT_CLS}
              />
            </Field>
          ) : (
            <p key={c.id} className="text-[13px] text-ink-muted">
              {c.hint}
            </p>
          ),
        )}
      </Group>

      <Group
        title="Деталі процедури"
        hint="Необов'язково — але якщо заповните, я одразу розрахую матеріал і
              нам не доведеться це узгоджувати листуванням."
      >
        <Field label="Колір тейпу">
          <select name="tape_color" defaultValue="" className={`${INPUT_CLS} cursor-pointer`}>
            <option value="">Не обрано</option>
            {TAPE_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Зріст, см" error={state.fieldErrors?.height}>
          <input
            name="height"
            type="text"
            inputMode="numeric"
            placeholder="168"
            aria-invalid={Boolean(state.fieldErrors?.height)}
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Об'єми" hint="Наприклад: талія 68, стегна 95.">
          <textarea
            name="measurements"
            rows={2}
            className={`${INPUT_CLS} min-h-[72px] resize-y py-3 leading-relaxed`}
          />
        </Field>
      </Group>

      <Group
        title="Протипоказання"
        hint="Відмітьте, якщо щось із цього вас стосується. Це не відмова — ми
              просто обговоримо деталі до візиту, а не після нього."
      >
        <div className="space-y-1">
          {CONTRAINDICATIONS.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl px-1 py-2.5 transition-colors duration-200 has-[:focus-visible]:bg-canvas"
            >
              <input
                type="checkbox"
                name="contraindications"
                value={c.id}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
              />
              <span className="text-[15px] leading-snug">{c.label}</span>
            </label>
          ))}
        </div>
      </Group>

      <Field label="Коментар (необов'язково)">
        <textarea
          name="note"
          rows={3}
          className={`${INPUT_CLS} min-h-[96px] resize-y py-3 leading-relaxed`}
        />
      </Field>

      <div className="border-t border-line pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={Boolean(state.fieldErrors?.consent)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
          />
          <span className="text-[14px] leading-relaxed text-ink-muted">
            Погоджуюсь на обробку персональних даних для запису на процедуру.
          </span>
        </label>
        {state.fieldErrors?.consent && (
          <p role="alert" className="mt-2 text-[13px] text-[#b3261e]">
            {state.fieldErrors.consent}
          </p>
        )}
      </div>

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
