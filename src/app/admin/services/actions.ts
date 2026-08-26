"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { CATEGORIES } from "@/lib/services";
import { LOCATIONS } from "@/lib/contacts";
import {
  deleteServiceImage,
  uploadServiceImage,
} from "@/lib/db/service-images";

export type ServiceState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<"title" | "slug" | "price" | "duration" | "category" | "image", string>
  >;
};

const TONES = ["sand", "clay", "blush"] as const;
const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as string[];

/** `Лімфодренаж щік` → `limfodrenazh-shchik`. */
function slugify(value: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
    ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "iu", я: "ia", "'": "", "’": "",
  };

  return value
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Скинути кеш усього, де видно прайс.
 *
 * Публічні сторінки статичні (`generateStaticParams` + `revalidate = 3600`),
 * тож без явного скидання правка з адмінки з'явилась би на них аж через
 * годину — а майстриня щойно змінила ціну й одразу йде дивитись на сайт.
 *
 * Сторінок небагато й перелік їх скінченний, тож проходимо всі, де прайс
 * справді видно: лендінг, вітрина категорій, кожна категорія і кожне місто
 * (сторінки міст теж читають `listPublicServices`).
 *
 * Категорію приймаємо лише щоб не смикати шість шляхів там, де змінилась
 * одна: на видаленні й приховуванні простіше пройти всі, ніж вгадувати, з
 * якої категорії послуга поїхала.
 */
function revalidateService(category?: string) {
  revalidatePath("/admin/services");
  revalidatePath("/admin/calendar");
  revalidatePath("/");
  revalidatePath("/poslugy");

  const categories = category ? [category] : CATEGORY_IDS;
  for (const id of categories) {
    revalidatePath(`/poslugy/${id}`);
  }

  for (const place of LOCATIONS) {
    revalidatePath(`/mistsya/${place.slug}`);
  }
}

