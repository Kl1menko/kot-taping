import Link from "next/link";

/**
 * Хлібні крихти.
 *
 * Потрібні двом читачам одразу: людині, яка зайшла з пошуку одразу на
 * внутрішню сторінку й не має іншого шляху «вгору», і Google, який показує їх
 * у сніпеті замість голого URL. Машиночитна копія — у `BreadcrumbList` зі
 * `structured-data.tsx`; тут лише видима частина.
 *
 * Останній елемент — не посилання: він і є поточна сторінка. `aria-current`
 * повідомляє це читачам з екрана.
 */
export function Breadcrumbs({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  return (
    <nav aria-label="Навігаційний ланцюжок">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-muted">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link
                  href={item.path}
                  className="underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                >
                  {item.name}
                </Link>
              )}
              {!last && (
                <span aria-hidden="true" className="text-line">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
