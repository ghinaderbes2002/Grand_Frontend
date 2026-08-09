"use client";

import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ASSIGNABLE_USER_STATUSES } from "@/lib/admin/schemas";
import { setUserStatusAction } from "@/lib/admin/users";
import type { User } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function UserStatusForm({ user }: { user: User }) {
  const { locale, dict } = useI18n();

  const [state, formAction] = useActionState(
    setUserStatusAction.bind(null, locale, user.id),
    idleFormState,
  );

  // An account still awaiting verification has a status the API will not accept
  // back, so the select falls through to ACTIVE — which is what confirming the
  // account by hand amounts to.
  const current = ASSIGNABLE_USER_STATUSES.find((status) => status === user.status);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <SelectField
        name="status"
        label={dict.admin.users.status}
        hint={dict.admin.users.statusHint}
        defaultValue={current ?? "ACTIVE"}
        options={ASSIGNABLE_USER_STATUSES.map((status) => ({
          value: status,
          label: dict.admin.users.statuses[status],
        }))}
        errors={translateFieldErrors(dict, state, "status")}
      />

      <SubmitButton
        label={dict.admin.actions.save}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
