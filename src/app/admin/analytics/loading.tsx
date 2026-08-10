import { Bar, SkeletonScreen } from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-40" />

      {/* Перемикач періоду. */}
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Bar key={i} className="h-9 w-24" />
        ))}
      </div>

      {/* Плитки з підсумками. */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-tile)] bg-surface p-6"
            aria-hidden="true"
          >
            <Bar className="h-4 w-24" />
            <Bar className="mt-4 h-9 w-28" />
          </div>
        ))}
      </div>

      {/* Графік доходу. */}
      <div
        className="mt-4 rounded-[var(--radius-tile)] bg-surface p-6"
        aria-hidden="true"
      >
        <Bar className="h-4 w-32" />
        <Bar className="mt-5 h-40 w-full rounded-2xl" />
      </div>
    </SkeletonScreen>
  );
}
