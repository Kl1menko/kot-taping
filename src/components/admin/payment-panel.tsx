"use client";

import { useState, useTransition } from "react";
import { Button } from "./button";
import {
  PAYMENT_STATUS_LABEL,
  canReissue,
  formatAmount,
  isPaid,
  isPending,
  type PaymentStatus,
} from "@/lib/payments";
import type { PaymentRow } from "@/lib/db/types";

/**
 * Оплата в картці запису чи замовлення.
 *
 * Три стани, і кожен показує рівно те, що потрібно зараз:
 *  — рахунку немає: поле суми й кнопка «Виставити»;
 *  — рахунок живий: QR, посилання й кнопка звірки;
 *  — оплачено: сума, дата й нічого більше — далі робити нічого.
 *
 * QR приходить пропсом уже намальованим на сервері (див. `lib/qr.ts`):
 * бібліотека кодування важча за все інше на цьому екрані, і тягти її в
 * браузер заради картинки, яка після створення рахунку не змінюється,
 * немає сенсу.
 */

export function PaymentPanel({
  payments,
  defaultAmount,
  qrSvg,
  enabled = true,
  onIssue,
  onRefresh,
}: {
  payments: PaymentRow[];
  /** Ціна з прайсу, у гривнях. Майстриня може змінити перед виставленням. */
  defaultAmount: number;
  /**
   * Готовий SVG QR-коду для живого рахунку, намальований на сервері.
   * Рядок, а не ReactNode: так бібліотека кодування лишається на сервері.
   */
  qrSvg?: string | null;
  /** Чи налаштований еквайринг — без токена виставляти нічим. */
  enabled?: boolean;
  onIssue: (amountUah: number) => Promise<{ status: string; message?: string }>;
  onRefresh: (invoiceId: string) => Promise<{ status: string; message?: string }>;
}) {
  const [amount, setAmount] = useState(String(defaultAmount || ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statuses = payments.map((p) => p.status as PaymentStatus);
  const paid = payments.find((p) => isPaid(p.status as PaymentStatus));
  const live = payments.find((p) => isPending(p.status as PaymentStatus));

  if (paid) {
    return (
      <div className="rounded-[18px] bg-sand p-5">
        <p className="text-[15px]">
          Оплачено {formatAmount(paid.amount)}
          {paid.paid_at && (
            <span className="text-ink-muted">
              {" · "}
              {new Date(paid.paid_at).toLocaleString("uk-UA", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (live) {
    return (
      <div className="@container rounded-[18px] bg-canvas p-5">
        {/* QR великий і по центру.

            Раніше він стояв ліворуч, а сума з кнопками — праворуч; колонка з
            `min-w-[200px]` не влазила у вікно (560px мінус відступи), падала
            під код, і секція розсипалась на різнокаліберні рядки біля лівого
            краю.

            Зараз код — головний елемент панелі, бо його показують клієнту
            просто з екрана телефона: чим більший, тим упевненіше сканується
            з відстані й під кутом. Тому він на всю ширину, а підписи — під
            ним, а не збоку. */}
        {qrSvg && (
          <div
            // Тло біле завжди: QR на кольоровому сканується гірше. Поле
            // навколо коду — теж вимога сканера, тому падінг щедрий.
            // `[&>svg]` перебиває зашиті бібліотекою width/height="220":
            // код тягнеться на всю ширину контейнера, лишаючись квадратним.
            className="mx-auto w-full max-w-[320px] rounded-[18px] bg-white p-4 ring-1 ring-inset ring-line [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            // Розмітка від бібліотеки, не від користувача: рядок будується
            // з `page_url`, який ми поклали в базу з відповіді банку.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
            aria-label="QR-код для оплати"
          />
        )}

        {/* Сума й статус — під кодом, теж по центру: інакше вони висіли б
            біля лівого краю під симетричним квадратом. */}
        <div className="mt-5 text-center">
          <p className="tnum text-[26px] leading-none">
            {formatAmount(live.amount)}
          </p>

          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1 text-[13px]">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[#b07d4e]"
            />
            {PAYMENT_STATUS_LABEL[live.status as PaymentStatus]}
          </span>

          {live.expires_at && (
            <p className="tnum mt-2 text-[13px] text-ink-muted">
              Дійсний до{" "}
              {new Date(live.expires_at).toLocaleString("uk-UA", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Дві дії однієї ваги — рядком, на всю ширину.

            Посилання було текстовим і підкресленим, кнопка — пілюлею: різні на
            вигляд, хоч роблять сусідні речі. Тепер обидві однакові.

            У вузькій панелі — стовпчиком: «Перевірити оплату» в половині
            такої ширини ламається на два рядки, і сусідні кнопки виходять
            різної висоти.

            `@container`, а не медіазапит: ширина тут залежить від панелі, у
            яку вкладено компонент, а не від вікна браузера. Медіазапит на
            широкому екрані з вузькою панеллю дав би саме той злам, який ми
            прибираємо. */}
        <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 @[340px]:flex-row">
          <a
            href={live.page_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center rounded-full border border-[#d4d4d4] px-4 text-[15px] text-ink transition-colors duration-200 hover:border-ink"
          >
            Посилання
          </a>

          <Button
            tone="light"
            disabled={pending}
            className="flex-1"
            onClick={() =>
              startTransition(async () => {
                const res = await onRefresh(live.invoice_id);
                setError(res.status === "error" ? (res.message ?? null) : null);
              })
            }
          >
            {pending ? "Перевіряю…" : "Перевірити оплату"}
          </Button>
        </div>

        {error && <p className="mt-3 text-[14px] text-[#b3261e]">{error}</p>}
      </div>
    );
  }

  if (!enabled) {
    return (
      <p className="rounded-[18px] bg-canvas px-5 py-4 text-[14px] leading-relaxed text-ink-muted">
        Оплату не налаштовано: у змінних оточення бракує `MONO_TOKEN`.
      </p>
    );
  }

  const blocked = !canReissue(statuses);
  // Остання невдала спроба — щоб майстриня бачила, чому не вийшло.
  const failed = payments[0];

  return (
    <div className="rounded-[18px] bg-canvas p-5">
      {failed && (
        <p className="mb-4 text-[14px] text-ink-muted">
          Попередній рахунок: {PAYMENT_STATUS_LABEL[failed.status as PaymentStatus]}
          {failed.failure_reason && ` — ${failed.failure_reason}`}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="block text-[13px] text-ink-muted">Сума, ₴</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 h-[52px] w-full rounded-full border border-line bg-surface px-5 text-[15px] outline-none focus:border-ink"
          />
        </label>

        <Button
          disabled={pending || blocked}
          onClick={() =>
            startTransition(async () => {
              // Кома як десятковий роздільник — звична розкладка, і на
              // телефоні цифрова клавіатура часто дає саме її.
              const value = Number(amount.replace(",", ".").trim());
              const res = await onIssue(value);
              setError(res.status === "error" ? (res.message ?? null) : null);
            })
          }
        >
          {pending ? "Виставляю…" : "Виставити рахунок"}
        </Button>
      </div>

      {error && <p className="mt-3 text-[14px] text-[#b3261e]">{error}</p>}
    </div>
  );
}
