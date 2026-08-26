import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SESSION_COOKIE = "kt_session";

const MAX_AGE_S = 60 * 60 * 24 * 14; // 14 днів

/**
 * У токені лише роль і час: користувач один, ідентифікувати нікого не треба,
 * а зайві дані в cookie — це зайві дані, які поїдуть у кожному запиті.
 */
export type SessionPayload = { role: "admin" };

function key() {
  return new TextEncoder().encode(env.sessionSecret());
}

async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key());
}

/** Повертає null на будь-якій проблемі: підпис, строк,формат. */
async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.role === "admin" ? { role: "admin" } : null;
  } catch {
    return null;
  }
}

export async function createSession() {
  const token = await encryptSession({ role: "admin" });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // На localhost secure-cookie браузер відкине, тому вмикаємо лише в проді.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decryptSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Захист кожної сторінки та Server Action в адмінці.
 *
 * Перевірка в `proxy.ts` — оптимістична (лише щоб не малювати логін-редирект
 * пізно) і сама по собі не є авторизацією: Server Actions це окремі HTTP-точки,
 * до яких можна звернутись напряму. Тому виклик тут обов'язковий, а не про
 * всяк випадок.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
