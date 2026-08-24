import { Bar, SkeletonScreen } from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-28" />
      <Bar className="mt-3 h-4 w-72" />

      {/* Перемикач кабінетів. */}
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 2 }, (_, i) => (
          <Bar key={i} className="h-11 w-28 shrink-0" />
        ))}
      </div>

      {/* Сітка місяця 6×7 — саме вона займає екран, тож без неї перехід
          виглядав би як стрибок порожньої сторінки. */}
      <div className="mt-5 rounded-[var(--radius-tile)] bg-surface p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Bar className="size-11" />
          <Bar className="h-5 w-36" />
          <Bar className="size-11" />
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: 49 }, (_, i) => (
            <Bar key={i} className={i < 7 ? "h-6 rounded-lg" : "aspect-square rounded-xl"} />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
