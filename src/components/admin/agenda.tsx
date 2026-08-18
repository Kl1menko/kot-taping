import Link from "next/link";
import type { Task } from "@/lib/agenda";

/**
 * Список справ на головному екрані.
 *
 * Server Component без стану: це перелік «за що взятися», а кожен пункт веде
 * у свій розділ, де вже є всі дії. Тримати тут кнопки означало б дублювати
 * логіку заявок і замовлень на екрані, який має лише спрямовувати.
 */
export function Agenda({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-[var(--radius-tile)] bg-surface p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-white">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <div>
            <p className="text-[17px]">Усе опрацьовано</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">
              Нових заявок і замовлень немає — можна спокійно працювати за
              розкладом.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={task.href}
            className={[
              "flex items-center gap-4 rounded-[var(--radius-tile)] p-5 transition-colors duration-200",
              // Термінове — темною плиткою: воно має читатись першим навіть
              // краєм ока. Решта лишається спокійною, інакше «важливим»
              // виглядав би весь екран, а отже — нічого.
              task.tone === "urgent"
                ? "bg-ink text-white hover:bg-[#2a2a2a]"
                : "bg-surface hover:bg-sand",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[17px] leading-snug">{task.title}</p>
              {task.hint && (
                <p
                  className={[
                    "mt-1 text-[14px] leading-relaxed",
                    task.tone === "urgent" ? "text-white/70" : "text-ink-muted",
                  ].join(" ")}
                >
                  {task.hint}
                </p>
              )}
            </div>

            <span
              aria-hidden="true"
              className={[
                "grid size-9 shrink-0 place-items-center rounded-full",
                task.tone === "urgent" ? "bg-white text-ink" : "bg-canvas text-ink",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
