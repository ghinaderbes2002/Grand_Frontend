import { LoadingRegion } from "@/components/ui/loading-region";
import { SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

/** Scoped to the group so `/orders/[id]` keeps its real 404. */
export default function MyOrdersLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <LoadingRegion>
        <SkeletonHeader />
        <SkeletonList rows={4} />
      </LoadingRegion>
    </div>
  );
}
