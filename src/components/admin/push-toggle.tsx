"use client";

import { useEffect, useState } from "react";
import {
  listPushDevices,
  removePushDevice,
  subscribeDevice,
  sendTestPush,
  unsubscribeDevice,
  type PushDevice,
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

/**
 * «Сьогодні, 14:30» / «12 серпня» — коли востаннє достукались до пристрою.
 *
 * Точний час важить лише сьогодні: питання тут одне — «канал ще живий?».
 */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return sameDay
    ? `сьогодні, ${date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}`
    : date.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
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
  const [devices, setDevices] = useState<PushDevice[]>([]);

  /**
   * Перечитати список пристроїв.
   *
   * Ендпойнт передаємо, щоб позначити рядок цього пристрою: без позначки в
   * списку з двох однакових «iPhone · Safari» не зрозуміти, котрий свій.
   */
  const refreshDevices = async (endpoint?: string) => {
    try {
      setDevices(await listPushDevices(endpoint));
    } catch {
      // Список — довідка, а не керування: не вдалось прочитати, лишаємо
      // порожнім, вмикач від цього не залежить.
      setDevices([]);
    }
  };

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
        await refreshDevices(existing?.endpoint);
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
      await refreshDevices(subscription.endpoint);
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
      await refreshDevices();
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setNote(null);
    const result = await sendTestPush();
    setNote(result.message);
    // Розсилка оновлює `last_ok_at` і прибирає мертві підписки — список має
    // це показати, інакше «востаннє» лишалось би вчорашнім після перевірки.
    await refreshDevices(state.kind === "on" ? state.endpoint : undefined);
    setBusy(false);
  };

  const forget = async (id: string) => {
    setBusy(true);
    setNote(null);
    const result = await removePushDevice(id);
    if (!result.ok) setNote(result.message ?? "Не вдалося прибрати пристрій.");
    await refreshDevices(state.kind === "on" ? state.endpoint : undefined);
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

      {/* Список пристроїв. Потрібен саме тому, що пуші мовчазні: «не приходить»
          може означати і мертву підписку, і те, що цей пристрій ніколи й не
          був підписаний, — а розрізнити це інакше неможливо. */}
      {devices.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[14px] text-ink-muted">
            Підписані пристрої ({devices.length})
          </h3>

          <ul className="mt-3 space-y-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px]">
                    {device.label}
                    {device.current && (
                      <span className="text-ink-muted"> · цей</span>
                    )}
                  </span>
                  <span className="block text-[13px] text-ink-muted">
                    {device.lastOkAt
                      ? `Востаннє: ${formatWhen(device.lastOkAt)}`
                      : "Жодного сповіщення ще не доставлено"}
                  </span>
                </span>

                {/* Свій пристрій прибирається вмикачем «Вимкнути»: там
                    підписка знімається ще й у самому браузері, інакше він
                    лишиться зареєстрованим і мовчки з'явиться знову. */}
                {!device.current && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => forget(device.id)}
                    className="shrink-0 cursor-pointer text-[13px] text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
                  >
                    Прибрати
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
