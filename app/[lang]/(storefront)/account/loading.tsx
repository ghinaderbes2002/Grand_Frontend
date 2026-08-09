import { LoadingRegion } from "@/components/ui/loading-region";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** A leaf route: nothing below it can 404, so the boundary is safe here. */
export default function AccountLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <LoadingRegion>
        <SkeletonHeader />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </LoadingRegion>
    </div>
  );
}
