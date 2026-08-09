import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** A leaf route: nothing below it can 404, so the boundary is safe here. */
export default function CustomersLoading() {
  return (
    <LoadingRegion>
      <SkeletonHeader />
      <Skeleton className="h-64 w-full max-w-lg rounded-2xl" />
    </LoadingRegion>
  );
}
