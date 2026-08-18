"use client";

import { useEffect, useState } from "react";
import { PaymentPanel } from "./payment-panel";
import {
  getAppointmentPayments,
  issueAppointmentInvoice,
  refreshPaymentStatus,
  type PaymentView,
} from "@/app/admin/payments/actions";

/**
 * Оплата в картці запису.
 *
 * Рахунки читаються, коли картку відкрили, а не разом зі списком: у денному
 * списку буває півтора десятка записів, і тягти оплати для всіх заради однієї
 * відкритої картки означало б зайвий запит на кожен рядок.
 *
 * Поки читаємо — місце під панель тримаємо порожнім, без спінера: запит іде
 * до тієї ж бази, що вже віддала картку, і блимання «завантаження» на частку
 * секунди дратує більше, ніж коротка пауза.
 */
export function AppointmentPayment({
  appointmentId,
  defaultAmount,
}: {
  appointmentId: string;
  /** Ціна запису в гривнях — підставляється у форму. */
  defaultAmount: number;
}) {
  const [view, setView] = useState<PaymentView | null>(null);

  const load = () => {
    void getAppointmentPayments(appointmentId).then(setView);
  };

  useEffect(load, [appointmentId]);

  if (!view) return null;

  return (
    <PaymentPanel
      payments={view.payments}
      qrSvg={view.qrSvg}
      enabled={view.enabled}
      defaultAmount={defaultAmount}
      onIssue={async (amount) => {
        const res = await issueAppointmentInvoice(appointmentId, amount);
        // Перечитуємо в будь-якому разі: на успіху з'явився рахунок, на
        // помилці міг змінитися статус старого (наприклад, протермінувався).
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
