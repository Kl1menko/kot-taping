"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[52px] w-full cursor-pointer rounded-full bg-ink px-8 text-[15px] text-white transition-colors duration-200 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Перевіряю…" : "Увійти"}
    </button>
  );
}

export function LoginForm({ from }: { from: string }) {
  const [state, action] = useActionState(login, INITIAL);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="from" value={from} />

      <label className="block">
        <span className="text-[14px] text-ink-muted">Пароль</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={Boolean(state.error)}
          className="mt-2 block min-h-[52px] w-full rounded-2xl border border-line bg-canvas px-4 text-[16px] transition-colors duration-200 focus:border-ink focus:outline-none"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-[14px] text-[#b3261e]">
          {state.error}
        </p>
      )}

      <div className="pt-2">
        <Submit />
      </div>
    </form>
  );
}
