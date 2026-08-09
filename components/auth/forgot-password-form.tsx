"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function ForgotPasswordForm() {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    forgotPasswordAction.bind(null, locale),
    idleFormState,
  );

  // The API answers 200 for unknown emails on purpose, so this confirmation is
  // deliberately vague — it must not reveal whether the account exists.
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="border-success/40 bg-success/10 text-success rounded-lg border px-3 py-2 text-sm"
        >
          {dict.auth.forgotPassword.sent}
        </p>
        <Link href={`/${locale}/reset-password`} className="text-accent-strong text-sm hover:underline">
          {dict.auth.resetPassword.title}
        </Link>
        <Link href={`/${locale}/login`} className="text-muted text-sm hover:underline">
          {dict.auth.forgotPassword.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <Field
        name="email"
        type="email"
        label={dict.auth.email}
        autoComplete="email"
        required
        errors={translateFieldErrors(dict, state, "email")}
      />

      <SubmitButton
        label={dict.auth.forgotPassword.submit}
        pendingLabel={dict.auth.forgotPassword.submitting}
      />

      <Link href={`/${locale}/login`} className="text-muted text-sm hover:underline">
        {dict.auth.forgotPassword.backToLogin}
      </Link>
    </form>
  );
}
