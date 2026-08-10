"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";

const LINKS = [
  { href: "/admin", label: "Сьогодні" },
  { href: "/admin/requests", label: "Заявки" },
  { href: "/admin/calendar", label: "Календар" },
  { href: "/admin/clients", label: "Клієнти" },
  { href: "/admin/services", label: "Прайс" },
  { href: "/admin/analytics", label: "Аналітика" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Горизонтальна прокрутка живе тут, а не на body — вузький екран не
          має зсувати сторінку вбік. */}
      <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

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
