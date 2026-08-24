/**
 * Service worker адмінки — рівно для пуш-сповіщень.
 *
 * Кешування тут навмисно відсутнє. Адмінка показує живі дані — записи на
 * сьогодні, нові заявки, залишок оплат, — і закешована сторінка тут гірша за
 * її відсутність: майстриня повірила б учорашньому розкладу. Тому жодного
 * `fetch`-обробника: усі запити йдуть у мережу, як без воркера.
 *
 * Файл лежить у `public/`, а не збирається бандлером, свідомо: воркер має
 * віддаватися з кореня, інакше його область дії звузиться до підтеки і
 * підписка з `/admin` не працюватиме.
 */

// Нова версія воркера має ставати активною одразу, а не чекати, доки
// закриються всі вкладки: інакше виправлення в обробнику пуша доїде до
// телефону лише після повного перезапуску PWA.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Вхідний пуш.
 *
 * `event.data` може не бути зовсім: специфікація дозволяє порожній пуш, а
 * деякі сервіси шлють такий для перевірки каналу. Показуємо тоді нейтральний
 * текст — мовчазний пуш браузер однаково покаже сам, але вже своїм
 * службовим написом «Цей сайт оновлено у фоні».
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Не JSON — беремо як звичайний текст, аби не втратити сповіщення.
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Kotova Taping";
  const options = {
    body: payload.body || "Є оновлення в адмінці.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    // Куди вести по тапу — читає обробник `notificationclick` нижче.
    data: { url: payload.url || "/admin" },
    // Тег склеює сповіщення одного роду: три заявки поспіль дадуть один рядок,
    // що оновлюється, а не три однакові в шторці.
    tag: payload.tag || "kotova",
    // Але саме склеювання має бути помітним: без цього оновлення тихе, і
    // друга заявка не привернула б уваги.
    renotify: Boolean(payload.tag),
    // Заявка чекає на відповідь, тож сповіщення не має зникати саме.
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Браузер перевипустив підписку — треба перереєструвати її на сервері.
 *
 * Ендпойнт не вічний: браузери ротують його самі (закінчився термін ключа,
 * оновився push-сервіс), і старий тихо перестає приймати пуші. Без цього
 * обробника вмикач у адмінці показував би «увімкнено», а сповіщення не
 * приходили б — найгірший з можливих станів, бо він не схожий на поломку.
 *
 * Ключ беремо з `event.oldSubscription`, а не з константи: у файлі, що
 * віддається статикою, змінних оточення немає, а `applicationServerKey` старої
 * підписки — це рівно наш VAPID-ключ.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription?.options?.applicationServerKey;
      if (!key) return;

      try {
        const fresh = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });

        // Звичайним `fetch`, а не Server Action: воркер живе поза React, і
        // єдиний доступний йому канал — HTTP-ендпойнт.
        await fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: fresh.toJSON(),
            oldEndpoint: event.oldSubscription?.endpoint ?? null,
          }),
        });
      } catch (error) {
        // Лишається мовчазний збій, але іншого виходу тут немає: показати
        // помилку нікому, а валити воркер означало б втратити й решту пушів.
        console.error("[sw] не вдалося перепідписатись:", error);
      }
    })(),
  );
});

/**
 * Тап по сповіщенню: піднімаємо вже відкриту адмінку, а не плодимо вкладки.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          // Уже відкрите вікно PWA — переводимо його на потрібний розділ.
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