function parse(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    // Англійська версія. Порожньо — на /en показується український текст,
    // тож незаповнене поле нічого не ламає (див. `public-services.ts`).
    titleEn: String(formData.get("titleEn") ?? "").trim(),
    summaryEn: String(formData.get("summaryEn") ?? "").trim(),
    wearEn: String(formData.get("wearEn") ?? "").trim(),
    badgeEn: String(formData.get("badgeEn") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    priceFrom: formData.get("priceFrom") === "on",
    wear: String(formData.get("wear") ?? "").trim(),
    badge: String(formData.get("badge") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    tone: String(formData.get("tone") ?? "sand").trim(),
    duration: String(formData.get("duration") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
    // Файл кладе саме поле `image`; порожній інпут дає File нульового розміру,
    // а не null, тож «нічого не вибрано» перевіряється по розміру.
    image: formData.get("image"),
    removeImage: formData.get("removeImage") === "on",
  };
}

export async function saveService(
  _prev: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  await requireSession();

  const input = parse(formData);
  const fieldErrors: ServiceState["fieldErrors"] = {};

  if (input.title.length < 2) {
    fieldErrors.title = "Вкажіть назву послуги.";
  }
  if (!CATEGORY_IDS.includes(input.category)) {
    fieldErrors.category = "Оберіть категорію.";
  }

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    fieldErrors.price = "Ціна — невід'ємне число.";
  }

  const duration = Number(input.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    fieldErrors.duration = "Тривалість — додатне число хвилин.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Перевірте виділені поля.", fieldErrors };
  }

  // Предикат, а не голий includes: інакше tone лишається `string` і не
  // сходиться з літеральним типом колонки.
  const isTone = (value: string): value is (typeof TONES)[number] =>
    (TONES as readonly string[]).includes(value);

  const tone = isTone(input.tone) ? input.tone : "sand";

  /**
   * `wear_en`/`badge_en` (міграція 0017) додаються окремо.
   *
   * Поки міграцію не виконано, Postgres відхиляє весь запис через невідому
   * колонку — і збереження послуги в адмінці падало б цілком, хоч решта
   * полів валідна. Тому спершу пробуємо з ними, а на `42703` повторюємо без:
   * англійські підписи просто не запишуться, доки колонки не з'являться.
   */
  const labelsEn = {
    wear_en: input.wearEn || null,
    badge_en: input.badgeEn || null,
  };

  const row = {
    title: input.title,
    summary: input.summary,
    title_en: input.titleEn || null,
    summary_en: input.summaryEn || null,
    price,
    price_from: input.priceFrom,
    wear: input.wear || null,
    badge: input.badge || null,
    category: input.category,
    tone,
    duration_min: duration,
    is_active: input.isActive,
  };

  const picked =
    input.image instanceof File && input.image.size > 0 ? input.image : null;

  if (input.id) {
    // Slug не чіпаємо при редагуванні: на нього посилаються заявки, і зміна
    // осиротила б їх — назву послуги в них перестало б видно.
    const { data: current, error: readError } = await db()
      .from("services")
      .select("slug, image_url")
      .eq("id", input.id)
      .maybeSingle();

    if (readError || !current) {
      return {
        status: "error",
        message: readError
          ? `Не вдалося прочитати послугу: ${readError.message}`
          : "Послугу не знайдено — можливо, її щойно видалили.",
      };
    }

    // Фото рахуємо ДО запису рядка: якщо завантаження зірветься, майстриня
    // побачить помилку з незміненою послугою, а не «зберіг усе, крім фото».
    let imageUrl = current.image_url;

    if (picked) {
      const uploaded = await uploadServiceImage(current.slug, picked);
      if (!uploaded.ok) {
        return {
          status: "error",
          message: uploaded.message,
          fieldErrors: { image: uploaded.message },
        };
      }
      imageUrl = uploaded.url;
    } else if (input.removeImage) {
      imageUrl = null;
    }

    const write = (extra: Record<string, unknown>) =>
      db()
        .from("services")
        .update({ ...row, ...extra, image_url: imageUrl })
        .eq("id", input.id);

    let { error } = await write(labelsEn);
    if (error?.code === "42703") ({ error } = await write({}));

    if (error) {
      // Рядок не змінився — щойно завантажений файл нікому не потрібен.
      if (picked && imageUrl) await deleteServiceImage(imageUrl);
      return { status: "error", message: `Не вдалося зберегти: ${error.message}` };
    }

    // Старий знімок прибираємо лише після успішного запису: доти на нього
    // ще посилається рядок у базі, і видалення дало б порожню картку.
    if (current.image_url && current.image_url !== imageUrl) {
      await deleteServiceImage(current.image_url);
    }
  } else {
    const slug = slugify(input.title);
    if (!slug) {
      return {
        status: "error",
        message: "З назви не вийшло скласти адресу — додайте латинські літери або цифри.",
      };
    }

    let imageUrl: string | null = null;
    if (picked) {
      const uploaded = await uploadServiceImage(slug, picked);
      if (!uploaded.ok) {
        return {
          status: "error",
          message: uploaded.message,
          fieldErrors: { image: uploaded.message },
        };
      }
      imageUrl = uploaded.url;
    }

    // Останній у своїй категорії, щоб нова послуга не стрибала в середину.
    const { data: last } = await db()
      .from("services")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();

    const write = (extra: Record<string, unknown>) =>
      db()
        .from("services")
        .insert({
          ...row,
          ...extra,
          slug,
          image_url: imageUrl,
          sort: (last?.sort ?? 0) + 1,
        });

    let { error } = await write(labelsEn);
    if (error?.code === "42703") ({ error } = await write({}));

    if (error) {
      // Послуги не з'явилось — фото від неї теж лишати немає сенсу.
      await deleteServiceImage(imageUrl);

      if (error.code === "23505") {
        return {
          status: "error",
          message: "Послуга з такою назвою вже є — змініть назву.",
          fieldErrors: { title: "Ця назва вже зайнята." },
        };
      }
      return { status: "error", message: `Не вдалося створити: ${error.message}` };
    }
  }

  revalidateService(input.category);

  return {
    status: "success",
    message: input.id ? "Послугу оновлено." : "Послугу створено.",
  };
}

