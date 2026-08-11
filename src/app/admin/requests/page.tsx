import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import type { RequestWithService } from "@/lib/db/requests";
import { RequestsScreen } from "@/components/admin/requests-screen";

export const metadata = { title: "Заявки" };
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireSession();

  // Два запити одночасно, замість трьох із яких два послідовні.
  //
  // Прайс тут потрібен двічі: формі перетворення заявки й назвам послуг у
  // списку. `listRequests()` вміє дотягувати назви сама, але робить це другим
  // запитом — уже після відповіді про заявки, тобто послідовно. Оскільки прайс
  // ми й так читаємо, дешевше зіставити назви на місці: `service_slug` навмисно
  // не FK (заявка має пережити зміни прайсу), тож джойну для PostgREST тут
  // немає, а мапа за slug дає той самий результат без походу в мережу.
  const [services, rawRequests] = await Promise.all([
    db().from("services").select("*").order("sort"),
    db()
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (services.error) {
    throw new Error(`Не вдалося прочитати прайс: ${services.error.message}`);
  }
  if (rawRequests.error) {
    throw new Error(`Не вдалося прочитати заявки: ${rawRequests.error.message}`);
  }

  const rows = services.data ?? [];
  const titles = new Map(rows.map((s) => [s.slug, s.title]));

  const requests: RequestWithService[] = (rawRequests.data ?? []).map(
    (row) => ({
      ...row,
      serviceTitle: titles.get(row.service_slug) ?? null,
    }),
  );

  return <RequestsScreen requests={requests} services={rows} />;
}
