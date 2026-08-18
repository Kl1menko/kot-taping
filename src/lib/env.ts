import "server-only";

/**
 * Читання серверних змінних оточення з падінням на старті, а не на першому
 * запиті. `server-only` гарантує, що цей модуль не потрапить у бандл клієнта:
 * жодна зі змінних тут не має префікса NEXT_PUBLIC_ і всі є секретами.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Не задано змінну оточення ${name}. Додайте її у .env.local (див. .env.example).`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  /** Мінімум 32 байти: під HS256 коротший ключ дає слабкий підпис. */
  sessionSecret: () => {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) {
      throw new Error(
        "SESSION_SECRET закороткий — потрібно щонайменше 32 символи. " +
          "Згенеруйте: openssl rand -base64 32",
      );
    }
    return secret;
  },

  /**
   * Перевіряємо форму хеша, а не лише наявність: `.env`-парсери розкривають
   * `$foo` як змінну, тож хеш зі старим роздільником `$` мовчки приїжджав
   * обрізаним до `scrypt` — і вхід падав як «невірний пароль».
   */
  adminPasswordHash: () => {
    const value = required("ADMIN_PASSWORD_HASH");
    const [scheme, salt, hash] = value.split(":");
    if (scheme !== "scrypt" || salt?.length !== 32 || hash?.length !== 128) {
      throw new Error(
        `ADMIN_PASSWORD_HASH має неправильний формат (отримано ${value.length} символів, ` +
          "очікується scrypt:<32 hex>:<128 hex>). Перегенеруйте: npm run admin:hash -- 'пароль'",
      );
    }
    return value;
  },

  /** Сповіщення необов'язкові — без них система працює, просто мовчить. */
  telegramBotToken: () => optional("TELEGRAM_BOT_TOKEN"),
  telegramChatId: () => optional("TELEGRAM_CHAT_ID"),

  /**
   * Токен monobank-еквайрингу. Дає право виставляти рахунки від імені студії,
   * тож це секрет нарівні з service-role ключем.
   *
   * `required`, а не `optional`: сюди доходять лише тоді, коли майстриня вже
   * натиснула «Виставити рахунок». Мовчазний відкат означав би кнопку, яка
   * начебто спрацювала й нічого не зробила.
   */
  monoToken: () => required("MONO_TOKEN"),

  /** Чи налаштований еквайринг — щоб не показувати кнопку, яка впаде. */
  hasMonoToken: () => Boolean(optional("MONO_TOKEN")),
};
