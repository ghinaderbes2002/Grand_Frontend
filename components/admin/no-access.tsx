import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Shown when the session lacks the permission a screen requires. */
export function NoAccess({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-xl font-semibold">{dict.admin.noAccess.title}</h1>
      <p className="text-muted max-w-md text-sm">{dict.admin.noAccess.body}</p>
      <Link href={`/${locale}`}>
        <Button variant="ghost">{dict.admin.noAccess.backHome}</Button>
      </Link>
    </div>
  );
}
