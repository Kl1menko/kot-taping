import type { MetadataRoute } from "next";

/**
 * Маніфест PWA. `start_url` веде в адмінку, а не на лендінг: застосунок на
 * телефоні ставить собі майстриня, і їй потрібен робочий інструмент, а не
 * вітрина. Незалогінену її перехопить proxy й покаже екран входу.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kotova Taping — записи",
    short_name: "Kotova",
    description:
      "Записи, клієнти, прайс та аналітика студії естетичного тейпування.",
    start_url: "/admin/calendar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ededed",
    theme_color: "#ffffff",
    lang: "uk",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Той самий файл як maskable: знак ужато до ~58% полотна, тож зріз
      // по колу його не зачепить.
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Сьогоднішні записи",
        url: "/admin/calendar",
      },
      {
        name: "Заявки з сайту",
        url: "/admin/requests",
      },
    ],
  };
}
