import { requireSession } from "@/lib/auth/session";
import { listClientsWithStats } from "@/lib/db/clients";
import { ClientsScreen } from "@/components/admin/clients-screen";

export const metadata = { title: "Клієнти" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requireSession();

  // Тільки список зі зведеною статистикою. Історія візитів вантажиться
  // окремо, коли відкривають конкретну картку — див. ./history.ts.
  const { clients, hasMore } = await listClientsWithStats();

  return <ClientsScreen clients={clients} hasMore={hasMore} />;
}
