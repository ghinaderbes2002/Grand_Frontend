import { notFound } from "next/navigation";

import { CouponForm } from "@/components/admin/coupon-form";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { getCoupon } from "@/lib/api/coupons";
import { ApiError } from "@/lib/api/errors";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CouponDetailPage({
  params,
}: PageProps<"/[lang]/admin/coupons/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/coupons/${id}`);

  if (!can(session, PERMISSIONS.promotionsManage)) {
    return <NoAccess locale={lang} />;
  }

  const coupon = await getCoupon(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        back={{ href: `/${lang}/admin/coupons`, label: dict.admin.coupons.title }}
        title={dict.admin.coupons.editTitle}
        subtitle={`${dict.admin.coupons.usedCount}: ${coupon.usedCount ?? 0}${
          coupon.maxUses ? ` / ${coupon.maxUses}` : ` (${dict.admin.coupons.unlimited})`
        }`}
      />

      {/* There is no delete endpoint for coupons — deactivating is the way to
          retire one, which also keeps its usage history intact. */}
      <Card>
        <CouponForm coupon={coupon} />
      </Card>
    </div>
  );
}
