import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LOCATIONS } from "./contacts";

/**
 * Прев'ю для месенджерів і соцмереж — спільний рендерер.
 *
 * Генерується кодом, а не експортується з дизайну: текст тут — назви кабінетів
 * із `contacts.ts`, тож картинка не розійдеться з сайтом, коли зміниться адреса.
 *
 * Кожен маршрут має власний `opengraph-image.tsx`, який кличе цю функцію зі
 * своїм заголовком. Інакше сторінки категорій успадкували б картинку головної:
 * `opengraph-image` у Next не спускається вниз по дереву маршрутів, і посилання
 * на «Лімфодренаж обличчя» в Telegram виглядало б як посилання на головну.
 *
 * Шрифт свідомо не задано: `ImageResponse` має вбудований Geist, у якому є і
 * кирилиця, і ₴. Підключати сюди Manrope означало б тягнути Google Fonts мережею
 * під час збірки — зайва точка відмови заради ледь помітної різниці в накресленні.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Тло читаємо з диска й вбудовуємо як data-URI.
 *
 * `ImageResponse` рендериться на сервері під час збірки, коли сайт ще не
 * піднято: відносний шлях на `/images/...` йому нікуди вести, а абсолютний
 * вимагав би знати домен. Файл маленький і градієнтний, тож base64 у розмітці
 * дешевший за зайву мережеву залежність.
 */
async function background(): Promise<string> {
  const file = await readFile(
    join(process.cwd(), "public", "images", "og-bg.jpg"),
  );
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}

/**
 * Кегль під довжину заголовка.
 *
 * Satori не переносить текст так, як браузер, і довгий рядок на 64px вилазить
 * за полотно. Три сходинки замість формули: різниця між 64 і 56 помітна оком,
 * а проміжні значення — ні.
 */
function fontSize(text: string): number {
  if (text.length > 52) return 44;
  if (text.length > 34) return 54;
  return 64;
}

export async function ogImage({
  title,
  subtitle = "Видимий результат після сеансу",
}: {
  /** Заголовок картинки. Рядки розділяються переносом уручну. */
  title: string[];
  subtitle?: string;
}) {
  const bg = await background();
  const size = fontSize(title.join(" "));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Градієнт замість рівного тону: та сама холодна блакить, що й на
          // обкладинках студії. Колір нижче — запасний, якщо картинка не лягла.
          backgroundColor: "#dce9f7",
          backgroundImage: `url(${bg})`,
          backgroundSize: "1200px 630px",
          color: "#111111",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6 }}>
          KOTOVA TAPING
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {title.map((line) => (
            <div key={line} style={{ display: "flex", fontSize: size, lineHeight: 1.15 }}>
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 28,
            color: "#4a5568",
          }}
        >
          <div style={{ display: "flex" }}>
            {LOCATIONS.map((l) => l.city).join(" · ")}
          </div>
          <div style={{ display: "flex" }}>{subtitle}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
