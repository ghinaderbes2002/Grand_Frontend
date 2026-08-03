"use client";

import { LogoutIcon } from "@/components/admin/icons";
import type { CurrentUser } from "@/lib/api/types";
import { logoutAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/context";

/** The signed-in account, pinned to the bottom of the sidebar. */
export function AdminSidebarUser({ session }: { session: CurrentUser }) {
  const { dict } = useI18n();

  return (
    <div className="border-border flex flex-col gap-2 border-t pt-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="bg-accent/10 text-accent flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {dict.roles[session.roleKey].charAt(0)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {dict.roles[session.roleKey]}
          </span>
          {/* `/auth/me` returns no name or email — only the id and the role. */}
          <span className="text-muted truncate font-mono text-xs">
            {session.id.slice(0, 8)}
          </span>
        </span>
      </div>

      <AdminLogoutButton />
    </div>
  );
}

/**
 * `compact` drops the label down to an icon, for the small-screen header where
 * the sidebar is hidden and there is no room for a full row.
 */
export function AdminLogoutButton({ compact = false }: { compact?: boolean }) {
  const { locale, dict } = useI18n();

  return (
    <form action={logoutAction.bind(null, locale)}>
      <button
        type="submit"
        aria-label={compact ? dict.nav.logout : undefined}
        title={compact ? dict.nav.logout : undefined}
        className={`text-danger hover:bg-danger/10 flex items-center gap-2.5 rounded-xl text-sm transition ${
          compact ? "p-2" : "w-full px-3 py-2.5"
        }`}
      >
        <LogoutIcon />
        {compact ? null : dict.nav.logout}
      </button>
    </form>
  );
}
