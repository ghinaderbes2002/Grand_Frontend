"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function LoginForm({ next }: { next?: string }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    loginAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        name="email"
        type="email"
        label={dict.auth.email}
        autoComplete="email"
        required
        errors={translateFieldErrors(dict, state, "email")}
      />
      <Field
        name="password"
        type="password"
        label={dict.auth.password}
        autoComplete="current-password"
        required
        errors={translateFieldErrors(dict, state, "password")}
      />

      <SubmitButton
        label={dict.auth.login.submit}
        pendingLabel={dict.auth.login.submitting}
      />

      <div className="text-muted flex flex-wrap justify-between gap-2 text-sm">
        <Link href={`/${locale}/forgot-password`} className="hover:text-foreground">
          {dict.auth.login.forgotPassword}
        </Link>
        <span>
          {dict.auth.login.noAccount}{" "}
          <Link href={`/${locale}/register`} className="text-accent hover:underline">
            {dict.auth.login.registerLink}
          </Link>
        </span>
      </div>
    </form>
  );
}
