import "server-only";

import { createHash, createVerify } from "node:crypto";
import { env } from "./env";
import { INVOICE_VALIDITY_SEC, isPaymentStatus, type PaymentStatus } from "./payments";

/**
 * Клієнт monobank-еквайрингу.
 *
 * Документація: https://monobank.ua/api-docs/acquiring
 *
 * `server-only`: тут ходить X-Token, який дає право виставляти рахунки від
 * імені студії. У бандл браузера цей модуль потрапити не має за жодних умов.
 *
 * Помилки кидаємо, а не ковтаємо, — на відміну від `public-services.ts`, де
 * мовчазний відкат правильний. Тут мовчання означало б «рахунок начебто є», і
 * майстриня надіслала б клієнтці порожнечу.
 */

const BASE = "https://api.monobank.ua";

/** Скільки чекаємо на банк. Довше тримати серверний екшен немає сенсу. */
const TIMEOUT_MS = 10_000;

export class MonoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errCode?: string,
  ) {
    super(message);
    this.name = "MonoError";
  }
}

async function call<T>(
  path: string,
  init: RequestInit & { method: "GET" | "POST" },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "X-Token": env.monoToken(),
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Рахунки й статуси не кешуються ніколи: відповідь дійсна рівно на мить.
      cache: "no-store",
    });
  } catch (cause) {
    // Таймаут і обрив мережі: для викликача це одне й те саме — банк не
    // відповів, рахунку немає.
    throw new MonoError(
      cause instanceof Error && cause.name === "TimeoutError"
        ? "Банк не відповів вчасно."
        : "Не вдалося зв'язатися з банком.",
    );
  }

  const text = await res.text();

  if (!res.ok) {
    // monobank віддає {errCode, errText}; на 5xx буває і просто HTML.
    let errCode: string | undefined;
    let errText: string | undefined;
    try {
      const body = JSON.parse(text) as { errCode?: string; errText?: string };
      errCode = body.errCode;
      errText = body.errText;
    } catch {
      // Не JSON — лишаємо як є, нижче піде загальний текст.
    }
    throw new MonoError(
      errText ?? `Банк відповів помилкою ${res.status}.`,
      res.status,
      errCode,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MonoError("Банк повернув відповідь, яку не вдалося прочитати.");
  }
}

// — Створення рахунку —

export type CreateInvoiceInput = {
  /** Копійки. */
  amount: number;
  /** Призначення платежу — його бачить клієнтка в застосунку банку. */
  destination: string;
  /** Наш ідентифікатор для звірки: id запису або замовлення. */
  reference: string;
  /** Куди банк повідомить про зміну статусу. */
  webHookUrl: string;
  /** Куди повернути клієнтку після оплати. */
  redirectUrl?: string;
};

export type CreateInvoiceResult = {
  invoiceId: string;
  pageUrl: string;
};

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const result = await call<CreateInvoiceResult>(
    "/api/merchant/invoice/create",
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        ccy: 980,
        merchantPaymInfo: {
          reference: input.reference,
          destination: input.destination,
        },
        webHookUrl: input.webHookUrl,
        ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
        validity: INVOICE_VALIDITY_SEC,
        paymentType: "debit",
      }),
    },
  );

  if (!result.invoiceId || !result.pageUrl) {
    throw new MonoError("Банк не повернув посилання на оплату.");
  }
  return result;
}

// — Статус рахунку —

export type InvoiceStatus = {
  invoiceId: string;
  status: PaymentStatus;
  amount: number;
  ccy: number;
  finalAmount?: number;
  reference?: string;
  failureReason?: string;
  errCode?: string;
  modifiedDate?: string;
};

