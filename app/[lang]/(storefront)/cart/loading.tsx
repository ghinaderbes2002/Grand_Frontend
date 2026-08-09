import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton, SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

/** A leaf route: nothing below it can 404, so the boundary is safe here. */
export default function CartLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <LoadingRegion>
        <SkeletonHeader />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <SkeletonList rows={3} />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </LoadingRegion>
    </div>
  );
}
