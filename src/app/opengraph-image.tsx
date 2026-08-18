import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

/** Прев'ю головної. Спільний рендерер — у `src/lib/og.tsx`. */

export const alt =
  "Kotova Taping — студія естетичного та лімфодренажного тейпування";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  // Кегль підібрано так, щоб обидва рядки лягали без автоматичного переносу:
  // на 76px «лімфодренажне» не вміщувалось і рвало композицію на три рядки.
  return ogImage({
    title: ["Естетичне та лімфодренажне", "тейпування обличчя і тіла"],
  });
}
