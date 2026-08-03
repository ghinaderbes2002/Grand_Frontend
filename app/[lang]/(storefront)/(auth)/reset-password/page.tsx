import { notFound } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // The reset email may link straight here with `?token=…`.
  const { token } = await searchParams;
  const dict = getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dict.auth.resetPassword.title}</h1>
        <p className="text-muted text-sm">{dict.auth.resetPassword.subtitle}</p>
      </header>

      <ResetPasswordForm token={typeof token === "string" ? token : undefined} />
    </div>
  );
}
