import Link from "next/link";
import { notFound } from "next/navigation";

import { CouponForm } from "@/components/admin/coupon-form";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
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
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          {coupons.length === 0 ? (
            <p className="text-muted text-sm">{dict.admin.empty}</p>
          ) : (
            <ul className="border-border divide-border divide-y rounded-2xl border">
              {coupons.map((coupon) => (
                <li key={coupon.id}>
                  <Link
                    href={`/${lang}/admin/coupons/${coupon.id}`}
                    className="hover:bg-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span
                        className={`font-mono text-sm ${
                          coupon.isActive ? "" : "text-muted line-through"
                        }`}
                      >
                        {coupon.code}
                      </span>
                      <span className="text-muted text-xs">
                        {coupon.type === "PERCENTAGE"
                          ? `${coupon.value}%`
                          : formatAmount(coupon.value, lang)}
                      </span>
                    </span>

                    <span className="text-muted text-xs">
                      {dict.admin.coupons.usedCount}: {coupon.usedCount ?? 0}
                      {coupon.maxUses
                        ? ` / ${coupon.maxUses}`
                        : ` (${dict.admin.coupons.unlimited})`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card className="h-fit">
          <h2 className="mb-4 font-medium">{dict.admin.coupons.newTitle}</h2>
          <CouponForm />
        </Card>
      </div>
    </div>
  );
}
