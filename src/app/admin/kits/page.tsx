import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import type { KitOrderWithKit } from "@/lib/db/kit-orders";
import { KitOrdersScreen } from "@/components/admin/kit-orders-screen";

export const metadata = { title: "Набори" };
export const dynamic = "force-dynamic";

export default async function KitsPage() {
  await requireSession();

  // Каталог і замовлення одночасно: назви наборів потрібні обом — спискові
  // замовлень і редактору цін, — тож зіставляємо їх на місці, як і в заявках.
  const [kits, rawOrders] = await Promise.all([
    db().from("kits").select("*").order("sort"),
    db()
      .from("kit_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (kits.error) {
    throw new Error(`Не вдалося прочитати набори: ${kits.error.message}`);
  }
  if (rawOrders.error) {
    throw new Error(`Не вдалося прочитати замовлення: ${rawOrders.error.message}`);
  }

  const rows = kits.data ?? [];
  const titles = new Map(rows.map((k) => [k.slug, k.title]));

  const orders: KitOrderWithKit[] = (rawOrders.data ?? []).map((row) => ({
    ...row,
    kitTitle: titles.get(row.kit_slug) ?? null,
  }));

  return <KitOrdersScreen orders={orders} kits={rows} />;
}
