"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Оновлення адмінки в реальному часі.
 *
 * Слухає таблицю-дзвіночок `realtime_pings` (див. supabase/migrations/
 * 0003_realtime.sql): тригери пишуть у неї назву зміненої таблиці, а самі
 * дані в браузер не течуть — у публікації лише дзвіночок. Отримавши сигнал,
 * викликаємо `router.refresh()`, і сторінку перемальовує сервер, як завжди,
 * під service-role і після перевірки сесії.
 *
 * Тому anon-ключ у бандлі нічого не відкриває: усе, що з ним можна прочитати,
 * — це факт «у таблиці appointments щось змінилось».
 */

/**
 * Ключі публічні за визначенням, але їх може не бути — тоді фіча просто
 * вимкнена, а адмінка працює як раніше. Читаємо через повні літерали
 * `process.env.NEXT_PUBLIC_*`: Next підставляє їх на етапі збірки лише за
 * точним збігом, динамічний доступ дав би undefined.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

function browserClient(): SupabaseClient | null {
  if (!URL_ || !KEY) return null;
  cached ??= createClient(URL_, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Один сигнал на секунду більш ніж достатньо: студія — це кілька змін на
    // годину, а без стелі сплеск на боці бази перетворився б на шквал
    // перемальовувань.
    realtime: { params: { eventsPerSecond: 1 } },
  });
  return cached;
}

/**
 * Перемальовує поточну сторінку, щойно змінилась будь-яка з `sources`.
 *
 * @param sources назви таблиць, які цікавлять цей екран. Календар не має
 *   смикатись через правку прайсу, тож фільтруємо на клієнті — сигнал
 *   спільний для всіх.
 */
export function useRealtimeRefresh(sources: string[]) {
  const router = useRouter();

  // Список у залежностях ефекту інакше перезапускав би підписку на кожен
  // рендер: масив-літерал щоразу новий.
  const key = sources.join(",");
  const pending = useRef(false);

  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;

    const wanted = new Set(key.split(","));

    /**
     * Кілька змін підряд (масова правка, конвертація заявки) прилітають
     * пачкою — збираємо їх в одне оновлення, інакше сторінка перемальовувалась
     * би по разу на кожну.
     */
    const schedule = () => {
      if (pending.current) return;
      pending.current = true;
      setTimeout(() => {
        pending.current = false;
        // Вкладка у фоні — оновлювати нема сенсу: повернення фокуса зробить
        // це саме (див. ефект нижче), а фоновий refresh лише жере батарею.
        if (document.visibilityState === "visible") router.refresh();
      }, 400);
    };

    const channel = supabase
      .channel("admin-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "realtime_pings" },
        (payload) => {
          const source = (payload.new as { source?: string } | null)?.source;
          if (source && wanted.has(source)) schedule();
        },
      )
      .subscribe();

    /**
     * Поки вкладка була у фоні, сокет міг відпасти (телефон заблокували,
     * ноут заснув), і частину сигналів ми проґавили. Тому повернення до
     * вкладки — це теж привід оновитись, незалежно від підписки.
     */
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [key, router]);
}
