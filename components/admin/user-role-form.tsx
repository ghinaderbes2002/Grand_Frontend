"use client";

import { useActionState } from "react";

import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_KEYS } from "@/lib/admin/schemas";
import { setUserRoleAction } from "@/lib/admin/users";
import type { User } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";
import { isKnownRole, roleLabel } from "@/lib/users/labels";

export function UserRoleForm({ user }: { user: User }) {
  const { locale, dict } = useI18n();

  const [state, formAction] = useActionState(
    setUserRoleAction.bind(null, locale, user.id),
    idleFormState,
  );

  const known = isKnownRole(user.roleKey, ROLE_KEYS);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <SelectField
        name="roleKey"
        label={dict.admin.users.role}
        hint={dict.admin.users.roleDelay}
        defaultValue={known ? user.roleKey : ""}
        options={[
          // A role this build does not know would otherwise leave the select on
          // its first entry — super_admin — and a save the admin thought was a
          // no-op would promote the account. The blank entry fails validation
          // instead, so nothing changes until a real role is picked.
          ...(known
            ? []
            : [{ value: "", label: roleLabel(dict, user.roleKey) }]),
          ...ROLE_KEYS.map((roleKey) => ({
            value: roleKey,
            label: dict.roles[roleKey],
          })),
        ]}
        errors={translateFieldErrors(dict, state, "roleKey")}
      />

      <SubmitButton
        label={dict.admin.actions.save}
        pendingLabel={dict.admin.actions.saving}
      />
    </form>
  );
}
