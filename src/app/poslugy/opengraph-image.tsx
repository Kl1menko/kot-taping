import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Послуги та ціни — Kotova Taping";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({
    title: ["Послуги та ціни"],
    subtitle: "Повний прайс студії",
  });
}
