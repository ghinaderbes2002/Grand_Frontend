import "server-only";

import { apiFetch } from "./client";
import type { Media, MediaEntityType, Uuid } from "./types";

/** Public: media is keyed by entity, not embedded in the entity itself. */
export function listMedia(entityType: MediaEntityType, entityId: Uuid) {
  return apiFetch<Media[]>("/media", {
    cache: "no-store",
    query: { entityType, entityId },
  });
}
