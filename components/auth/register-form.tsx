"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction } from "@/lib/auth/actions";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function RegisterForm({ next }: { next?: string }) {
  const { locale, dict } = useI18n();
  const [state, formAction] = useActionState(
    registerAction.bind(null, locale),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="firstName"
          label={dict.auth.firstName}
          hint={dict.auth.optional}
          autoComplete="given-name"
          errors={translateFieldErrors(dict, state, "firstName")}
        />
        <Field
          name="lastName"
          label={dict.auth.lastName}
          hint={dict.auth.optional}
          autoComplete="family-name"
          errors={translateFieldErrors(dict, state, "lastName")}
        />
      </div>

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
        autoComplete="new-password"
        minLength={10}
        required
        errors={translateFieldErrors(dict, state, "password")}
      />

      <SubmitButton
        label={dict.auth.register.submit}
        pendingLabel={dict.auth.register.submitting}
      />

      <p className="text-muted text-sm">
        {dict.auth.register.hasAccount}{" "}
        <Link href={`/${locale}/login`} className="text-accent hover:underline">
          {dict.auth.register.loginLink}
        </Link>
      </p>
    </form>
  );
}
