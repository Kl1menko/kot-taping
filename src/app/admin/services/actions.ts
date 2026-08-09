"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { CATEGORIES } from "@/lib/services";

export type ServiceState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<"title" | "slug" | "price" | "duration" | "category", string>
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

function parse(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    priceFrom: formData.get("priceFrom") === "on",
    wear: String(formData.get("wear") ?? "").trim(),
    badge: String(formData.get("badge") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    tone: String(formData.get("tone") ?? "sand").trim(),
    duration: String(formData.get("duration") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
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

  const row = {
    title: input.title,
    summary: input.summary,
    price,
    price_from: input.priceFrom,
    wear: input.wear || null,
    badge: input.badge || null,
    category: input.category,
    tone,
    duration_min: duration,
    is_active: input.isActive,
  };

  if (input.id) {
    // Slug не чіпаємо при редагуванні: на нього посилаються заявки, і зміна
    // осиротила б їх — назву послуги в них перестало б видно.
    const { error } = await db()
      .from("services")
      .update(row)
      .eq("id", input.id);

    if (error) {
      return { status: "error", message: `Не вдалося зберегти: ${error.message}` };
    }
  } else {
    const slug = slugify(input.title);
    if (!slug) {
      return {
        status: "error",
        message: "З назви не вийшло скласти адресу — додайте латинські літери або цифри.",
      };
    }

    // Останній у своїй категорії, щоб нова послуга не стрибала в середину.
    const { data: last } = await db()
      .from("services")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await db()
      .from("services")
      .insert({ ...row, slug, sort: (last?.sort ?? 0) + 1 });

    if (error) {
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

  revalidatePath("/admin/services");
  revalidatePath("/admin/calendar");
  revalidatePath("/");

  return {
    status: "success",
    message: input.id ? "Послугу оновлено." : "Послугу створено.",
  };
}

/**
 * Ховає або повертає послугу в прайс.
 *
 * Видалення немає навмисно: `appointments.service_id` має `on delete restrict`,
 * бо історія доходу мусить лишатись читабельною. Прибрана з прайсу послуга
 * просто не пропонується — ні на сайті, ні у формі запису.
 */
export async function toggleService(id: string, isActive: boolean) {
  await requireSession();

  const { error } = await db()
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(`Не вдалося змінити стан: ${error.message}`);

  revalidatePath("/admin/services");
  revalidatePath("/admin/calendar");
  revalidatePath("/");
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

  revalidatePath("/admin/services");
  revalidatePath("/");
}
