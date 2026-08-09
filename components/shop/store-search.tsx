import { Button } from "@/components/ui/button";

/**
 * The catalog search, as a band of its own between the cover and the grid.
 *
 * A plain GET form: the query lands in the URL, so a search is shareable, the
 * back button behaves, and it works with JavaScript off. It posts `q`, which is
 * the parameter the shop actually filters on.
 */
export function StoreSearch({
  action,
  label,
  placeholder,
  submit,
}: {
  action: string;
  label: string;
  placeholder: string;
  submit: string;
}) {
  return (
    <form
      method="get"
      action={action}
      role="search"
      className="border-border bg-surface/60 focus-within:border-accent/60 mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border p-1.5 transition"
    >
      <label htmlFor="store-search" className="sr-only">
        {label}
      </label>
      <SearchIcon className="text-muted mx-3 size-5 shrink-0" />
      <input
        id="store-search"
        name="q"
        type="search"
        placeholder={placeholder}
        // The ring is on the wrapper's border instead, so the pill does not
        // grow a second outline inside itself.
        className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:outline-none"
      />
      <Button type="submit" className="shrink-0">
        {submit}
      </Button>
    </form>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
