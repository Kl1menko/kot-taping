"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { createInvoice, getInvoiceStatus, MonoError } from "@/lib/mono";
import {
  createPayment,
  listPayments,
  updatePaymentStatus,
  type PaymentTarget,
} from "@/lib/db/payments";
import {
  INVOICE_VALIDITY_SEC,
  canReissue,
  isPending,
  paymentDestination,
  toMinor,
  validateAmount,
  type PaymentStatus,
} from "@/lib/payments";
import { paymentQrSvg } from "@/lib/qr";
import type { PaymentRow } from "@/lib/db/types";
import { SITE_URL } from "@/lib/site";

/**
 * Виставлення рахунку з адмінки.
 *
 * Рахунок виставляється вручну після того, як майстриня узгодила час — так
 * само, як обіцяє лендінг: «це не миттєве бронювання». Автоматичного рахунку
 * на кожну заявку немає навмисно.
 */

export type InvoiceState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Куди платити — щоб екран одразу показав QR без походу в базу. */
  pageUrl?: string;
};

/**
 * Стан оплати для картки в адмінці.
 *
 * QR приходить готовим рядком SVG: екрани адмінки клієнтські, і бібліотека
 * кодування інакше поїхала б у бандл браузера. Малюємо лише для живого
 * рахунку — для оплаченого чи протермінованого код нікому не потрібен.
 */
export type PaymentView = {
  payments: PaymentRow[];
  qrSvg: string | null;
  /**
   * Чи налаштований еквайринг. Без токена кнопка «Виставити рахунок» лише
   * привела б до помилки — краще чесно сказати, чого бракує.
   */
  enabled: boolean;
};

async function view(target: PaymentTarget): Promise<PaymentView> {
  const payments = await listPayments(target);
  const live = payments.find((p) => isPending(p.status as PaymentStatus));
  return {
    payments,
    qrSvg: live ? await paymentQrSvg(live.page_url) : null,
    enabled: env.hasMonoToken(),
  };
}

/** Оплати за записом — читає екран календаря, коли відкриває картку. */
export async function getAppointmentPayments(
  appointmentId: string,
): Promise<PaymentView> {
  await requireSession();
  return view({ appointmentId });
}

/** Оплати за замовленням набору. */
export async function getKitOrderPayments(
  kitOrderId: string,
): Promise<PaymentView> {
  await requireSession();
  return view({ kitOrderId });
}

/** Спільна частина: перевірки, виклик банку, запис у базу. */
async function issue({
  target,
  title,
  amountUah,
  reference,
}: {
  target: PaymentTarget;
  /** Назва послуги чи набору — піде в призначення платежу. */
  title: string;
  amountUah: number;
  reference: string;
}): Promise<InvoiceState> {
  const amountError = validateAmount(amountUah);
  if (amountError) return { status: "error", message: amountError };

  // Другий живий рахунок на ту саму послугу означав би два QR у клієнтки.
  const existing = await listPayments(target);
  if (!canReissue(existing.map((p) => p.status as PaymentStatus))) {
    const paid = existing.some((p) => p.status === "success");
    return {
      status: "error",
      message: paid
        ? "За цим записом уже оплачено."
        : "Рахунок уже виставлено й він ще діє. Дочекайтесь оплати або протермінування.",
    };
  }

  const amount = toMinor(amountUah);

  let invoice;
  try {
    invoice = await createInvoice({
      amount,
      destination: paymentDestination(title),
      reference,
      // Абсолютна адреса: банк ходить ззовні, відносний шлях йому нікуди вести.
      webHookUrl: `${SITE_URL}/api/payments/webhook`,
      redirectUrl: `${SITE_URL}/payment/done`,
    });
  } catch (error) {
    // Помилку банку показуємо як є: «карта заблокована» майстрині зрозуміліше
    // за наше «сталася помилка».
    return {
      status: "error",
      message:
        error instanceof MonoError
          ? `Банк не виставив рахунок: ${error.message}`
          : "Не вдалося виставити рахунок. Спробуйте ще раз.",
    };
  }

  try {
    await createPayment({
      target,
      invoiceId: invoice.invoiceId,
      pageUrl: invoice.pageUrl,
      amount,
      expiresAt: new Date(Date.now() + INVOICE_VALIDITY_SEC * 1000).toISOString(),
    });
  } catch (error) {
    // Рахунок у банку вже є, а в нас не зберігся: показуємо посилання, щоб
    // робота не пропала, але чесно кажемо, що в історії його не буде.
    console.error("[mono] рахунок створено, але не збережено:", error);
    return {
      status: "error",
      message:
        "Рахунок створено в банку, але не зберігся в системі. " +
        `Посилання: ${invoice.pageUrl}`,
      pageUrl: invoice.pageUrl,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/kits");

  return { status: "success", pageUrl: invoice.pageUrl };
}

/** Рахунок за процедуру. Суму бере з форми — у прайсі багато позицій «від». */
export async function issueAppointmentInvoice(
  appointmentId: string,
  amountUah: number,
): Promise<InvoiceState> {
  await requireSession();

  const { data, error } = await db()
    .from("appointments")
    .select("id, services(title)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати запис: ${error.message}`);
  if (!data) return { status: "error", message: "Запис не знайдено." };

  // PostgREST повертає вкладену реляцію об'єктом або масивом залежно від
  // кардинальності — зводимо до рядка тут, а не в кожному місці показу.
  const service = data.services as unknown as { title?: string } | { title?: string }[] | null;
  const title = Array.isArray(service) ? service[0]?.title : service?.title;

  return issue({
    target: { appointmentId },
    title: title ?? "Процедура",
    amountUah,
    reference: appointmentId,
  });
}

/** Рахунок за набір для самотейпування. */
export async function issueKitOrderInvoice(
  kitOrderId: string,
  amountUah: number,
): Promise<InvoiceState> {
  await requireSession();

  const { data, error } = await db()
    .from("kit_orders")
    .select("id, kit_slug")
    .eq("id", kitOrderId)
    .maybeSingle();

  if (error) throw new Error(`Не вдалося прочитати замовлення: ${error.message}`);
  if (!data) return { status: "error", message: "Замовлення не знайдено." };

  const { data: kit } = await db()
    .from("kits")
    .select("title")
    .eq("slug", data.kit_slug)
    .maybeSingle();

  return issue({
    target: { kitOrderId },
    title: kit?.title ? `набір «${kit.title}»` : "Набір для тейпування",
    amountUah,
    reference: kitOrderId,
  });
}

/**
 * Ручна звірка статусу.
 *
 * Вебхук — головний шлях, але він може не дійти: впав деплой, змінився домен,
 * банк не достукався. Кнопка «Перевірити» дає майстрині спосіб дізнатися
 * правду, не чекаючи й не гадаючи.
 */
export async function refreshPaymentStatus(invoiceId: string): Promise<InvoiceState> {
  await requireSession();

  try {
    const state = await getInvoiceStatus(invoiceId);
    await updatePaymentStatus({
      invoiceId: state.invoiceId,
      status: state.status,
      failureReason: state.failureReason,
      errCode: state.errCode,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MonoError
          ? `Банк не відповів: ${error.message}`
          : "Не вдалося перевірити статус.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/kits");

  return { status: "success" };
}