export async function getInvoiceStatus(
  invoiceId: string,
): Promise<InvoiceStatus> {
  const raw = await call<Record<string, unknown>>(
    `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
    { method: "GET" },
  );
  return parseInvoiceState(raw);
}

/**
 * Спільний розбір для статусу й вебхука: у них однакова форма тіла.
 *
 * Невідомий статус не приймаємо: банк може додати новий, і тихо записати його
 * в базу означало б зламати `check` у міграції вже після коміту транзакції.
 */
export function parseInvoiceState(raw: Record<string, unknown>): InvoiceStatus {
  const invoiceId = String(raw.invoiceId ?? "");
  const status = String(raw.status ?? "");

  if (!invoiceId) throw new MonoError("У відповіді банку немає invoiceId.");
  if (!isPaymentStatus(status)) {
    throw new MonoError(`Невідомий статус рахунку: ${status}`);
  }

  return {
    invoiceId,
    status,
    amount: Number(raw.amount ?? 0),
    ccy: Number(raw.ccy ?? 980),
    ...(raw.finalAmount != null ? { finalAmount: Number(raw.finalAmount) } : {}),
    ...(raw.reference ? { reference: String(raw.reference) } : {}),
    ...(raw.failureReason ? { failureReason: String(raw.failureReason) } : {}),
    ...(raw.errCode ? { errCode: String(raw.errCode) } : {}),
    ...(raw.modifiedDate ? { modifiedDate: String(raw.modifiedDate) } : {}),
  };
}

// — Перевірка підпису вебхука —

/**
 * Публічний ключ банку.
 *
 * Кешуємо в пам'яті процесу: ключ змінюється дуже рідко, а ходити по нього на
 * кожен вебхук означало б залежність від мережі там, де вона не потрібна.
 * При невдалій перевірці кеш скидається — саме так виглядає ротація ключа.
 */
let pubKeyCache: { key: string; at: number } | null = null;
const PUBKEY_TTL_MS = 60 * 60 * 1000;

async function fetchPubKey(): Promise<string> {
  const { key } = await call<{ key: string }>("/api/merchant/pubkey", {
    method: "GET",
  });
  if (!key) throw new MonoError("Банк не повернув публічний ключ.");
  return key;
}

async function pubKey(force = false): Promise<string> {
  const fresh = pubKeyCache && Date.now() - pubKeyCache.at < PUBKEY_TTL_MS;
  if (!force && fresh) return pubKeyCache!.key;

  const key = await fetchPubKey();
  pubKeyCache = { key, at: Date.now() };
  return key;
}

/**
 * Перевірка підпису вебхука.
 *
 * Це єдине, що відрізняє повідомлення банку від будь-кого, хто знає адресу
 * нашого вебхука: без перевірки сторонній POST міг би позначити рахунок
 * оплаченим. Тому підпис перевіряється завжди, а не «якщо ключ є».
 *
 * Схема з документації monobank: X-Sign — base64 від ECDSA-підпису (ASN.1
 * DER) над **сирим тілом запиту**. Саме сирим: `JSON.parse` + `stringify`
 * змінює пробіли й порядок ключів, і підпис перестане сходитись.
 *
 * `key` від банку — base64 від PEM, тож розкодовуємо перед перевіркою.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureBase64: string,
): Promise<boolean> {
  if (!signatureBase64) return false;

  const check = async (force: boolean) => {
    const keyBase64 = await pubKey(force);
    const pem = Buffer.from(keyBase64, "base64").toString("utf8");

    const verifier = createVerify("SHA256");
    verifier.update(rawBody);
    verifier.end();

    try {
      return verifier.verify(pem, Buffer.from(signatureBase64, "base64"));
    } catch {
      // Пошкоджений ключ або підпис — не привід падати, це просто «не сходиться».
      return false;
    }
  };

  if (await check(false)) return true;

  // Не зійшлось — можливо, банк змінив ключ, а в нас у кеші старий.
  // Один повтор зі свіжим ключем; якщо й тепер ні — підпис справді чужий.
  return check(true);
}

/**
 * Відбиток тіла — для журналу.
 *
 * У логи не має потрапляти саме тіло вебхука (там суми й id рахунків), але
 * відрізнити повторний вебхук від нового корисно.
 */
export function bodyDigest(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex").slice(0, 12);
}
