import {
  Bar,
  SkeletonList,
  SkeletonScreen,
} from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-28" />
      {/* Вкладки категорій прайсу. */}
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Bar key={i} className="h-9 w-28 shrink-0" />
        ))}
      </div>
      <SkeletonList rows={4} />
    </SkeletonScreen>
  );
}
