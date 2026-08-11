"use server";

import { requireSession } from "@/lib/auth/session";
import { listClientsWithStats, type ClientWithStats } from "@/lib/db/clients";

/**
 * Пошук клієнтів у базі — коли завантаженого списку не досить.
 *
 * Екран фільтрує вже отримані рядки миттєво, і для студії на кілька сотень
 * клієнток цього вистачає. Але список обрізаний лімітом, тож коли база
 * переросте сторінку, локальний фільтр перестав би знаходити «хвіст» — саме
 * так 101-ша клієнтка колись зникала з пошуку.
 *
 * Тому за межею сторінки екран перепитує сервер. Пошук іде в SQL по імені й
 * телефону; нотатки лишаються поза ним свідомо — це діагнози й домовленості,
 * їх не варто гнати в `ilike` по всій базі.
 */
export async function searchClientsAction(
  query: string,
): Promise<ClientWithStats[]> {
  await requireSession();

  const trimmed = query.trim();
  // Порожній запит — це «покажи все», на що вже є сторінка з page.tsx.
  if (trimmed.length < 2) return [];

  const { clients } = await listClientsWithStats(trimmed);
  return clients;
}
