"use client";

import { useState } from "react";
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
    href: "/admin/kits",
    label: "Набори",
    icon: (
      <Icon>
        <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
        <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
        <path d="M12 13v7.5" />
      </Icon>
    ),
  },
];

/**
 * Розділи, що не вмістились у таб-бар.
 *
 * Їх п'ять — більше просто не влазить у рядок на телефоні, не перетворивши
 * підписи на нечитабельні. Тому внизу лишається щоденне (Сьогодні, Записи,
 * Заявки, Клієнти, Набори), а рідковживане — прайс і аналітика — живе за
 * кнопкою «Ще». На десктопі такого поділу немає: там усе в одному рядку.
 */
const MORE = [
  { href: "/admin/services", label: "Прайс" },
  { href: "/admin/analytics", label: "Аналітика" },
];

export function TabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Розділ із «Ще» відкритий — кнопка має бути підсвічена, інакше незрозуміло,
  // де ти опинився: у самому таб-барі цього пункту немає.
  const inMore = MORE.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
            role="dialog"
            aria-label="Інші розділи"
          >
            <ul className="space-y-1">
              {MORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    // Закриваємо тут, а не ефектом на зміну шляху: перехід на
                    // той самий розділ шляху не змінює, і меню лишалось би
                    // відкритим поверх екрана.
                    onClick={() => setMoreOpen(false)}
                    aria-current={
                      pathname.startsWith(item.href) ? "page" : undefined
                    }
                    className={[
                      "flex min-h-[56px] items-center rounded-2xl px-5 text-[16px]",
                      "transition-colors duration-200",
                      pathname.startsWith(item.href)
                        ? "bg-ink text-white"
                        : "hover:bg-canvas",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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

          {/* Вужча за решту: це вихід до рідковживаного, а не рівноправний
              розділ, і красти ширину в щоденних вкладок вона не має. */}
          <li className="w-[52px] shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label="Інші розділи"
              className={[
                "flex min-h-[58px] w-full cursor-pointer flex-col items-center justify-center gap-1 px-1 py-2",
                "transition-colors duration-200",
                moreOpen || inMore ? "text-ink" : "text-ink-muted",
              ].join(" ")}
            >
              <Icon>
                <circle cx="5" cy="12" r="1.4" />
                <circle cx="12" cy="12" r="1.4" />
                <circle cx="19" cy="12" r="1.4" />
              </Icon>
              <span className="text-[11px] leading-none">Ще</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
