import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ServicesScreen } from "@/components/admin/services-screen";

export const metadata = { title: "Прайс" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireSession();

  const { data, error } = await db()
    .from("services")
    .select("*")
    .order("sort");

  if (error) {
    throw new Error(`Не вдалося прочитати прайс: ${error.message}`);
  }

  return <ServicesScreen services={data ?? []} />;
}
