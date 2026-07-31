import Link from "next/link";
import { notFound } from "next/navigation";

import { CommitImportButton } from "@/components/admin/import-forms";
import { NoAccess } from "@/components/admin/no-access";
import { ApiError } from "@/lib/api/errors";
import { getImportBatch } from "@/lib/api/imports";
import type { ImportRowStatus } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const ROW_TONE: Record<ImportRowStatus, string> = {
  VALID: "border-success/40 text-success",
  COMMITTED: "border-success/40 text-success",
  ERROR: "border-danger/40 text-danger",
  SKIPPED: "border-border text-muted",
};

export default async function ImportBatchPage({
  params,
}: PageProps<"/[lang]/admin/imports/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/imports/${id}`);

  if (!can(session, PERMISSIONS.importsManage)) {
    return <NoAccess locale={lang} />;
  }

  const batch = await getImportBatch(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const rows = batch.rows ?? [];
  const valid = rows.filter((row) => row.status === "VALID").length;
  const errors = rows.filter((row) => row.status === "ERROR").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/${lang}/admin/imports`}
          className="text-muted hover:text-foreground text-sm"
        >
          ← {dict.admin.imports.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium">{batch.filename}</h2>
          <span className="border-border text-muted rounded-md border px-2 py-0.5 text-xs">
            {dict.admin.imports.statuses[batch.status]}
          </span>
          <span className="text-muted text-sm">
            {formatDateTime(batch.createdAt, lang)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <span className="text-muted">{dict.admin.imports.rows}: </span>
          {rows.length}
        </span>
        <span className="text-success">
          {dict.admin.imports.valid}: {valid}
        </span>
        <span className={errors > 0 ? "text-danger" : "text-muted"}>
          {dict.admin.imports.errorCount}: {errors}
        </span>
      </div>

      {batch.status === "PREVIEWED" && valid > 0 ? (
        <div className="border-border rounded-xl border p-5">
          <CommitImportButton batchId={batch.id} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.empty}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-border bg-surface/60 border-b">
              <tr>
                <Th>{dict.admin.imports.row}</Th>
                <Th>{dict.admin.orders.status}</Th>
                <Th>sku</Th>
                <Th>productName</Th>
                <Th>{dict.errors.required}</Th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-muted px-3 py-2 text-xs">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${ROW_TONE[row.status]}`}
                    >
                      {dict.admin.imports.statuses[row.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.data?.sku ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{row.data?.productName ?? "—"}</td>
                  <td className="text-danger px-3 py-2 text-xs">
                    {row.errors?.length ? row.errors.join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-muted px-3 py-2 text-start text-xs font-medium">{children}</th>;
}
