import "server-only";

import { env } from "@/lib/env";

/**
 * Сповіщення майстру в Telegram.
 *
 * Свідомо не кидає помилок: заявка клієнта важливіша за повідомлення про неї.
 * Якщо Telegram недоступний або токен не заданий — пишемо в лог і йдемо далі,
 * бо заявка вже в базі й не загубиться.
 */

const API = "https://api.telegram.org";

/** Telegram обірве повідомлення на 4096 символах. */
const MAX_LEN = 4000;

export async function sendTelegram(text: string): Promise<boolean> {
  const token = env.telegramBotToken();
  const chatId = env.telegramChatId();

  if (!token || !chatId) {
    console.info("[notify] Telegram не налаштовано — пропускаю сповіщення");
    return false;
  }

  try {
    const response = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, MAX_LEN),
        parse_mode: "HTML",
        // Прев'ю посилань у сповіщенні про заявку тільки заважає.
        link_preview_options: { is_disabled: true },
      }),
      // Не тримаємо відповідь клієнту через повільний Telegram.
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[notify] Telegram відповів ${response.status}: ${body.slice(0, 200)}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[notify] Не вдалося надіслати в Telegram:", error);
    return false;
  }
}

/** HTML-режим Telegram вимагає екранування цих трьох символів. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
