import {
  Bar,
  SkeletonList,
  SkeletonScreen,
} from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-44" />
      {/* Стрічка дат — найпомітніший елемент екрана, тож тримаємо її форму. */}
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <Bar key={i} className="h-16 w-14 shrink-0 rounded-2xl" />
        ))}
      </div>
      <SkeletonList rows={4} />
    </SkeletonScreen>
  );
}
