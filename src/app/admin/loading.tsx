import {
  Bar,
  SkeletonList,
  SkeletonScreen,
} from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <div className="flex items-baseline justify-between gap-3">
        <Bar className="h-8 w-36" />
        <Bar className="h-5 w-28" />
      </div>

      <SkeletonList rows={3} />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-tile)] bg-surface p-6"
            aria-hidden="true"
          >
            <Bar className="h-4 w-24" />
            <Bar className="mt-4 h-9 w-16" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
