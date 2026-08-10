import { ImageResponse } from "next/og";
import { LOCATIONS } from "@/lib/contacts";

/**
 * Прев'ю для месенджерів і соцмереж.
 *
 * Генерується кодом, а не експортується з дизайну: текст тут — назви кабінетів
 * із `contacts.ts`, тож картинка не розійдеться з сайтом, коли зміниться адреса.
 *
 * Шрифт свідомо не задано: `ImageResponse` має вбудований Geist, у якому є і
 * кирилиця, і ₴. Підключати сюди Manrope означало б тягнути Google Fonts мережею
 * під час збірки — зайва точка відмови заради ледь помітної різниці в накресленні.
 */

export const alt =
  "Kotova Taping — студія естетичного та лімфодренажного тейпування";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // --color-sand: тепла подушка з лендінгу, а не голий білий.
          backgroundColor: "#f2e6dc",
          color: "#111111",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6 }}>
          KOTOVA TAPING
        </div>

        {/* Кегль підібрано так, щоб обидва рядки лягали без автоматичного
            переносу: на 76px «лімфодренажне» не вміщувалось і рвало композицію
            на три рядки. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15 }}>
            Естетичне та лімфодренажне
          </div>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15 }}>
            тейпування обличчя і тіла
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 28,
            color: "#646464",
          }}
        >
          <div style={{ display: "flex" }}>
            {LOCATIONS.map((l) => l.city).join(" · ")}
          </div>
          <div style={{ display: "flex" }}>Видимий результат після сеансу</div>
        </div>
      </div>
    ),
    size,
  );
}
