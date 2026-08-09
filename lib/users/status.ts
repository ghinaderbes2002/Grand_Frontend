import type { BadgeTone } from "@/components/ui/badge";
import type { UserStatus } from "@/lib/api/types";

/** Only `ACTIVE` can sign in — everything else reads as a problem, not a shade. */
export function userStatusTone(status: UserStatus): BadgeTone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PENDING_VERIFICATION":
      return "warning";
    default:
      return "danger";
  }
}
