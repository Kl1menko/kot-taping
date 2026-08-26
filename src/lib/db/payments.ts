import "server-only";

import { db } from "./client";
import type { PaymentRow } from "./types";
import { isPaid, type PaymentStatus } from "@/lib/payments";

/** До чого прив'язаний рахунок. Рівно одне з двох — так вимагає міграція. */
export type PaymentTarget =
  | { appointmentId: string }
  | { kitOrderId: string };

function targetColumn(target: PaymentTarget) {
  return "appointmentId" in target
    ? { column: "appointment_id" as const, value: target.appointmentId }
    : { column: "kit_order_id" as const, value: target.kitOrderId };
}

export async function listPayments(
  target: PaymentTarget,
): Promise<PaymentRow[]> {
  const { column, value } = targetColumn(target);

  const { data, error } = await db()
    .from("payments")
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Не вдалося прочитати рахунки: ${error.message}`);
  return data ?? [];
}

/**
 * Рахунки одразу для списку записів — щоб екран не робив запит на рядок.
 *
 * Повертає мапу «id цілі → її рахунки». Порожній список id не питаємо: `in()`
 * з порожнім масивом дає порожню вибірку, але зайвий похід у базу.
 */
export async function mapPayments(
  column: "appointment_id" | "kit_order_id",
  ids: string[],
): Promise<Map<string, PaymentRow[]>> {
  const map = new Map<string, PaymentRow[]>();
  if (ids.length === 0) return map;

  const { data, error } = await db()
    .from("payments")
    .select("*")
    .in(column, ids)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Не вдалося прочитати рахунки: ${error.message}`);

  for (const row of data ?? []) {
    const key = row[column];
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

async function getPaymentByInvoice(
  invoiceId: string,
): Promise<PaymentRow | null> {
  const { data, error } = await db()
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати рахунок: ${error.message}`);
  return data ?? null;
}

export async function createPayment(input: {
  target: PaymentTarget;
  invoiceId: string;
  pageUrl: string;
  amount: number;
  expiresAt: string;
}): Promise<PaymentRow> {
  // Колонку призначення пишемо явними полями, а не обчисленим ключем:
  // `{ [column]: value }` розширює тип до індексної сигнатури, і перевірка
  // форми рядка перестає працювати саме там, де вона потрібна.
  const target =
    "appointmentId" in input.target
      ? { appointment_id: input.target.appointmentId }
      : { kit_order_id: input.target.kitOrderId };

  const { data, error } = await db()
    .from("payments")
    .insert({
      ...target,
      invoice_id: input.invoiceId,
      page_url: input.pageUrl,
      amount: input.amount,
      expires_at: input.expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(`Не вдалося зберегти рахунок: ${error.message}`);
  return data;
}

/**
 * Оновлення статусу з вебхука.
 *
 * `paid_at` ставимо лише на переході в success і лише якщо його ще немає:
 * банк надсилає вебхук повторно, і другий виклик не має посувати час оплати.
 */
export async function updatePaymentStatus(input: {
  invoiceId: string;
  status: PaymentStatus;
  failureReason?: string;
  errCode?: string;
}): Promise<(PaymentRow & { justPaid: boolean }) | null> {
  const current = await getPaymentByInvoice(input.invoiceId);
  if (!current) return null;

  // Чи це перехід в «оплачено» саме зараз. monobank повторює вебхук, доки не
  // отримає 200, тож без цієї ознаки кожен повтор виглядав би як нова оплата —
  // і слав би ще один пуш.
  const justPaid = isPaid(input.status) && !current.paid_at;

  const { data, error } = await db()
    .from("payments")
    .update({
      status: input.status,
      failure_reason: input.failureReason ?? null,
      err_code: input.errCode ?? null,
      ...(isPaid(input.status) && !current.paid_at
        ? { paid_at: new Date().toISOString() }
        : {}),
    })
    .eq("invoice_id", input.invoiceId)
    .select()
    .single();

  if (error) throw new Error(`Не вдалося оновити рахунок: ${error.message}`);
  return { ...data, justPaid };
}
