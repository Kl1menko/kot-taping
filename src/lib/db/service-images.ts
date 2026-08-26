import "server-only";

import sharp from "sharp";
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

/**
 * До якого розміру стискаємо перед сховищем.
 *
 * Картка показує знімок максимум у 640 CSS-пікселів, тож 1200 покриває навіть
 * екран із подвійною щільністю з запасом. Усе вище — мертва вага: `next/image`
 * усе одно зменшить його при першому запиті, але робитиме це з
 * восьмимегапіксельного оригіналу, і кожна нова ширина коштуватиме секунди
 * процесорного часу на сервері.
 *
 * WebP, а не AVIF: кодується в рази швидше (майстриня чекає на відповідь
 * форми), а `next/image` однаково перекодує його в AVIF для тих, хто вміє.
 * Це проміжний формат для сховища, а не той, що поїде відвідувачу.
 *
 * `withoutEnlargement` — щоб маленький знімок не розтягувало до 1200 і не
 * псувало різкість; `rotate()` без аргументів застосовує EXIF-орієнтацію,
 * інакше фото з телефона лягає боком.
 */
const STORED_WIDTH = 1200;
const STORED_QUALITY = 82;

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

  const prepared = await compress(file);
  const path = `${safe}-${Date.now()}.${prepared.ext}`;

  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, prepared.body, {
      contentType: prepared.type,
      upsert: false,
    });

  if (error) {
    return { ok: false, message: `Не вдалося завантажити фото: ${error.message}` };
  }

  return { ok: true, url: publicUrl(path) };
}

/**
 * Зменшити знімок перед сховищем.
 *
 * Майстриня вантажить фото прямо з телефона — 4000×3000 і кілька мегабайт. У
 * сховищі така роздільність нікому не потрібна: картка показує 640 пікселів,
 * а `next/image` усе одно віддає зменшену копію. Але вихідник він тримає як
 * джерело, і кожна нова ширина перекодовується саме з нього.
 *
 * Помилка стиснення не має зривати завантаження: якщо sharp не впорався з
 * форматом, кладемо файл як є — краще важчий знімок, ніж жодного.
 */
async function compress(file: File) {
  const original = {
    body: file,
    type: file.type,
    ext: ALLOWED.get(file.type)!,
  };

  try {
    const input = Buffer.from(await file.arrayBuffer());

    /**
     * `limitInputPixels` — межа на РОЗПАКОВАНЕ зображення.
     *
     * П'ятимегабайтний ліміт вище стосується файлу на дроті, а не картинки в
     * пам'яті: сильно стиснений PNG на 30 000 × 30 000 важить одиниці
     * мегабайт, але розгортається в мільярд пікселів і кілька гігабайтів. Це
     * не виняток, який зловить `catch`, — процес просто вбиває OOM.
     *
     * 50 Мп із запасом покриває будь-яку камеру, з якої знімають для сайту.
     */
    const pipeline = sharp(input, { limitInputPixels: 50_000_000 })
      // Без аргументів — застосовує поворот із EXIF: фото з телефона інакше
      // лягає боком, бо орієнтація живе в метаданих, а не в пікселях.
      .rotate();

    const body = await pipeline
      .clone()
      .resize({ width: STORED_WIDTH, withoutEnlargement: true })
      .webp({ quality: STORED_QUALITY })
      .toBuffer();

    if (body.byteLength < file.size) {
      return { body, type: "image/webp", ext: "webp" };
    }

    /**
     * WebP вийшов не меншим — на вході вже оптимізований знімок, і
     * перекодування лише погіршило б його.
     *
     * Але просто повернути файл недоторканим можна тільки тоді, коли в ньому
     * немає EXIF-повороту: інакше ми віддамо у сховище знімок, що ляже боком.
     * Тому дивимось на `orientation` — і перекодовуємо лише коли поворот
     * справді потрібен. Розмір тут другорядний: криво показане фото гірше за
     * кілька зайвих кілобайтів, а «просто повернути» без перекодування
     * неможливо — орієнтація живе в метаданих, які браузер уже ігнорує.
     */
    const { orientation } = await sharp(input).metadata();
    if (!orientation || orientation === 1) return original;

    const rotated = await pipeline.clone().toBuffer();
    return { body: rotated, type: file.type, ext: original.ext };
  } catch {
    return original;
  }
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
