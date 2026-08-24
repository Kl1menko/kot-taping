"use client";

import { useEffect, useState } from "react";
import {
  subscribeDevice,
  sendTestPush,
  unsubscribeDevice,
} from "@/app/admin/push-actions";
import { Button } from "./button";

/**
 * Вмикач пуш-сповіщень для цього пристрою.
 *
 * Стан живе не в базі, а в браузері: підписка прив'язана до конкретного
 * встановленого застосунку, і «увімкнено» на телефоні нічого не означає для
 * планшета. Тому компонент завжди питає сам браузер, а не сервер.
 */

/**
 * `BASE64URL` з VAPID → байти, як того вимагає PushManager.
 *
 * Тип повернення явний — `Uint8Array<ArrayBuffer>`, а не просто `Uint8Array`:
 * за замовчуванням другий параметризований як `ArrayBufferLike`, куди входить
 * і `SharedArrayBuffer`, а `applicationServerKey` приймає лише звичайний
 * `ArrayBuffer`. Тому буфер створюємо самі, а не через `Uint8Array.from`.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);

  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type State =
  | { kind: "checking" }
  /** Браузер не вміє пушів або ключа немає — показати причину, а не кнопку. */
  | { kind: "unsupported"; reason: string }
  | { kind: "off" }
  | { kind: "on"; endpoint: string }
  /** Дозвіл відхилено назавжди: кнопка вже не допоможе, треба в налаштування. */
  | { kind: "denied" };

export function PushToggle({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!vapidPublicKey) {
        setState({
          kind: "unsupported",
          reason:
            "На сервері не задані ключі VAPID. Без них пуші не надсилаються.",
        });
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // Найчастіший випадок — Safari на iPhone, відкритий як сайт: там
        // Push API з'являється лише у застосунку з домашнього екрана.
        const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
        setState({
          kind: "unsupported",
          reason: isIos
            ? "На iPhone пуші працюють лише у встановленому застосунку: відкрийте «Поділитися» → «Додати на початковий екран» і зайдіть уже звідти."
            : "Цей браузер не підтримує пуш-сповіщення.",
        });
        return;
      }

      if (Notification.permission === "denied") {
        setState({ kind: "denied" });
        return;
      }

      try {
        // Реєструємо воркер одразу: без нього не дізнатись, чи підписка вже є.
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;

        setState(
          existing
            ? { kind: "on", endpoint: existing.endpoint }
            : { kind: "off" },
        );
      } catch (error) {
        if (cancelled) return;
        setState({
          kind: "unsupported",
          reason: `Не вдалося запустити service worker: ${
            error instanceof Error ? error.message : "невідома помилка"
          }`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  const enable = async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    setNote(null);

    try {
      // Дозвіл питаємо саме тут, у відповідь на тап: браузери ігнорують
      // запит, зроблений без жесту користувача.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? { kind: "denied" } : { kind: "off" });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Анонімні пуші браузери вже не приймають — лише адресні.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // `toJSON` дає саме ту форму (endpoint + keys), яку чекає сервер.
      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const result = await subscribeDevice(
        {
          endpoint: json.endpoint ?? subscription.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
        },
        navigator.userAgent,
      );

      if (!result.ok) {
        // Підписка в браузері без рядка на сервері — стан-привид: сповіщень
        // не буде, а вмикач показував би «увімкнено». Відкочуємо.
        await subscription.unsubscribe();
        setState({ kind: "off" });
        setNote(result.message ?? "Не вдалося увімкнути.");
        return;
      }

      setState({ kind: "on", endpoint: subscription.endpoint });
      setNote("Готово. Надішліть тестове, щоб перевірити.");
    } catch (error) {
      setNote(
        `Не вдалося увімкнути: ${
          error instanceof Error ? error.message : "невідома помилка"
        }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setNote(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unsubscribeDevice(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setState({ kind: "off" });
      setNote("Сповіщення вимкнено на цьому пристрої.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setNote(null);
    const result = await sendTestPush();
    setNote(result.message);
    setBusy(false);
  };

  return (
    <section className="rounded-[var(--radius-tile)] bg-surface p-5">
      <h2 className="text-[16px]">Сповіщення на цей пристрій</h2>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-ink-muted">
        Пуш приходить на екран телефону, коли з сайту прилітає заявка чи
        замовлення набору — навіть якщо застосунок закритий.
      </p>

      <div className="mt-4">
        {state.kind === "checking" && (
          <p className="text-[14px] text-ink-muted">Перевіряю…</p>
        )}

        {state.kind === "unsupported" && (
          <p className="text-[14px] leading-relaxed text-ink-muted">
            {state.reason}
          </p>
        )}

        {state.kind === "denied" && (
          <p className="text-[14px] leading-relaxed text-ink-muted">
            Сповіщення заблоковані в налаштуваннях браузера. Дозвольте їх для
            цього сайту — кнопка звідси вже не допоможе.
          </p>
        )}

        {state.kind === "off" && (
          <Button onClick={enable} disabled={busy}>
            {busy ? "Вмикаю…" : "Увімкнути сповіщення"}
          </Button>
        )}

        {state.kind === "on" && (
          <div className="flex flex-wrap gap-2">
            <Button tone="light" onClick={test} disabled={busy}>
              Надіслати тестове
            </Button>
            <Button tone="light" onClick={disable} disabled={busy}>
              Вимкнути
            </Button>
          </div>
        )}
      </div>

      {note && (
        <p role="status" className="mt-3 text-[14px] leading-relaxed text-ink-muted">
          {note}
        </p>
      )}
    </section>
  );
}
