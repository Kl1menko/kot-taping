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

/** Один підписаний пристрій — для списку в адмінці. */
export type PushDevice = {
  id: string;
  /** «iPhone · Safari» — з User-Agent, розібраного грубо, але впізнавано. */
  label: string;
  lastOkAt: string | null;
  createdAt: string;
  /** Чи це той пристрій, з якого дивляться зараз. */
  current: boolean;
};

/**
 * Впізнати пристрій за User-Agent.
 *
 * Розбір навмисно грубий: тут не аналітика, а відповідь на одне питання —
 * «котрий із моїх це рядок». Для двох-трьох пристроїв цього досить, а точний
 * парсер тягнув би залежність заради підпису в списку.
 */
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Невідомий пристрій";

  const platform = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X/.test(userAgent)
          ? "Mac"
          : /Windows/.test(userAgent)
            ? "Windows"
            : "Пристрій";

  // Порядок важливий: Chrome і Edge теж пишуть у UA «Safari», а Edge — ще й
  // «Chrome», тож перевіряємо від найспецифічнішого.
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;

  return browser ? `${platform} · ${browser}` : platform;
}

/**
 * Підписані пристрої.
 *
 * Потрібні саме тому, що пуші мовчазні: «не приходить» може означати і мертву
 * підписку, і те, що пристрій ніколи й не був підписаний, — а розрізнити це
 * без списку неможливо. `last_ok_at` показує, коли на нього востаннє справді
 * достукались.
 */
export async function listPushDevices(
  /** Ендпойнт пристрою, з якого дивляться, — щоб позначити його в списку. */
  currentEndpoint?: string,
): Promise<PushDevice[]> {
  await requireSession();

  const { data, error } = await db()
    .from("push_subscriptions")
    .select("id, endpoint, user_agent, last_ok_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[push] Не вдалося прочитати пристрої:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: deviceLabel(row.user_agent),
    lastOkAt: row.last_ok_at,
    createdAt: row.created_at,
    current: Boolean(currentEndpoint) && row.endpoint === currentEndpoint,
  }));
}

/**
 * Прибрати чужий пристрій зі списку — телефон, який загубився чи змінився.
 *
 * Свій вимикається вмикачем: там підписку треба зняти ще й у самому браузері,
 * інакше він лишиться зареєстрованим і мовчки з'явиться знову.
 */
export async function removePushDevice(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  const { error } = await db().from("push_subscriptions").delete().eq("id", id);

  if (error) {
    console.error("[push] Не вдалося прибрати пристрій:", error.message);
    return { ok: false, message: "Не вдалося прибрати пристрій." };
  }

  return { ok: true };
}
