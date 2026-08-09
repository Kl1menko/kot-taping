import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * У Next.js 16 middleware називається Proxy — файл має лежати поруч із `app`.
 *
 * Перевірка тут оптимістична: вона лише прибирає зайвий рендер і редиректить
 * гостя на логін. Справжня авторизація — `requireSession()` у кожній сторінці
 * та Server Action, бо Proxy не бачить прямих викликів екшенів і не має
 * ходити в базу (виконується на кожен запит, включно з префетчами).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);

  if (pathname === "/admin/login") {
    // Уже залогінений — на логіні йому робити нічого.
    if (session) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", req.nextUrl);
    // Щоб після входу повернути туди, куди людина йшла.
    if (pathname !== "/admin") login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
