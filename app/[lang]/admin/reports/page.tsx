import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import { getSalesReport } from "@/lib/api/reports";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatAmount, formatDateTime } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

function one(value: string | string[] | undefined) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function ReportsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/reports">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/reports`);

  if (!can(session, PERMISSIONS.reportsView)) {
    return <NoAccess locale={lang} />;
  }

  const query = await searchParams;
  const from = one(query.from);
  const to = one(query.to);

  // Both bounds are optional — with neither, the API reports over all time.
  const report = await getSalesReport({ from, to });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.reports.sales}
        subtitle={dict.admin.reports.salesSubtitle}
        action={
          <>
            <Link href={`/${lang}/admin/reports/low-stock`}>
              <Button variant="ghost">{dict.admin.reports.lowStock}</Button>
            </Link>
            <Link href={`/${lang}/admin/reports/stagnant`}>
              <Button variant="ghost">{dict.admin.reports.stagnant}</Button>
            </Link>
          </>
        }
      />

      <form
        method="get"
        className="border-border bg-surface/40 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.reports.from}
          <input
            name="from"
            type="date"
            defaultValue={from?.slice(0, 10)}
            className={controlClass()}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          {dict.admin.reports.to}
          <input
            name="to"
            type="date"
            defaultValue={to?.slice(0, 10)}
            className={controlClass()}
          />
        </label>
        <Button type="submit">
          {dict.admin.filters.apply}
        </Button>
        {from || to ? (
          <Link href={`/${lang}/admin/reports`}>
            <Button type="button" variant="ghost">
              {dict.admin.filters.clear}
            </Button>
          </Link>
        ) : null}
      </form>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-surface/40 flex flex-col gap-1 rounded-2xl border p-5">
          <dt className="text-muted text-sm">{dict.admin.reports.totalRevenue}</dt>
          <dd className="text-accent-strong text-2xl font-semibold">
            {formatAmount(report.totalRevenue, lang)}
          </dd>
        </div>
        <div className="border-border bg-surface/40 flex flex-col gap-1 rounded-2xl border p-5">
          <dt className="text-muted text-sm">{dict.admin.reports.orderCount}</dt>
          <dd className="text-2xl font-semibold">{report.orderCount}</dd>
        </div>
      </dl>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">{dict.admin.reports.byDay}</h3>
        {report.byDay.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.reports.noSales}</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="border-border bg-surface/60 border-b">
                <tr>
                  <Th>{dict.admin.reports.date}</Th>
                  <Th>{dict.admin.reports.revenue}</Th>
                  <Th>{dict.admin.reports.orderCount}</Th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {report.byDay.map((day) => (
                  <tr key={day.date}>
                    <td className="text-muted px-3 py-2 text-xs">
                      {formatDateTime(day.date, lang)}
                    </td>
                    <td className="px-3 py-2">{formatAmount(day.revenue, lang)}</td>
                    <td className="px-3 py-2">{day.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-muted px-3 py-2 text-start text-xs font-medium">{children}</th>;
}
