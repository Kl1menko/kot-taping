"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { updateClient, updateClientNotes } from "@/lib/db/clients";
import { isValidPhone } from "@/lib/phone";

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
    return { status: "error", message: "Номер у форматі +380 XX XXX XX XX." };
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
