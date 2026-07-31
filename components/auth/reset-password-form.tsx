"use client";

import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPasswordAction } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function ResetPasswordForm({ token }: { token?: string }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    resetPasswordAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <Field
        name="token"
        label={dict.auth.resetPassword.token}
        defaultValue={token}
        required
        errors={translateFieldErrors(dict, state, "token")}
      />
      <Field
        name="newPassword"
        type="password"
        label={dict.auth.newPassword}
        autoComplete="new-password"
        minLength={10}
        required
        errors={translateFieldErrors(dict, state, "newPassword")}
      />

      <SubmitButton
        label={dict.auth.resetPassword.submit}
        pendingLabel={dict.auth.resetPassword.submitting}
      />
    </form>
  );
}
