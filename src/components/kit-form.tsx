"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitKitOrder, type KitOrderState } from "@/app/kit-actions";
import { SOCIALS } from "@/lib/contacts";
import { SocialIcon } from "./social-icons";
import { INPUT_CLS } from "@/lib/form";
import {
  CONTACT_CHANNELS,
  TAPE_COLORS,
  needsHandle,
  type ContactChannel,
} from "@/lib/intake";
import {
  DELIVERY_COUNTRIES,
  FACE_COLOR_NOTE,
  formatKitPrice,
  isWorldwide,
  type Kit,
} from "@/lib/kits";

const INITIAL: KitOrderState = { status: "idle" };

/**
 * Зразок кольору для кружечка біля назви. «На ваш розсуд» свідомо без кольору —
 * показувати для нього якийсь конкретний було б обіцянкою, якої ми не даємо.
 */
const SWATCH: Record<string, string> = {
  Бежевий: "#e4c9a8",
  Чорний: "#2a2a2a",
  Білий: "#ffffff",
  Синій: "#3b5ea8",
  Рожевий: "#e8a0b4",
  Блакитний: "#8fc4de",
  Зелений: "#7ba87b",
};

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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[56px] w-full cursor-pointer rounded-full bg-ink px-8 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Надсилаю…" : "Замовити набір"}
    </button>
  );
}

export function KitForm({
  kits,
  preselected,
  onDone,
}: {
  kits: Kit[];
  preselected?: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(submitKitOrder, INITIAL);

  // Три речі, від яких залежить, що показувати далі: набір вирішує колір і
  // заміри, канал — поле ніка, країна — попередження про вартість доставки.
  const [kitSlug, setKitSlug] = useState(preselected ?? kits[0]?.slug ?? "");
  const [channel, setChannel] = useState<ContactChannel>("telegram");
  const [country, setCountry] = useState<string>("Україна");

  const kit = kits.find((k) => k.slug === kitSlug);

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
          Замовлення прийнято
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
      <fieldset>
        <legend className="text-[14px] text-ink-muted">Набір</legend>

        {/* Картки, а не `select`: набір — головний вибір у формі, і він має
            бути видно цілком, разом із ціною. У згорнутому списку його
            доводилося б відкривати, щоб побачити варіанти. */}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {kits.map((k) => (
            <label
              key={k.slug}
              className={[
                "cursor-pointer rounded-2xl border px-4 py-3.5 transition-colors duration-200",
                "border-line bg-canvas has-[:focus-visible]:border-ink",
                "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
              ].join(" ")}
            >
              <input
                type="radio"
                name="kit"
                value={k.slug}
                checked={kitSlug === k.slug}
                onChange={() => setKitSlug(k.slug)}
                className="sr-only"
              />
              <span className="block text-[16px] leading-snug">{k.title}</span>
              <span className="mt-1 block text-[13px] opacity-70">
                {formatKitPrice(k)}
              </span>
            </label>
          ))}
        </div>

        {state.fieldErrors?.kit && (
          <p role="alert" className="mt-2 text-[13px] text-[#b3261e]">
            {state.fieldErrors.kit}
          </p>
        )}

        {kit && (
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            {kit.summary}
          </p>
        )}
      </fieldset>

      <div className="grid gap-6 border-t border-line pt-7 sm:grid-cols-2 [&>*]:min-w-0">
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

        <Field label="Телефон" error={state.fieldErrors?.phone}>
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
      </div>

      <fieldset className="space-y-4 border-t border-line pt-7">
        <legend className="sr-only">Спосіб зв&apos;язку</legend>
        <p className="text-[15px]">Як із вами зв&apos;язатися</p>

        <div className="grid grid-cols-3 gap-2">
          {CONTACT_CHANNELS.map((c) => (
            <label
              key={c.id}
              className={[
                "flex min-h-[52px] cursor-pointer items-center justify-center rounded-2xl border px-3 text-center text-[15px]",
                "border-line bg-canvas transition-colors duration-200",
                "has-[:focus-visible]:border-ink",
                "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
              ].join(" ")}
            >
              <input
                type="radio"
                name="channel"
                value={c.id}
                defaultChecked={c.id === "telegram"}
                onChange={() => setChannel(c.id)}
                className="sr-only"
              />
              {c.label}
            </label>
          ))}
        </div>

        {needsHandle(channel) && (
          <Field
            label={channel === "instagram" ? "Нік в Instagram" : "Нік у Telegram"}
            error={state.fieldErrors?.handle}
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
        )}
      </fieldset>

      <fieldset className="space-y-6 border-t border-line pt-7">
        <legend className="sr-only">Параметри набору</legend>

        {/* Колір лише там, де він є: обличчя тейпується білим. */}
        {kit?.allowsColor ? (
          <div>
            <p className="text-[14px] text-ink-muted">Колір тейпу</p>
            {/* Зразками, а не списком: колір обирають оком. */}
            <div className="mt-2 flex flex-wrap gap-2">
              {TAPE_COLORS.map((c) => (
                <label
                  key={c}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[14px]",
                    "border-line bg-canvas transition-colors duration-200",
                    "has-[:focus-visible]:border-ink",
                    "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="tape_color"
                    value={c}
                    className="sr-only"
                  />
                  {SWATCH[c] && (
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full ring-1 ring-inset ring-black/15"
                      style={{ background: SWATCH[c] }}
                    />
                  )}
                  {c}
                </label>
              ))}
            </div>
          </div>
        ) : (
          kit && (
            <p className="text-[14px] leading-relaxed text-ink-muted">
              {FACE_COLOR_NOTE}
            </p>
          )
        )}

        {kit?.needsMeasurements && (
          <Field
            label="Ваші параметри, см"
            hint="Потрібні, щоб розкроїти тейп під ваше обличчя. Що саме виміряти — підкажу в чаті, якщо не впевнені."
          >
            <textarea
              name="measurements"
              rows={3}
              placeholder="Наприклад: ширина чола 14, довжина обличчя 19"
              className={`${INPUT_CLS} min-h-[96px] resize-y py-3 leading-relaxed`}
            />
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-6 border-t border-line pt-7">
        <legend className="sr-only">Доставка</legend>
        <p className="text-[15px]">Куди надіслати</p>

        <div className="grid gap-6 sm:grid-cols-2 [&>*]:min-w-0">
          <Field label="Країна">
            <select
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${INPUT_CLS} cursor-pointer`}
            >
              {DELIVERY_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Місто" error={state.fieldErrors?.city}>
            <input
              name="city"
              type="text"
              required
              aria-invalid={Boolean(state.fieldErrors?.city)}
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <p className="text-[13px] leading-relaxed text-ink-muted">
          {isWorldwide(country)
            ? "Доставка за кордон — вартість порахую окремо й скажу до оплати."
            : "Точну адресу й відділення візьму в чаті, коли підтвердимо замовлення."}
        </p>
      </fieldset>

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
            Погоджуюсь на обробку персональних даних для оформлення замовлення.
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
        <SubmitButton />
      </div>
    </form>
  );
}
