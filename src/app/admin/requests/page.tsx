import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { listRequests } from "@/lib/db/requests";
import { RequestsScreen } from "@/components/admin/requests-screen";

export const metadata = { title: "Заявки" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireSession();

  const [requests, services] = await Promise.all([
    listRequests(),
    db().from("services").select("*").order("sort"),
  ]);

  if (services.error) {
    throw new Error(`Не вдалося прочитати прайс: ${services.error.message}`);
  }

  return <RequestsScreen requests={requests} services={services.data ?? []} />;
}
