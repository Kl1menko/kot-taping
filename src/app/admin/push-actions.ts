"use server";

import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { isPushConfigured, sendPush } from "@/lib/push";

/**
 * Керування підпискою пристрою на пуш-сповіщення.
 *
 * Живе поруч з адмінкою, а не в публічних `actions.ts`: підписатись може лише
 * майстриня, і кожна дія тут починається з перевірки сесії. Інакше будь-хто
 * зареєстрував би свій пристрій і отримував сповіщення з іменами й телефонами
 * клієнток.
 */

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Реєструє пристрій. Повторний виклик із того самого браузера — не дубль. */
export async function subscribeDevice(
  subscription: PushSubscriptionInput,
  userAgent: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false, message: "Браузер повернув неповну підписку." };
  }

  // Upsert по endpoint: той самий браузер на тому самому телефоні завжди дає
  // той самий ендпойнт, тож повторне вмикання оновлює ключі, а не плодить
  // рядки. Ключі справді змінюються — браузер уміє їх ротувати.
  const { error } = await db().from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent.slice(0, 300) || null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("[push] Не вдалося зберегти підписку:", error.message);
    return { ok: false, message: "Не вдалося зберегти підписку." };
  }

  return { ok: true };
}

/** Прибирає пристрій із розсилки. */
export async function unsubscribeDevice(
  endpoint: string,
): Promise<{ ok: boolean }> {
  await requireSession();

  const { error } = await db()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push] Не вдалося видалити підписку:", error.message);
    return { ok: false };
  }

  return { ok: true };
}

/**
 * Тестовий пуш на власні пристрої.
 *
 * Потрібен саме тому, що пуші мовчазні за задумом: без нього єдиний спосіб
 * перевірити канал — чекати живої заявки й сподіватись, що вона прийде.
 */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  await requireSession();

  if (!isPushConfigured()) {
    return {
      ok: false,
      message: "Ключі VAPID не задані — пуші вимкнено на сервері.",
    };
  }

  const delivered = await sendPush({
    title: "Перевірка зв'язку",
    body: "Пуш-сповіщення працюють. Так виглядатиме нова заявка.",
    url: "/admin/requests",
    tag: "test",
  });

  return delivered > 0
    ? { ok: true, message: `Надіслано на пристроїв: ${delivered}.` }
    : {
        ok: false,
        message: "Жоден пристрій не отримав сповіщення. Увімкніть його нижче.",
      };
}
