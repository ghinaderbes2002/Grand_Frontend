"use client";

import { useActionState } from "react";

import { useCloseOnSuccess } from "@/components/admin/new-item-dialog";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_KEYS } from "@/lib/admin/schemas";
import { createUserAction } from "@/lib/admin/users";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

/**
 * Creates a staff account. Unlike public registration the account comes out
 * `ACTIVE` immediately, so the password set here is usable straight away.
 */
export function UserForm() {
  const { locale, dict } = useI18n();

  const [state, formAction] = useActionState(
    createUserAction.bind(null, locale),
    idleFormState,
  );
  useCloseOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.users.created} />

      <Field
        name="email"
        type="email"
        label={dict.auth.email}
        autoComplete="off"
        required
        errors={translateFieldErrors(dict, state, "email")}
      />
      <Field
        name="password"
        type="password"
        label={dict.auth.password}
        hint={dict.admin.users.passwordHint}
        autoComplete="new-password"
        required
        errors={translateFieldErrors(dict, state, "password")}
      />
      <Field
        name="firstName"
        label={dict.auth.firstName}
        hint={dict.auth.optional}
        errors={translateFieldErrors(dict, state, "firstName")}
      />
      <Field
        name="lastName"
        label={dict.auth.lastName}
        hint={dict.auth.optional}
        errors={translateFieldErrors(dict, state, "lastName")}
      />
      <SelectField
        name="roleKey"
        label={dict.admin.users.role}
        // No blank entry: an account must have a role, and defaulting to the
        // least privileged staff role is safer than defaulting to the first.
        defaultValue="sales_agent"
        options={ROLE_KEYS.map((roleKey) => ({
          value: roleKey,
          label: dict.roles[roleKey],
        }))}
        errors={translateFieldErrors(dict, state, "roleKey")}
      />

      <SubmitButton
        label={dict.admin.actions.create}
        pendingLabel={dict.admin.actions.creating}
      />
    </form>
  );
}
