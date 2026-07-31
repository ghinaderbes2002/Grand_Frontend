import "server-only";

import { cache } from "react";

import { CACHE_TAGS, CATALOG_TTL, publicCache } from "./cache";
import { apiFetch } from "./client";
import type { Media, MediaEntityType, Uuid } from "./types";

/**
 * Public: media is keyed by entity, not embedded in the entity itself.
 * Cached per request so a page and its `generateMetadata` share one call.
 */
export const listMedia = cache((entityType: MediaEntityType, entityId: Uuid) =>
  apiFetch<Media[]>("/media", {
    ...publicCache(CATALOG_TTL, [CACHE_TAGS.media]),
    query: { entityType, entityId },
  }),
);
