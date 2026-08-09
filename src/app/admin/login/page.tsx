import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вхід",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from = "" } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-16">
      <div className="w-full max-w-[380px] rounded-[var(--radius-card)] bg-surface p-8 sm:p-10">
        <p className="text-[15px] text-ink-muted">
          <span aria-hidden="true">/ </span>Kotova Taping
        </p>
        <h1 className="mt-6 text-[28px] leading-tight">Вхід в адмінку</h1>

        <LoginForm from={from} />
      </div>
    </main>
  );
}
