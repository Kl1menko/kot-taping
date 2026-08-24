"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  createClient,
  deleteClient,
  findClientByPhone,
  updateClient,
  updateClientNotes,
} from "@/lib/db/clients";
import { formatPhone, isValidPhone } from "@/lib/phone";

export type ClientState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function saveClientNotes(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  await requireSession();

  const id = String(formData.get("id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");

  if (!id) return { status: "error", message: "Клієнта не вказано." };

  try {
    await updateClientNotes(id, notes);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не вдалося зберегти.",
    };
  }

  revalidatePath("/admin/clients");
  return { status: "success", message: "Нотатки збережено." };
}

export async function saveClient(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  await requireSession();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (name.length < 2) {
    return { status: "error", message: "Вкажіть ім'я — щонайменше 2 символи." };
  }
  if (!isValidPhone(phone)) {
    return { status: "error", message: "Номер телефону — 0XX XXX XX XX або +380 XX XXX XX XX." };
  }

  try {
    await updateClient(id, { name, phone, email });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не вдалося зберегти.",
    };
  }

  revalidatePath("/admin/clients");
  revalidatePath("/admin/calendar");
  return { status: "success", message: "Клієнта оновлено." };
}

/**
 * Створення клієнтки вручну — до першого запису.
 *
 * Зазвичай клієнтки з'являються самі: із заявки з сайту або при створенні
 * запису (`upsertClient`). Але картка потрібна й раніше — записати номер із
 * дзвінка, завести нотатку про протипокази перед візитом.
 *
 * Телефон — природний ключ (unique у міграції 0001), тож повторний номер тут
 * не помилка бази, а звичайна ситуація: майстриня не пам'ятає, чи заводила цю
 * людину. Кажемо про це людською мовою і називаємо ім'я, під яким вона вже є.
 */
export async function createClientAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (name.length < 2) {
    return { status: "error", message: "Вкажіть ім'я — щонайменше 2 символи." };
  }
  if (!isValidPhone(phone)) {
    return { status: "error", message: "Номер телефону — 0XX XXX XX XX або +380 XX XXX XX XX." };
  }

  // Перевіряємо до вставки, щоб дати зрозуміле повідомлення замість
  // «duplicate key value violates unique constraint».
  const existing = await findClientByPhone(phone);
  if (existing) {
    return {
      status: "error",
      message:
        `Номер ${formatPhone(phone)} уже записаний за «${existing.name}». ` +
        "Знайдіть цю картку пошуком, щоб не заводити другу.",
    };
  }

  try {
    await createClient({ name, phone, email, notes });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не вдалося зберегти.",
    };
  }

  revalidatePath("/admin/clients");
  return { status: "success", message: "Клієнтку додано." };
}

/**
 * Видалити картку клієнта.
 *
 * Видаляються лише картки без жодного візиту — дублікати й помилково заведені.
 * Клієнта з історією база не віддасть (`on delete restrict` у 0001), і це
 * правильно: візити це проведена робота й отримані гроші.
 *
 * Повертає результат, а не кидає: відмова «у клієнта є візити» — це не збій,
 * а нормальна відповідь, і показати її треба в самій картці, поруч із
 * кнопкою, а не екраном помилки.
 */
export async function deleteClientAction(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (!id.trim()) return { ok: false, message: "Клієнта не вказано." };

  const result = await deleteClient(id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/admin/clients");
  // Картка могла бути відкрита зі списку записів — там її теж уже немає.
  revalidatePath("/admin/calendar");

  return { ok: true };
}
