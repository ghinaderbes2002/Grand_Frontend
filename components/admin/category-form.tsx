"use client";

import { useActionState } from "react";

import { useCloseOnSuccess } from "@/components/admin/new-item-dialog";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCategoryAction, updateCategoryAction } from "@/lib/admin/categories";
import type { Category, Uuid } from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export function CategoryForm({
  category,
  parentOptions,
}: {
  /** Omitted when creating. */
  category?: Category;
  /** Flat category list, already excluding the category being edited. */
  parentOptions: Array<{ id: Uuid; label: string }>;
}) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(category);

  const [state, formAction] = useActionState(
    isEdit
      ? updateCategoryAction.bind(null, locale, category!.id)
      : createCategoryAction.bind(null, locale),
    idleFormState,
  );
  useCloseOnSuccess(state);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <Field
        name="name"
        label={dict.admin.fields.name}
        defaultValue={category?.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />

      <Field
        name="slug"
        label={dict.admin.fields.slug}
        hint={dict.admin.fields.slugHint}
        defaultValue={category?.slug}
        errors={translateFieldErrors(dict, state, "slug")}
      />

      <SelectField
        name="parentId"
        label={dict.admin.categories.parent}
        hint={isEdit ? dict.admin.categories.parentHint : undefined}
        defaultValue={category?.parentId ?? ""}
        errors={translateFieldErrors(dict, state, "parentId")}
        options={[
          { value: "", label: dict.admin.categories.noParent },
          ...parentOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="sortOrder"
          type="number"
          label={dict.admin.fields.sortOrder}
          defaultValue={category?.sortOrder ?? 0}
          errors={translateFieldErrors(dict, state, "sortOrder")}
        />
        <Field
          name="imageUrl"
          label={dict.admin.fields.imageUrl}
          defaultValue={category?.imageUrl ?? ""}
          errors={translateFieldErrors(dict, state, "imageUrl")}
        />
      </div>

      <Field
        name="seoTitle"
        label={dict.admin.fields.seoTitle}
        defaultValue={category?.seoTitle ?? ""}
        errors={translateFieldErrors(dict, state, "seoTitle")}
      />
      <Field
        name="seoDescription"
        label={dict.admin.fields.seoDescription}
        defaultValue={category?.seoDescription ?? ""}
        errors={translateFieldErrors(dict, state, "seoDescription")}
      />

      <CheckboxField
        name="isActive"
        label={dict.admin.fields.isActive}
        defaultChecked={category?.isActive ?? true}
      />

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
