/**
 * Генерує ADMIN_PASSWORD_HASH для .env.local.
 *
 *   npm run admin:hash -- 'ваш-пароль'
 *
 * Логіка навмисно дублює src/lib/auth/password.ts: той модуль позначено
 * `server-only`, тож імпортувати його з голого Node не вийде.
 */
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

const password = process.argv[2];

if (!password) {
  console.error("Вкажіть пароль: npm run admin:hash -- 'ваш-пароль'");
  process.exit(1);
}

if (password.length < 12) {
  console.error(
    `Пароль закороткий (${password.length}). Мінімум 12 символів — ця сторінка ` +
      "відкрита в інтернет, а за нею телефони клієнтів.",
  );
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await scrypt(password, salt, KEY_LEN);

// Роздільник `:`, а не `$` — інакше .env-парсер прийме `$abc…` за змінну
// оточення й обріже хеш. Див. src/lib/auth/password.ts.
console.log(
  `\nADMIN_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}\n`,
);
console.log("Скопіюйте рядок вище у .env.local\n");
