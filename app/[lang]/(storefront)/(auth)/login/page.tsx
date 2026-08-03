import { notFound } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { next, reset } = await searchParams;
  const dict = getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dict.auth.login.title}</h1>
        <p className="text-muted text-sm">{dict.auth.login.subtitle}</p>
      </header>

      {reset ? (
        <p
          role="status"
          className="border-success/40 bg-success/10 text-success rounded-lg border px-3 py-2 text-sm"
        >
          {dict.auth.resetPassword.success}
        </p>
      ) : null}

      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
