import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ArcField } from "@/components/brand/arc-field";
import { PageShell, ShopPageHeader } from "@/components/shop/page-shell";
import { buttonClass } from "@/components/ui/button";
import { getUser } from "@/lib/api/users";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  // The proxy already redirected anonymous visitors, but that check only looked
  // at cookies — this is the one that actually asks the backend.
  const session = await requireSession(lang, `/${lang}/account`);

  // `/auth/me` carries no name or email. Accounts allowed to read `/users` get
  // them from there; for everyone else the card leads with the role instead.
  // The raw id and permission keys are deliberately not shown: they mean
  // nothing to the person looking at their own account.
  const profile = can(session, PERMISSIONS.usersManage)
    ? await getUser(session.id).catch(() => null)
    : null;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const role = dict.roles[session.roleKey];
  const initial = (name || profile?.email || role).trim().charAt(0).toUpperCase();
  const isStaff = session.roleKey !== "customer" && session.permissions.length > 0;

  return (
    <PageShell width="narrow">
      <ShopPageHeader title={dict.account.title} subtitle={dict.account.subtitle} />

      {/* The profile card: Grand's navy with the arcs, like a business card. */}
      <section className="bg-navy relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <ArcField
          split
          className="absolute top-1/2 -end-24 -z-10 w-[26rem] -translate-y-1/2 text-white/15"
        />
        <div className="flex items-center gap-5">
          <span className="bg-brand shadow-brand flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold">
            {initial}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate text-xl font-semibold">{name || role}</p>
            {profile?.email ? (
              <p dir="ltr" className="truncate text-start text-sm text-white/70">
                {profile.email}
              </p>
            ) : null}
            <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-medium">
              {role}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">{dict.account.quickLinks}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {isStaff ? (
            <QuickLink
              href={`/${lang}/admin`}
              title={dict.account.goAdmin}
              body={dict.account.goAdminBody}
              icon={<DashboardIcon />}
            />
          ) : null}
          <QuickLink
            href={`/${lang}/shop`}
            title={dict.account.goShop}
            body={dict.account.goShopBody}
            icon={<ShopIcon />}
          />
        </div>
      </section>

      <section className="border-border flex flex-col gap-3 border-t pt-6">
        <h2 className="text-muted text-sm font-medium">{dict.account.session}</h2>
        <div className="flex flex-wrap gap-3">
          {/* `buttonClass` rather than `<Button>`: the trigger is the logout
              component's own `<button>`, so it takes classes, not a wrapper. */}
          <LogoutButton className={buttonClass({ variant: "ghost" })}>
            {dict.nav.logout}
          </LogoutButton>
          <LogoutButton scope="all" className={buttonClass({ variant: "danger" })}>
            {dict.account.logoutAll}
          </LogoutButton>
        </div>
      </section>
    </PageShell>
  );
}

function QuickLink({
  href,
  title,
  body,
  icon,
}: {
  href: string;
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-card shadow-card hover:border-accent/40 hover:shadow-raised group flex items-center gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5"
    >
      <span className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-muted text-sm">{body}</span>
      </span>
    </Link>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" className="size-5">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" />
    </svg>
  );
}
