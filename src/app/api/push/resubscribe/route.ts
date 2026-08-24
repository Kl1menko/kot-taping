import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

/**
 * Перереєстрація підписки, яку браузер перевипустив сам.
 *
 * Браузери ротують ендпойнт без участі людини (закінчився термін ключа,
 * оновився push-сервіс). Сторінка адмінки в цей момент може бути закрита, тож
 * подію `pushsubscriptionchange` ловить service worker — і йому нікуди піти,
 * крім HTTP: Server Action із воркера не викликати, а сесії в ньому немає.
 *
 * Через це маршрут публічний, і замість сесії його боронить володіння старим
 * ендпойнтом: оновити рядок можна лише знаючи той, що вже лежить у базі. Чужий
 * пристрій підписати так не вийде — невідомий `oldEndpoint` нічого не оновлює,
 * і новий рядок не створюється. Саме тому тут `update`, а не `upsert`.
 *
 * `dynamic = "force-dynamic"`: маршрут пише в базу й кешуватись не має.
 */
export const dynamic = "force-dynamic";

type Body = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  oldEndpoint?: string | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  const oldEndpoint = body.oldEndpoint;

  if (!endpoint || !p256dh || !auth || !oldEndpoint) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { data, error } = await db()
    .from("push_subscriptions")
    .update({ endpoint, p256dh, auth })
    .eq("endpoint", oldEndpoint)
    .select("id");

  if (error) {
    console.error("[push] не вдалося перереєструвати підписку:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Старого рядка немає — підписку вже прибрали (вимкнули з адмінки, почистили
  // мертву при розсилці). Створювати новий не можна: це був би шлях підписати
  // будь-який пристрій без сесії. Відповідаємо 204, бо для воркера це не
  // помилка, а «більше не треба».
  if (!data || data.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ ok: true });
}
