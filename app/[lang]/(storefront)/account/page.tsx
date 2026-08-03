import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { logoutAllAction } from "@/lib/auth/actions";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.account.title}</h1>

      <dl className="border-border divide-border divide-y rounded-xl border">
        <Row label={dict.account.role} value={dict.roles[session.roleKey]} />
        <Row label={dict.account.userId} value={session.id} mono />
        <div className="flex flex-col gap-2 p-4">
          <dt className="text-muted text-sm">{dict.account.permissions}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {session.permissions.length ? (
              session.permissions.map((permission) => (
                <span
                  key={permission}
                  className="border-border bg-surface rounded-md border px-2 py-0.5 font-mono text-xs"
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

      <form action={logoutAllAction.bind(null, lang)}>
        <Button variant="ghost" type="submit">
          {dict.account.logoutAll}
        </Button>
      </form>
    </div>
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