/**
 * Ховає або повертає послугу в прайс.
 *
 * Основний спосіб прибрати послугу — саме цей, а не `deleteService`: за
 * послугою з візитами стоїть історія доходу, і база її видалити не дасть
 * (`appointments.service_id` має `on delete restrict`). Прибрана з прайсу
 * послуга просто не пропонується — ні на сайті, ні у формі запису.
 */
export async function toggleService(id: string, isActive: boolean) {
  await requireSession();

  const { error } = await db()
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(`Не вдалося змінити стан: ${error.message}`);

  revalidateService();
}

/** Порядок у списку — стрілками вгору/вниз у межах категорії. */
export async function moveService(id: string, direction: "up" | "down") {
  await requireSession();

  const { data: all, error } = await db()
    .from("services")
    .select("id, sort, category")
    .order("sort");

  if (error) throw new Error(`Не вдалося прочитати прайс: ${error.message}`);

  const current = all?.find((s) => s.id === id);
  if (!current) return;

  const siblings = (all ?? []).filter((s) => s.category === current.category);
  const index = siblings.findIndex((s) => s.id === id);
  const target = siblings[direction === "up" ? index - 1 : index + 1];
  if (!target) return;

  // Обмін значеннями sort — двома запитами, бо PostgREST не має transaction API.
  await db().from("services").update({ sort: target.sort }).eq("id", current.id);
  await db().from("services").update({ sort: current.sort }).eq("id", target.id);

  revalidateService(current.category);
}

/**
 * Видалити послугу з прайсу назавжди.
 *
 * Тільки ту, за якою немає жодного візиту й жодної заявки. Візити — це
 * проведена робота й отримані гроші: `appointments.service_id` має
 * `on delete restrict`, і база такий рядок не віддасть. Ми перевіряємо це
 * заздалегідь самі, щоб сказати людською мовою, чому не можна, і підказати
 * дію, яка справді потрібна, — прибрати з прайсу.
 *
 * Заявки видаленню не заважають: вони тримають slug, а не FK, — саме щоб
 * пережити зникнення послуги (див. коментар у міграції 0001). Назву в них
 * видно й далі, бо вона в самій заявці, а не підтягується з прайсу.
 *
 * Повертає результат, а не кидає: «є візити» — не збій, а нормальна
 * відповідь, і показати її треба в самій картці, поруч із кнопкою.
 */
export async function deleteService(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (!id.trim()) return { ok: false, message: "Послугу не вказано." };

  const { data: service, error: readError } = await db()
    .from("services")
    .select("category, image_url")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: `Не вдалося прочитати послугу: ${readError.message}` };
  }
  // Уже немає — вважаємо, що робота зроблена: могли натиснути двічі.
  if (!service) return { ok: true };

  // `head: true` — потрібна лише кількість, самі рядки не читаємо.
  const { count, error: countError } = await db()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("service_id", id);

  if (countError) {
    return {
      ok: false,
      message: `Не вдалося перевірити візити: ${countError.message}`,
    };
  }

  const visits = count ?? 0;
  if (visits > 0) {
    return {
      ok: false,
      message:
        `За послугою вже є візити (${visits}) — видалити не можна, ` +
        "інакше зникла б історія доходу. Приберіть її з прайсу.",
    };
  }

  const { error } = await db().from("services").delete().eq("id", id);

  if (error) {
    return { ok: false, message: `Не вдалося видалити: ${error.message}` };
  }

  // Файл — після рядка: доки послуга є, її фото має бути на місці.
  await deleteServiceImage(service.image_url);

  revalidateService(service.category);

  return { ok: true };
}
