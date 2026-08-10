/**
 * Заготовки для `loading.tsx`.
 *
 * Усі сторінки адмінки — `force-dynamic`, тобто кожен перехід чекає на базу.
 * Без цих екранів мобільний перехід виглядає як зависання: таб уже підсвічено,
 * а вміст ще старий.
 *
 * Пульсацію глушить глобальне правило `prefers-reduced-motion` у globals.css,
 * тож окремо тут її вимикати не треба.
 *
 * Server Components: жодної інтерактивності, лише розмітка.
 */

/** Сірий прямокутник на місці майбутнього тексту чи картки. */
export function Bar({
  className = "",
}: {
  /** Ширина й висота задаються ззовні — форма залежить від екрана. */
  className?: string;
}) {
  return (
    <div className={`animate-pulse rounded-full bg-line ${className}`} />
  );
}

export function SkeletonHeading() {
  return <Bar className="h-8 w-48" />;
}

/** Список карток — календар, заявки, клієнти виглядають однаково. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="mt-5 space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="rounded-[var(--radius-tile)] bg-surface p-5"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between gap-4">
            <Bar className="h-5 w-40" />
            <Bar className="h-5 w-16" />
          </div>
          <Bar className="mt-3 h-4 w-32" />
          <div className="mt-4 flex gap-2">
            <Bar className="h-7 w-24" />
            <Bar className="h-7 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Обгортка з підписом для читача екрана: візуально сторінка «мерехтить», але
 * без цього повідомлення зміна стану лишилась би нечутною.
 */
export function SkeletonScreen({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Завантаження…</span>
      {children}
    </div>
  );
}
