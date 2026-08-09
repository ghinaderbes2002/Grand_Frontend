import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton, SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

/** Scoped to the group so `/admin/orders/[id]` keeps its real 404. */
export default function AdminOrdersLoading() {
  return (
    <LoadingRegion>
      <SkeletonHeader />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <SkeletonList rows={6} />
    </LoadingRegion>
  );
}
