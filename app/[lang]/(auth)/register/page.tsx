import { notFound } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const { next } = await searchParams;
  const dict = getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dict.auth.register.title}</h1>
        <p className="text-muted text-sm">{dict.auth.register.subtitle}</p>
      </header>

      <RegisterForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
