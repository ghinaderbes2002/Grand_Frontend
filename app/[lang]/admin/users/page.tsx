import Link from "next/link";
import { notFound } from "next/navigation";

import { NewItemDialog } from "@/components/admin/new-item-dialog";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/user-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";
import { ROLE_KEYS } from "@/lib/admin/schemas";
import type { RoleKey } from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { roleLabel } from "@/lib/users/labels";
import { userStatusTone } from "@/lib/users/status";

export default async function UsersPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/users`);

  if (!can(session, PERMISSIONS.usersManage)) {
    return <NoAccess locale={lang} />;
  }

  const { role } = await searchParams;
  const selected =
    typeof role === "string" && ROLE_KEYS.includes(role as RoleKey)
      ? (role as RoleKey)
      : undefined;

  // The endpoint returns staff and customers together with no filter of its
  // own, so a shop with many customers would bury the handful of staff
  // accounts this page exists for. Filtering happens here.
  const users = await listUsers();
  const shown = selected ? users.filter((user) => user.roleKey === selected) : users;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={dict.admin.users.title}
        subtitle={dict.admin.users.subtitle}
        action={
          <NewItemDialog
            label={dict.admin.users.newTitle}
            description={dict.admin.users.newHint}
          >
            <UserForm />
          </NewItemDialog>
        }
      />

      <div className="flex flex-col gap-4">
        <form
          method="get"
          className="border-border bg-surface/40 flex flex-wrap items-end gap-3 rounded-2xl border p-4"
        >
          <label className="flex flex-col gap-1.5 text-sm">
            {dict.admin.users.role}
            <select name="role" defaultValue={selected ?? ""} className={controlClass()}>
              <option value="">{dict.admin.users.allRoles}</option>
              {ROLE_KEYS.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {dict.roles[roleKey]}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit">{dict.admin.filters.apply}</Button>
          {selected ? (
            <Link href={`/${lang}/admin/users`}>
              <Button type="button" variant="ghost">
                {dict.admin.filters.clear}
              </Button>
            </Link>
          ) : null}
        </form>

        {shown.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-2xl border">
            {shown.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/${lang}/admin/users/${user.id}`}
                  className="hover:bg-surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{user.email}</span>
                    <span className="text-muted truncate text-xs">
                      {fullName(user.firstName, user.lastName) ?? dict.admin.users.noName}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge>{roleLabel(dict, user.roleKey)}</Badge>
                    <Badge tone={userStatusTone(user.status)}>
                      {dict.admin.users.statuses[user.status]}
                    </Badge>
                    {user.id === session.id ? (
                      <Badge tone="accent">{dict.admin.users.you}</Badge>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function fullName(firstName: string | null, lastName: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name === "" ? undefined : name;
}
