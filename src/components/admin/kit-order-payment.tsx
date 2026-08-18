"use client";

import { useEffect, useState } from "react";
import { PaymentPanel } from "./payment-panel";
import {
  getKitOrderPayments,
  issueKitOrderInvoice,
  refreshPaymentStatus,
  type PaymentView,
} from "@/app/admin/payments/actions";

/**
 * Оплата в картці замовлення набору.
 *
 * Те саме, що й у записі, але з іншим джерелом даних — див.
 * `appointment-payment.tsx`. Дві тонкі обгортки замість однієї з прапорцем:
 * серверні екшени не можна вибирати за рядком, їх треба імпортувати явно.
 */
export function KitOrderPayment({
  orderId,
  defaultAmount,
}: {
  orderId: string;
  /** Ціна набору в гривнях. У наборів вона часто «від» — сума редагується. */
  defaultAmount: number;
}) {
  const [view, setView] = useState<PaymentView | null>(null);

  const load = () => {
    void getKitOrderPayments(orderId).then(setView);
  };

  useEffect(load, [orderId]);

  if (!view) return null;

  return (
    <PaymentPanel
      payments={view.payments}
      qrSvg={view.qrSvg}
      enabled={view.enabled}
      defaultAmount={defaultAmount}
      onIssue={async (amount) => {
        const res = await issueKitOrderInvoice(orderId, amount);
        load();
        return res;
      }}
      onRefresh={async (invoiceId) => {
        const res = await refreshPaymentStatus(invoiceId);
        load();
        return res;
      }}
    />
  );
}
