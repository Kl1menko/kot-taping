import "server-only";

import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

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
