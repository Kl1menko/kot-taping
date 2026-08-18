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

  // — Оплачено: далі робити нічого —
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

  // — Рахунок виставлено й чекає оплати —
  if (live) {
    return (
      <div className="rounded-[18px] bg-canvas p-5">
        <div className="flex flex-wrap items-start gap-5">
          {qrSvg && (
            <div
              // Тло біле завжди: QR на кольоровому сканується гірше.
              className="inline-flex shrink-0 rounded-[18px] bg-white p-3 ring-1 ring-inset ring-line"
              // Розмітка від бібліотеки, не від користувача: рядок будується
              // з `page_url`, який ми поклали в базу з відповіді банку.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              role="img"
              aria-label="QR-код для оплати"
            />
          )}

          <div className="min-w-[200px] flex-1">
            <p className="text-[15px]">
              {formatAmount(live.amount)} —{" "}
              <span className="text-ink-muted">
                {PAYMENT_STATUS_LABEL[live.status as PaymentStatus]}
              </span>
            </p>

            {live.expires_at && (
              <p className="mt-1 text-[13px] text-ink-muted">
                Дійсний до{" "}
                {new Date(live.expires_at).toLocaleString("uk-UA", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            <p className="mt-4 break-all text-[13px]">
              <a
                href={live.page_url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-4"
              >
                Посилання на оплату
              </a>
            </p>

            <div className="mt-4">
              <Button
                tone="light"
                disabled={pending}
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
        </div>
      </div>
    );
  }

  // — Еквайринг не налаштований —
  if (!enabled) {
    return (
      <p className="rounded-[18px] bg-canvas px-5 py-4 text-[14px] leading-relaxed text-ink-muted">
        Оплату не налаштовано: у змінних оточення бракує `MONO_TOKEN`.
      </p>
    );
  }

  // — Рахунку немає або він відпав: можна виставляти —
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
