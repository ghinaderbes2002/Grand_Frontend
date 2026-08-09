import Link from "next/link";
import { notFound } from "next/navigation";

import { CouponForm } from "@/components/admin/coupon-form";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { listCoupons } from "@/lib/api/coupons";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CouponsPage({ params }: PageProps<"/[lang]/admin/coupons">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/coupons`);

  if (!can(session, PERMISSIONS.promotionsManage)) {
    return <NoAccess locale={lang} />;
  }

  const coupons = await listCoupons();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.coupons.title}
        subtitle={dict.admin.coupons.subtitle}
        action={
          <NewItemDialog label={dict.admin.coupons.newTitle}>
            <CouponForm />
          </NewItemDialog>
        }
      />

      <section>
        {coupons.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <DataTable
            head={
              <>
                <Th>{dict.admin.coupons.code}</Th>
                <Th>{dict.admin.coupons.value}</Th>
                <Th>{dict.admin.coupons.usedCount}</Th>
                <Th>{dict.admin.fields.isActive}</Th>
              </>
            }
          >
            {coupons.map((coupon) => (
              <Tr key={coupon.id}>
                <Td>
                  <Link
                    href={`/${lang}/admin/coupons/${coupon.id}`}
                    className={`font-mono font-medium hover:underline ${
                      coupon.isActive ? "" : "text-muted line-through"
                    }`}
                  >
                    {coupon.code}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap">
                  {coupon.type === "PERCENTAGE"
                    ? `${coupon.value}%`
                    : formatAmount(coupon.value, lang)}
                </Td>
                <Td className="text-muted text-xs whitespace-nowrap">
                  {coupon.usedCount ?? 0}
                  {coupon.maxUses
                    ? ` / ${coupon.maxUses}`
                    : ` (${dict.admin.coupons.unlimited})`}
                </Td>
                <Td>
                  {coupon.isActive ? (
                    <span className="text-muted text-xs">{dict.common.yes}</span>
                  ) : (
                    <Badge tone="danger">{dict.common.no}</Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
