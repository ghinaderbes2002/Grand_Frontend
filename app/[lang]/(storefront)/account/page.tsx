import { notFound } from "next/navigation";

import { PageShell, ShopPageHeader } from "@/components/shop/page-shell";
import { Button } from "@/components/ui/button";
import { logoutAction, logoutAllAction } from "@/lib/auth/actions";
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

  return (
    <PageShell width="narrow">
      <ShopPageHeader title={dict.account.title} />

      <dl className="border-border divide-border bg-surface/30 divide-y rounded-2xl border">
        <Row label={dict.account.role} value={dict.roles[session.roleKey]} />
        <Row label={dict.account.userId} value={session.id} mono />
        <div className="flex flex-col gap-2 p-4">
          <dt className="text-muted text-sm">{dict.account.permissions}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {session.permissions.length ? (
              session.permissions.map((permission) => (
                <span
                  key={permission}
                  className="border-border bg-background rounded-md border px-2 py-0.5 font-mono text-xs"
                >
                  {permission}
                </span>
              ))
            ) : (
              <span className="text-muted text-sm">{dict.account.noPermissions}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        {/* The header's log-out folds away below `md`, so this page carries
            one of its own. */}
        <form action={logoutAction.bind(null, lang)}>
          <Button variant="ghost" type="submit">
            {dict.nav.logout}
          </Button>
        </form>

        <form action={logoutAllAction.bind(null, lang)}>
          <Button variant="ghost" type="submit" className="text-danger">
            {dict.account.logoutAll}
          </Button>
        </form>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}
