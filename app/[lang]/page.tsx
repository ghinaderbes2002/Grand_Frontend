import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSessionOrNull } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await getSessionOrNull();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.home.title}</h1>
      <p className="text-muted max-w-xl text-lg">{dict.home.subtitle}</p>

      {session ? (
        <p className="text-sm">
          {dict.home.signedInAs}{" "}
          <span className="font-medium">{dict.roles[session.roleKey]}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href={`/${lang}/shop`}>
          <Button>{dict.shop.title}</Button>
        </Link>
        {session ? (
          <Link href={`/${lang}/orders`}>
            <Button variant="ghost">{dict.admin.orders.myOrders}</Button>
          </Link>
        ) : (
          <Link href={`/${lang}/login`}>
            <Button variant="ghost">{dict.nav.login}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
