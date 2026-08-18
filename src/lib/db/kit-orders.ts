import type { KitOrderRow } from "./types";

export type KitOrderWithKit = KitOrderRow & {
  /** Назва набору на момент показу; null, якщо набір прибрали з каталогу. */
  kitTitle: string | null;
};
