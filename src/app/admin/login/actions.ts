"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export type LoginState = { error?: string };

/** Груба, але дієва стеля перебору для одного пароля на один процес. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.until) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  if (rateLimited("admin")) {
    return { error: "Забагато спроб. Спробуйте за 10 хвилин." };
  }

  if (!password) {
    return { error: "Введіть пароль." };
  }

  const ok = await verifyPassword(password, env.adminPasswordHash());
  if (!ok) {
    return { error: "Невірний пароль." };
  }

  await createSession();

  // Тільки внутрішні шляхи: інакше ?from= стає відкритим редиректом.
  const target = from.startsWith("/admin") ? from : "/admin";
  redirect(target);
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
