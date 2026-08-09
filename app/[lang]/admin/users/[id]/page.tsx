import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { Card, PageHeader } from "@/components/admin/page-header";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { UserStatusForm } from "@/components/admin/user-status-form";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/errors";
import { getUser } from "@/lib/api/users";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { userStatusTone } from "@/lib/users/status";

export default async function UserDetailPage({
  params,
}: PageProps<"/[lang]/admin/users/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/users/${id}`);

  if (!can(session, PERMISSIONS.usersManage)) {
    return <NoAccess locale={lang} />;
  }

  const user = await getUser(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  });

  const isSelf = user.id === session.id;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        back={{ href: `/${lang}/admin/users`, label: dict.admin.users.title }}
        title={user.email}
        subtitle={name === "" ? dict.admin.users.noName : name}
        action={
          <Badge tone={userStatusTone(user.status)}>
            {dict.admin.users.statuses[user.status]}
          </Badge>
        }
      />

      {/* Demoting or disabling yourself would lock the last administrator out
          with no way back short of a database edit, so both forms are replaced
          by a note on your own account. */}
      {isSelf ? (
        <p className="border-border bg-surface/40 text-muted rounded-2xl border px-4 py-2.5 text-sm">
          {dict.admin.users.selfNotice}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-medium">{dict.admin.users.roleTitle}</h2>
            <UserRoleForm user={user} />
          </Card>

          <Card>
            <h2 className="mb-4 font-medium">{dict.admin.users.statusTitle}</h2>
            <UserStatusForm user={user} />
          </Card>
        </div>
      )}

      <p className="text-muted text-xs">{dict.admin.users.noDelete}</p>
    </div>
  );
}
