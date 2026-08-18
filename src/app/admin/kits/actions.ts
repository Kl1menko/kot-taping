"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { isKitOrderStatus, type KitOrderStatus } from "@/lib/kits";

/**
 * Крок замовлення вперед по маршруту: зв'язалися → оплачено → відправлено.
 *
 * Накладна приходить разом зі статусом `shipped` — саме тоді вона й з'являється
 * в реальності, тож окремої дії на неї немає.
 */
export async function setKitOrderStatus(
  id: string,
  status: KitOrderStatus,
  tracking?: string,
) {
  await requireSession();

  if (!isKitOrderStatus(status)) {
    throw new Error("Невідомий статус замовлення.");
  }

  const patch: { status: KitOrderStatus; tracking?: string | null } = { status };
  // Порожній рядок із форми — це «не вказано», а не порожня накладна.
  if (tracking !== undefined) patch.tracking = tracking.trim() || null;

  const { error } = await db().from("kit_orders").update(patch).eq("id", id);
  if (error) throw new Error(`Не вдалося оновити замовлення: ${error.message}`);

  revalidatePath("/admin/kits");
  revalidatePath("/admin");
}

/** Ціна набору — єдине, що майстриня редагує в каталозі з адмінки. */
export async function setKitPrice(slug: string, price: number) {
  await requireSession();

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Ціна не може бути від'ємною.");
  }

  const { error } = await db()
    .from("kits")
    .update({ price: Math.round(price) })
    .eq("slug", slug);

  if (error) throw new Error(`Не вдалося змінити ціну: ${error.message}`);

  revalidatePath("/admin/kits");
  // Ціни видно на лендінгу — скидаємо його кеш одразу, як це робить прайс.
  revalidatePath("/");
}
