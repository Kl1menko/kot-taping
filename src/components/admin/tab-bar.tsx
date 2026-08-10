"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Нижня навігація — основний спосіб пересування в застосунку на телефоні.
 * На десктопі підіймається у верхній рядок (див. AdminNav), тож тут лише
 * мобільний варіант.
 */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TABS = [
  {
    href: "/admin",
    label: "Сьогодні",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V12l3 1.8" />
      </Icon>
    ),
  },
  {
    href: "/admin/calendar",
    label: "Записи",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </Icon>
    ),
  },
  {
    href: "/admin/requests",
    label: "Заявки",
    icon: (
      <Icon>
        <path d="M4 5h16v11a2 2 0 0 1-2 2H8l-4 3V5Z" />
      </Icon>
    ),
  },
  {
    href: "/admin/clients",
    label: "Клієнти",
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0-1.5-5.6M21 20a5 5 0 0 0-3.5-4.8" />
      </Icon>
    ),
  },
  {
    href: "/admin/services",
    label: "Прайс",
    icon: (
      <Icon>
        <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
        <circle cx="8" cy="8" r="1.4" />
      </Icon>
    ),
  },
  {
    href: "/admin/analytics",
    label: "Аналітика",
    icon: (
      <Icon>
        <path d="M5 20V10M12 20V4M19 20v-6" />
      </Icon>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основна навігація"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      // Домашній індикатор iPhone не має накривати підписи.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          // «Сьогодні» — точний збіг: startsWith("/admin") підсвічував би цю
          // вкладку на кожному екрані адмінки.
          const active =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-2",
                  "transition-colors duration-200",
                  active ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {tab.icon}
                <span className="text-[11px] leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
