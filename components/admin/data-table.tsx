import type { ReactNode } from "react";

/**
 * The dashboard's one table.
 *
 * Every listing in the admin area is a table now: the same columns in the same
 * order on every page, so a row can be read across rather than deciphered. The
 * pages that were built as stacked rows each invented their own arrangement of
 * name, code and badge, which meant no two listings scanned the same way.
 *
 * `overflow-x-auto` on the wrapper, not the page: a narrow screen scrolls the
 * table sideways inside its own border instead of pushing the layout out.
 *
 * A row cannot be an anchor — `<a>` is not valid inside `<tr>` — so the first
 * cell carries the link, the way the orders table already did.
 */
export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="border-border overflow-x-auto rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="border-border bg-surface/60 border-b">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-border divide-y">{children}</tbody>
      </table>
    </div>
  );
}

/** A column heading. `text-start`, so it follows the writing direction. */
export function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`text-muted px-3 py-2 text-start text-xs font-medium ${className}`}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

/** A body row, with the hover the whole table shares. */
export function Tr({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-surface transition">{children}</tr>;
}
