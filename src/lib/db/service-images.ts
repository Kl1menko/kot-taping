import "server-only";

import { db } from "./client";
import { env } from "@/lib/env";

/**
 * Фото послуг у Supabase Storage — bucket `service-images` (міграція 0015).
 *
 * Знімки лежать не в репозиторії, бо міняються разом із прайсом, а прайс
 * майстриня править частіше, ніж виходить реліз. Bucket публічний: те саме
 * фото раніше лежало у /public і секретом не було, а публічна адреса дає
 * `next/image` кешувати результат без підписаних URL, що протухають.
 */

const BUCKET = "service-images";

/** Що приймаємо. Той самий список стоїть і на bucket — див. міграцію 0015. */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

/**
 * 5 МБ. Сучасний телефон легко віддає 8-мегапіксельний JPEG, тож межа потрібна;
 * але вона ж має вміщати нестиснений знімок «як є» — майстриня не мусить
 * проганяти фото через конвертер, перш ніж завантажити.
 */
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/** `https://xyz.supabase.co/storage/v1/object/public/service-images/<path>` */
function publicUrl(path: string): string {
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Шлях об'єкта всередині bucket — або null, якщо адреса веде кудись інде.
 *
 * Потрібно на видаленні: `image_url` у базі — повний URL, а Storage працює
 * ключами. Заразом це й перевірка походження: старий рядок може містити шлях
 * у /public або взагалі чуже посилання, і видаляти за ним ми нічого не будемо.
 */
function pathFromUrl(url: string): string | null {
  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== new URL(env.supabaseUrl()).hostname) return null;
    if (!parsed.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(parsed.pathname.slice(prefix.length)) || null;
  } catch {
    // Відносний шлях (`/images/services/...`) — не наш об'єкт, і це нормально.
    return null;
  }
}

/**
 * Завантажити фото послуги.
 *
 * Ім'я файлу — `<slug>-<час>.<ext>`, а не просто `<slug>`: CDN тримає публічні
 * об'єкти в кеші, і перезапис по тому самому ключу ще довго віддавав би старий
 * знімок. Нове ім'я = нова адреса = фото змінюється в ту ж мить.
 */
export async function uploadServiceImage(
  slug: string,
  file: File,
): Promise<UploadResult> {
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return {
      ok: false,
      message: "Формат не підходить — потрібен JPG, PNG, WebP або AVIF.",
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `Файл завеликий (${(file.size / 1024 / 1024).toFixed(1)} МБ) — максимум 5 МБ.`,
    };
  }

  // Slug уже нормалізований до латиниці (див. `slugify` в actions), але
  // підстраховуємось: ключ об'єкта не має містити нічого, крім безпечних
  // символів, інакше адреса поїде в екранування.
  const safe = slug.replace(/[^a-z0-9-]/g, "").slice(0, 60) || "service";
  const path = `${safe}-${Date.now()}.${ext}`;

  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { ok: false, message: `Не вдалося завантажити фото: ${error.message}` };
  }

  return { ok: true, url: publicUrl(path) };
}

/**
 * Прибрати файл, на який більше ніхто не посилається.
 *
 * Мовчазна: осиротілий об'єкт у сховищі — це кілька сотень кілобайт, а
 * зірване через нього збереження послуги коштувало б майстрині роботи.
 * Тому помилку сюди не піднімаємо, а адресу, що веде не в наш bucket
 * (старий шлях у /public), просто пропускаємо.
 */
export async function deleteServiceImage(url: string | null): Promise<void> {
  if (!url) return;

  const path = pathFromUrl(url);
  if (!path) return;

  await db().storage.from(BUCKET).remove([path]);
}
