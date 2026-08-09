import { notFound } from "next/navigation";

import { CustomerPriceListForm } from "@/components/admin/customer-price-list-form";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CustomersPage({
  params,
}: PageProps<"/[lang]/admin/customers">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/customers`);

  if (!can(session, PERMISSIONS.pricesUpdate)) {
    return <NoAccess locale={lang} />;
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <PageHeader
        title={dict.admin.customers.title}
        subtitle={dict.admin.customers.subtitle}
      />

      {/* There is no customer directory to pick from — see the note. */}
      <p className="border-border bg-surface/40 text-muted rounded-2xl border px-4 py-2.5 text-sm">
        {dict.admin.customers.noLookup}
      </p>

      <Card>
        <CustomerPriceListForm />
      </Card>
    </div>
  );
}
