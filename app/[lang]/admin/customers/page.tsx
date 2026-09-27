import { notFound } from "next/navigation";

import {
  CustomerPriceListForm,
  type CustomerOption,
} from "@/components/admin/customer-price-list-form";
import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { listUsers } from "@/lib/api/users";
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

  // The API's only customer directory is `/users`, which needs `users.manage`.
  // An account with it picks from the list; anyone else pastes the id. A
  // failed read degrades to the paste field rather than breaking the page.
  const customers: CustomerOption[] | undefined = can(session, PERMISSIONS.usersManage)
    ? await listUsers()
        .then((users) =>
          users
            .filter((user) => user.roleKey === "customer")
            .map((user) => {
              const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
              return { id: user.id, label: name ? `${name} — ${user.email}` : user.email };
            })
            .sort((a, b) => a.label.localeCompare(b.label, lang)),
        )
        .catch(() => undefined)
    : undefined;

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <PageHeader
        title={dict.admin.customers.title}
        subtitle={dict.admin.customers.subtitle}
      />

      {/* Without the directory there is nothing to pick from — the note says
          where the id comes from instead. */}
      {customers ? null : (
        <p className="border-border bg-card text-muted rounded-2xl border px-4 py-2.5 text-sm">
          {dict.admin.customers.noLookup}
        </p>
      )}

      <Card>
        {customers?.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.customers.noCustomers}</p>
        ) : (
          <CustomerPriceListForm customers={customers} />
        )}
      </Card>
    </div>
  );
}
