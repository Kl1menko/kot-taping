import {
  Bar,
  SkeletonList,
  SkeletonScreen,
} from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-32" />
      {/* Фільтри за статусом замовлення. */}
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Bar key={i} className="h-9 w-24" />
        ))}
      </div>
      <SkeletonList rows={3} />
    </SkeletonScreen>
  );
}
