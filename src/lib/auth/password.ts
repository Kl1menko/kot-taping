import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

/**
 * scrypt із вбудованого crypto — щоб не тягнути bcrypt (нативний білд) заради
 * одного пароля. Формат: `scrypt:<salt-hex>:<hash-hex>`, сіль у самому рядку.
 *
 * Роздільник саме `:`, а не звичний для scrypt/bcrypt `$`: значення живе в
 * .env, а тамтешні парсери (у т.ч. next) розкривають `$foo` як змінну — хеш
 * мовчки обрізався б до `scrypt`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LEN) return false;

  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LEN);
  // Порівняння за постійний час: наївне === зливає префікс хеша по таймінгу.
  return timingSafeEqual(actual, expected);
}
