"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitBooking, type BookingState } from "@/app/actions";
import { CATEGORIES, formatPrice, type Service } from "@/lib/services";
import { LOCATIONS, SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { INPUT_CLS } from "@/lib/form";
import { cityLabel, type Dictionary } from "@/lib/dictionary";
import { DatePicker } from "./date-picker";
import {
  formatTime,
  hoursFor,
  hoursLabel,
  timesFor,
  toSchedule,
  type WorkingDay,
} from "@/lib/schedule";
import {
  CONTACT_CHANNELS,
  CONTRAINDICATIONS,
  TAPE_COLORS,
  isContactChannel,
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
  disabled,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  /** Проміжок закритий у графіку: видно, але обрати не можна. */
  disabled?: boolean;
  /** Необов'язковий: потрібен лише тим, хто показує залежні поля. */
  onSelect?: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex min-h-[52px] items-center justify-center rounded-2xl border px-3 text-center text-[15px]",
        "border-line bg-canvas transition-colors duration-200",
        "has-[:focus-visible]:border-ink",
        "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
        disabled
          ? "cursor-not-allowed border-dashed text-ink-muted/50"
          : "cursor-pointer",
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        defaultChecked={defaultChecked}
        onChange={() => onSelect?.(value)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

function SubmitButton({ full, t }: { full?: boolean; t: Dictionary }) {
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
      {pending ? t.form.submitting : t.form.submit}
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
  schedule = {},
  preselected = "",
  /** Rendered in the modal: lets the sheet close itself from the success state. */
  onDone,
  fullWidthSubmit,
  t,
}: {
  t: Dictionary;
  /** Прайс із бази: у списку лише те, на що справді можна записатись. */
  services: Service[];
  /**
   * Робочі дні по кабінетах — slug кабінету → відкриті дні.
   *
   * Приходить масивом, а не готовою `Schedule`: `Map` не переживає межу
   * сервер→клієнт, тож збираємо її вже тут.
   */
  schedule?: Record<string, WorkingDay[]>;
  preselected?: string;
  onDone?: () => void;
  fullWidthSubmit?: boolean;
}) {
  const [state, action] = useActionState(submitBooking, INITIAL);

  // Те, що людина ввела минулого разу. React скидає неконтрольовані поля, коли
  // серверний екшен завершується, тож після помилки значення приходять із
  // відповіді й повертаються у форму через `defaultValue`.
  const sent = state.values;

  // Форму перемонтовуємо на кожну відповідь: `defaultValue` React читає лише
  // при монтуванні, тож без зміни ключа поля лишилися б порожніми.
  const formKey = state.values ? JSON.stringify(state.values) : "initial";

  // Канал тримаємо в стані лише щоб показати/сховати поле ніка.
  const [channel, setChannel] = useState<ContactChannel>(
    isContactChannel(sent?.channel ?? "") ? (sent!.channel as ContactChannel) : "telegram",
  );

  // Кабінет тримаємо в стані: від нього залежить, які дати показувати. Обидва
  // кабінети в одній зоні, але майстриня фізично не буває в двох містах
  // одночасно, тож графік у кожного свій.
  const [location, setLocation] = useState(sent?.location ?? "");

  // `Map` не переживає межу сервер→клієнт, тож збираємо її тут — і лише коли
  // змінився кабінет, а не на кожен набраний у формі символ.
  const daysForLocation = useMemo(
    () => toSchedule(schedule[location] ?? []),
    [schedule, location],
  );

  // Дата зі стану, а не з DOM: від неї залежить сітка часу нижче.
  const [date, setDate] = useState(sent?.date ?? "");

  // Час, на який справді можна записатись цього дня. Рахується з робочих
  // годин, тож розійтися з розкладом майстрині не може.
  const times = useMemo(
    () => timesFor(daysForLocation, date),
    [daysForLocation, date],
  );

  const dayHours = hoursFor(daysForLocation, date);

  // Обраний час — теж у стані: поле приховане, а плитки малює React.
  const [time, setTime] = useState(sent?.time ?? "");

  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Перше помилкове поле — у фокус.
   *
   * Анкета довга й у модалці зі своєю прокруткою: без цього після відповіді
   * людина лишається внизу, біля кнопки, і бачить «перевірте виділені поля», а
   * самі поля — десь вище за межами екрана. Фокус заразом озвучує помилку
   * читачам з екрана.
   */
  useEffect(() => {
    if (state.status !== "error") return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    first.scrollIntoView({ block: "center", behavior: "smooth" });
    first.focus({ preventScroll: true });
  }, [state]);

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
          {t.form.sentTitle}
        </h3>
        <p className="mx-auto mt-3 max-w-[38ch] text-[16px] leading-relaxed text-ink-muted">
          {state.message}
        </p>

        <div className="mx-auto mt-6 max-w-[38ch] rounded-2xl bg-canvas px-5 py-4">
          <p className="text-[15px] leading-relaxed text-ink-muted">
            {t.form.urgent}
          </p>
          <nav aria-label={t.nav.socials} className="mt-3 flex justify-center gap-2">
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
    <form
      key={formKey}
      ref={formRef}
      action={action}
      noValidate
      className="space-y-6"
    >
      <Field label={t.form.name} error={state.fieldErrors?.name}>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          defaultValue={sent?.name ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          className={INPUT_CLS}
        />
      </Field>

      <Field
        label={t.form.phone}
        error={state.fieldErrors?.phone}
        hint={t.form.phoneHint}
      >
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={sent?.phone ?? ""}
          placeholder="0XX XXX XX XX"
          aria-invalid={Boolean(state.fieldErrors?.phone)}
          className={INPUT_CLS}
        />
      </Field>

      <Field label={t.form.service} error={state.fieldErrors?.service}>
        <select
          name="service"
          required
          defaultValue={sent?.service || preselected}
          aria-invalid={Boolean(state.fieldErrors?.service)}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          <option value="" disabled>
            {t.form.chooseService}
          </option>
          {CATEGORIES.map((cat) => {
            const items = services.filter((s) => s.category === cat.id);
            // Порожня категорія дала б порожню групу в списку — пропускаємо.
            if (items.length === 0) return null;

            return (
              <optgroup key={cat.id} label={t.categories[cat.id].label}>
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

      <Field label={t.form.location} error={state.fieldErrors?.location}>
        <select
          name="location"
          required
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            // Дата зі старого кабінету може бути закрита в новому — скидаємо
            // її разом із часом, а не лишаємо вибір, який перевірка відкине.
            setDate("");
            setTime("");
          }}
          aria-invalid={Boolean(state.fieldErrors?.location)}
          className={`${INPUT_CLS} cursor-pointer`}
        >
          <option value="" disabled>
            {t.form.chooseCity}
          </option>
          {LOCATIONS.map((l) => (
            <option key={l.slug} value={l.slug}>
              {cityLabel(t, l.slug).city || l.city} —{" "}
              {cityLabel(t, l.slug).address || l.address}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t.form.date} error={state.fieldErrors?.date}>
        <DatePicker
          key={location}
          name="date"
          schedule={daysForLocation}
          defaultValue={date}
          onSelect={(day) => {
            setDate(day);
            // Час зі старого дня може бути поза межами нового — скидаємо,
            // а не лишаємо вибір, який перевірка потім відкине.
            setTime("");
          }}
          invalid={Boolean(state.fieldErrors?.date)}
          awaitingLocation={!location}
        />
      </Field>

      <Field label={t.form.time} error={state.fieldErrors?.time}>
        {/* Значення для Server Action: сітка кнопок сама нічого не шле. */}
        <input type="hidden" name="time" value={time} />

        {!date ? (
          <p className="mt-2 text-[15px] text-ink-muted">
            Спершу оберіть дату — покажу вільні години.
          </p>
        ) : times.length === 0 ? (
          <p className="mt-2 text-[15px] text-ink-muted">
            На цей день вільних годин уже немає. Оберіть, будь ласка, іншу дату.
          </p>
        ) : (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {times.map((minutes) => {
                const value = formatTime(minutes);
                const active = value === time;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTime(value)}
                    aria-pressed={active}
                    className={[
                      "tnum min-h-[48px] cursor-pointer rounded-2xl border text-[15px]",
                      "transition-colors duration-200",
                      active
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-canvas hover:border-ink",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            <span className="mt-1.5 block text-[13px] text-ink-muted">
              {dayHours
                ? t.form.timeHours.replace("{hours}", hoursLabel(dayHours))
                : t.form.timeHint}
            </span>
          </>
        )}
      </Field>

      <Group
        title={t.form.contactTitle}
        hint={t.form.contactHint}
      >
        <div className="grid grid-cols-3 gap-2">
          {CONTACT_CHANNELS.map((c) => (
            <Choice
              key={c.id}
              name="channel"
              value={c.id}
              defaultChecked={(sent?.channel || "telegram") === c.id}
              onSelect={(v) => setChannel(v as ContactChannel)}
            >
              {t.form.channels[c.id as keyof typeof t.form.channels] ?? c.label}
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
                defaultValue={sent?.handle ?? ""}
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
        title={t.form.detailsTitle}
        hint="Необов'язково — але якщо заповните, я одразу розрахую матеріал і
              нам не доведеться це узгоджувати листуванням."
      >
        <Field label={t.form.tapeColor}>
          <select
            name="tape_color"
            defaultValue={sent?.tapeColor ?? ""}
            className={`${INPUT_CLS} cursor-pointer`}
          >
            <option value="">Не обрано</option>
            {TAPE_COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.form.height} error={state.fieldErrors?.height}>
          <input
            name="height"
            type="text"
            defaultValue={sent?.height ?? ""}
            inputMode="numeric"
            placeholder="168"
            aria-invalid={Boolean(state.fieldErrors?.height)}
            className={INPUT_CLS}
          />
        </Field>

        <Field label={t.form.measurements} hint={t.form.measurementsHint}>
          <textarea
            name="measurements"
            rows={2}
            defaultValue={sent?.measurements ?? ""}
            className={`${INPUT_CLS} min-h-[72px] resize-y py-3 leading-relaxed`}
          />
        </Field>
      </Group>

      <Group
        title={t.form.contraTitle}
        hint={t.form.contraHint}
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
                defaultChecked={sent?.contraindications.includes(c.id) ?? false}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
              />
              <span className="text-[15px] leading-snug">
                {t.form.contraindications[
                  c.id as keyof typeof t.form.contraindications
                ] ?? c.label}
              </span>
            </label>
          ))}
        </div>
      </Group>

      <Field label={t.form.note}>
        <textarea
          name="note"
          rows={3}
          defaultValue={sent?.note ?? ""}
          className={`${INPUT_CLS} min-h-[96px] resize-y py-3 leading-relaxed`}
        />
      </Field>

      <div className="border-t border-line pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={sent?.consent ?? false}
            aria-invalid={Boolean(state.fieldErrors?.consent)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
          />
          <span className="text-[14px] leading-relaxed text-ink-muted">
            {t.form.consent}
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
        <SubmitButton full={fullWidthSubmit} t={t} />
      </div>
    </form>
  );
}
