"use client";

import { useEffect } from "react";

/**
 * Межа помилок для всієї адмінки.
 *
 * Сторінки тут кидають виняток, коли база недоступна (`Не вдалося прочитати
 * записи…`). Без цього файлу майстриня отримувала б стандартний екран Next
 * англійською — між клієнтами, з телефона, без жодної підказки що робити.
 *
 * Текст помилки показуємо лише в розробці. У проді Next замінює повідомлення
 * серверних винятків на «Minified React error #…», тож на екрані з'являлося б
 * технічне сміття замість причини — лякає й нічого не пояснює. Там лишається
 * `digest`: за ним помилку видно в логах Vercel.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-[var(--radius-tile)] bg-surface p-6">
      <h1 className="text-[22px] leading-tight">Не вдалося завантажити дані</h1>

      <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-muted">
        Найчастіше це тимчасовий збій зв&apos;язку з базою. Натисніть
        «Спробувати ще» — якщо помилка повторюється, перевірте інтернет.
      </p>

      <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-[14px] leading-relaxed break-words text-ink-muted">
        {process.env.NODE_ENV === "development" && (
          <span className="block">{error.message}</span>
        )}
        {error.digest ? (
          <span className="block text-[13px]">Код помилки: {error.digest}</span>
        ) : (
          process.env.NODE_ENV !== "development" && (
            <span className="block text-[13px]">
              Якщо це повторюється — надішліть розробнику час і цей екран.
            </span>
          )
        )}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={retry}
          className="min-h-[52px] cursor-pointer rounded-full bg-ink px-7 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
        >
          Спробувати ще
        </button>
        <a
          href="/admin"
          className="inline-flex min-h-[52px] items-center rounded-full border border-line px-7 text-[15px] transition-colors duration-200 hover:border-ink"
        >
          На головну
        </a>
      </div>
    </div>
  );
}
