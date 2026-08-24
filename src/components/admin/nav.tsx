"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { ADMIN_SECTIONS, isActiveSection } from "@/lib/admin-nav";

/**
 * Список спільний із таб-баром (`@/lib/admin-nav`), і це важливо: доти, доки
 * копій було дві, вони встигли розійтись — той самий `/admin/calendar` звався
 * тут «Календар», а внизу «Записи», і порядок розділів не збігався. Людина
 * вчиться розташуванню пунктів, а не читає їх щоразу; коли воно міняється
 * разом із шириною екрана, вчитись нема чому.
 *
 * На десктопі показуємо всі розділи: поділ на «щоденне» й «Ще» існує лише
 * тому, що в рядок телефона не влазить більше п'яти.
 */
const LINKS = ADMIN_SECTIONS;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Горизонтальна прокрутка живе тут, а не на body — вузький екран не
          має зсувати сторінку вбік. */}
      <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
        {LINKS.map((link) => {
          const active = isActiveSection(link.href, pathname);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={[
                "whitespace-nowrap rounded-full px-4 py-2 text-[14px] transition-colors duration-200",
                active
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:bg-canvas hover:text-ink",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="cursor-pointer whitespace-nowrap rounded-full border border-line px-4 py-2 text-[14px] text-ink-muted transition-colors duration-200 hover:border-ink hover:text-ink"
        >
          Вийти
        </button>
      </form>
    </>
  );
}
