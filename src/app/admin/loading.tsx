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

      {/* Порядок і розміри повторюють page.tsx: інакше після завантаження
          екран перебудовується й стрибає. */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 sm:flex-col sm:items-start sm:gap-2 sm:px-5 sm:py-4"
            aria-hidden="true"
          >
            <Bar className="h-4 w-20" />
            <Bar className="h-6 w-8" />
          </div>
        ))}
      </div>

      {/* Без обгортки з відступом — SkeletonList уже має власний mt-5. */}
      <SkeletonList rows={3} />
    </SkeletonScreen>
  );
}
