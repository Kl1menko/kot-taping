"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import {
  clearLoginAttempts,
  registerLoginAttempt,
} from "@/lib/auth/rate-limit";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  if (!password) {
    return { error: "Введіть пароль." };
  }

  // Рахуємо після перевірки на порожнє поле: випадковий Enter у порожній формі
  // не має з'їдати спробу. Але до перевірки пароля — інакше ліміту немає сенсу.
  if (await registerLoginAttempt()) {
    return { error: "Забагато спроб. Спробуйте за 10 хвилин." };
  }

  const ok = await verifyPassword(password, env.adminPasswordHash());
  if (!ok) {
    return { error: "Невірний пароль." };
  }

  // Правильний пароль знімає лічильник: інакше майстриня, яка кілька разів
  // не влучила, а потім згадала пароль, лишалась би за межею ліміту разом із
  // тим, від кого ми захищаємось.
  await clearLoginAttempts();
  await createSession();

  // Тільки внутрішні шляхи: інакше ?from= стає відкритим редиректом.
  const target = from.startsWith("/admin") ? from : "/admin";
  redirect(target);
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
