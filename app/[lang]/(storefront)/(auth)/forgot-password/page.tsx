import { notFound } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dict.auth.forgotPassword.title}</h1>
        <p className="text-muted text-sm">{dict.auth.forgotPassword.subtitle}</p>
      </header>

      <ForgotPasswordForm />
    </div>
  );
}
