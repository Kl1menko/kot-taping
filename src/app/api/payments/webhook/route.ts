import { NextResponse } from "next/server";
import { parseInvoiceState, verifyWebhook, bodyDigest, MonoError } from "@/lib/mono";
import { updatePaymentStatus } from "@/lib/db/payments";

/**
 * Вебхук monobank: банк повідомляє, що статус рахунку змінився.
 *
 * Це єдиний публічний маршрут, який пише в базу без сесії, — тому підпис
 * перевіряється до будь-якої дії. Без перевірки будь-хто, хто знає адресу,
 * міг би позначити рахунок оплаченим.
 *
 * Тіло читаємо як текст і саме сирий рядок передаємо в перевірку: підпис
 * рахується над байтами, які надіслав банк. `req.json()` тут був би помилкою —
 * повторна серіалізація змінює пробіли, і підпис перестане сходитись.
 *
 * `dynamic = "force-dynamic"`: маршрут не має кешуватись ніколи.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-sign") ?? "";

  let valid: boolean;
  try {
    valid = await verifyWebhook(raw, signature);
  } catch (error) {
    // Не змогли дістати публічний ключ — це наша проблема, не банку: або не
    // задано MONO_TOKEN (ключ віддається лише за ним), або банк недоступний.
    // 500 змусить monobank повторити спробу пізніше, і оплата не загубиться.
    //
    // Свідомо НЕ вважаємо це «підпис не зійшовся»: 403 сказав би банку, що
    // повторювати не варто, і успішна оплата назавжди лишилась би непоміченою
    // через нашу ж помилку конфігурації.
    console.error(
      "[mono] не вдалося перевірити підпис:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!valid) {
    // Свідомо мовчазна відповідь: підказувати, що саме не так із підписом,
    // тому, хто його підробляє, не варто.
    console.warn(`[mono] відхилено вебхук із хибним підписом (${bodyDigest(raw)})`);
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let state;
  try {
    state = parseInvoiceState(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    // Підпис зійшовся, але тіло не те, чого ми чекаємо: новий статус або зміна
    // формату. Повторювати немає сенсу — 200, щоб банк не бомбардував нас,
    // і запис у лог, щоб ми про це дізналися.
    console.error(
      "[mono] не вдалося прочитати вебхук:",
      error instanceof MonoError ? error.message : error,
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const updated = await updatePaymentStatus({
      invoiceId: state.invoiceId,
      status: state.status,
      failureReason: state.failureReason,
      errCode: state.errCode,
    });

    if (!updated) {
      // Рахунку немає в базі: або він від іншого стенду з тим самим токеном,
      // або його видалили разом із записом. Повторний виклик не допоможе.
      console.warn(`[mono] вебхук для невідомого рахунку ${state.invoiceId}`);
    }
  } catch (error) {
    // База не відповіла — саме той випадок, коли повтор доречний.
    console.error(
      "[mono] не вдалося оновити рахунок:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
