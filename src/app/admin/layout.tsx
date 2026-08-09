import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/nav";
import { TabBar } from "@/components/admin/tab-bar";

export const metadata: Metadata = {
  title: { default: "Адмінка", template: "%s · Адмінка" },
  // За цією сторінкою — персональні дані клієнтів. Пошуковикам тут не місце.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  // Застосунок має займати екран цілком, включно із зоною під вирізом.
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // overflow-x-clip — страховка: горизонтально скролять лише смуги з
    // власним overflow (стрічка дат), а не сторінка цілком.
    <div className="min-h-dvh overflow-x-clip bg-canvas">
      <header className="hidden border-b border-line bg-surface md:block">
        <div className="mx-auto flex w-full max-w-[1360px] items-center gap-6 px-5 py-4 md:px-10">
          <Link href="/admin" className="text-[15px] whitespace-nowrap">
            Kotova Taping
          </Link>
          <AdminNav />
        </div>
      </header>

      {/* Нижній відступ звільняє місце під таб-бар і плаваючу кнопку. */}
      <main className="mx-auto w-full max-w-[1360px] px-5 py-6 pb-32 md:px-10 md:py-12 md:pb-12">
        {children}
      </main>

      <TabBar />
    </div>
  );
}
