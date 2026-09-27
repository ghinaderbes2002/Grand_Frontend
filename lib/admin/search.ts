/**
 * The admin listings' search: every listing loads its whole set from the API,
 * so the filtering happens here, on the server, against the `?q=` param.
 *
 * Matching is forgiving the way a person typing Arabic expects: case, hamza
 * forms (أ إ آ → ا), taa marbuta (ة → ه), alif maqsura (ى → ي) and diacritics
 * are all ignored, so "اضافه" finds "إضافة".
 */
export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    // Arabic diacritics and tatweel, then Latin combining marks.
    .replace(/[ً-ٰٟـ̀-ͯ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** The search term from the page's `searchParams`, or `""` when there is none. */
export function readQuery(q: string | string[] | undefined) {
  return typeof q === "string" ? q.trim() : "";
}

/** Whether any of the fields contains the query. An empty query matches all. */
export function matchesQuery(query: string, ...fields: Array<string | null | undefined>) {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return fields.some((field) => field && normalizeSearch(field).includes(needle));
}
