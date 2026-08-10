import {
  Bar,
  SkeletonList,
  SkeletonScreen,
} from "@/components/admin/skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <Bar className="h-8 w-32" />
      {/* Поле пошуку. */}
      <Bar className="mt-5 h-[52px] w-full rounded-full" />
      <SkeletonList rows={5} />
    </SkeletonScreen>
  );
}
