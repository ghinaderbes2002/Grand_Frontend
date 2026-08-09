import { notFound } from "next/navigation";

import { Th } from "@/components/admin/data-table";
import { CommitImportButton } from "@/components/admin/import-forms";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { ApiError } from "@/lib/api/errors";
import { getImportBatch } from "@/lib/api/imports";
import type { ImportRowStatus } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const ROW_TONE: Record<ImportRowStatus, BadgeTone> = {
  VALID: "success",
  COMMITTED: "success",
  ERROR: "danger",
  SKIPPED: "neutral",
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
      <PageHeader
        back={{ href: `/${lang}/admin/imports`, label: dict.admin.imports.title }}
        title={batch.filename}
        subtitle={formatDateTime(batch.createdAt, lang)}
        action={
          <Badge>{dict.admin.imports.statuses[batch.status]}</Badge>
        }
      />

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
        <div className="border-border bg-surface/40 shadow-card rounded-2xl border p-5">
          <CommitImportButton batchId={batch.id} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted text-sm">{dict.admin.empty}</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
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
                    <Badge tone={ROW_TONE[row.status]}>
                      {dict.admin.imports.statuses[row.status]}
                    </Badge>
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
