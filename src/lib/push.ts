import "server-only";

import webpush from "web-push";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

/**
 * Пуш-сповіщення в адмінку-PWA.
 *
 * Той самий принцип, що й у `notify.ts`: сповіщення ніколи не важливіше за
 * подію, про яку воно сповіщає. Заявка вже в базі — і якщо push-сервіс лежить
 * або ключі не задані, ми пишемо в лог і йдемо далі, а не валимо відповідь
 * клієнтці.
 *
 * Канал не замінює Telegram, а доповнює його: Telegram веде в чат, пуш —
 * одразу в потрібний розділ адмінки.
 */

/** Що показати на екрані телефону. */
export type PushMessage = {
  title: string;
  body: string;
  /** Куди вести по тапу. Відносний шлях у межах адмінки. */
  url?: string;
  /**
   * Ключ склеювання. Сповіщення з однаковим тегом заміщають одне одного, тож
   * п'ять заявок за вечір дадуть один рядок у шторці, а не п'ять.
   */
  tag?: string;
};

let configured = false;

/**
 * Ключі VAPID — ними push-сервіс перевіряє, що пуш справді від нас.
 *
 * Налаштовуємо ліниво й один раз: `setVapidDetails` кидає на кривих ключах, і
 * робити це на імпорті означало б валити будь-яку сторінку, що бодай
 * опосередковано тягне цей модуль, — навіть якщо пуші там не потрібні.
 */
function ensureConfigured(): boolean {
  if (configured) return true;

  const publicKey = env.vapidPublicKey();
  const privateKey = env.vapidPrivateKey();
  if (!publicKey || !privateKey) return false;

  try {
    // `mailto:` — вимога специфікації: push-сервіс має куди написати, якщо
    // з нашою розсилкою щось не так.
    webpush.setVapidDetails(env.vapidSubject(), publicKey, privateKey);
    configured = true;
    return true;
  } catch (error) {
    console.error("[push] Некоректні VAPID-ключі:", error);
    return false;
  }
}

/** Чи взагалі налаштовані пуші — щоб не показувати кнопку, яка не спрацює. */
export function isPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey() && env.vapidPrivateKey());
}

/**
 * Розсилає сповіщення на всі підписані пристрої.
 *
 * Мертві підписки видаляємо одразу: 404 і 410 від push-сервісу означають, що
 * браузер відкликав ендпойнт (застосунок видалили, дані сайту почистили).
 * Тримати їх — це щоразу платити запитом за гарантовану помилку.
 */
export async function sendPush(message: PushMessage): Promise<number> {
  if (!ensureConfigured()) {
    console.info("[push] VAPID не налаштовано — пропускаю сповіщення");
    return 0;
  }

  const { data: subscriptions, error } = await db()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    console.error("[push] Не вдалося прочитати підписки:", error.message);
    return 0;
  }
  if (!subscriptions || subscriptions.length === 0) return 0;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url ?? "/admin",
    tag: message.tag,
  });

  // Паралельно й через allSettled: один мертвий пристрій не має скасовувати
  // доставку на решту.
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        // Сповіщення про заявку цінне лише сьогодні: доба в черзі — стеля.
        { TTL: 60 * 60 * 24 },
      ),
    ),
  );

  const dead: string[] = [];
  const alive: string[] = [];

  results.forEach((result, i) => {
    const sub = subscriptions[i];
    if (result.status === "fulfilled") {
      alive.push(sub.id);
      return;
    }

    const status = (result.reason as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      dead.push(sub.id);
    } else {
      console.error(`[push] Помилка доставки (${status ?? "?"}):`, result.reason);
    }
  });

  if (dead.length > 0) {
    await db().from("push_subscriptions").delete().in("id", dead);
  }
  if (alive.length > 0) {
    await db()
      .from("push_subscriptions")
      .update({ last_ok_at: new Date().toISOString() })
      .in("id", alive);
  }

  return alive.length;
}
