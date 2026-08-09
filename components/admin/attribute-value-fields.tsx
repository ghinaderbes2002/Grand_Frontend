"use client";

import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import type { Attribute } from "@/lib/api/types";
import { ATTRIBUTE_FIELD_PREFIX } from "@/lib/forms/fields";
import type { FormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

export type AttributeSpec = {
  attribute: Attribute;
  isRequired: boolean;
};

/**
 * Renders one input per attribute, shaped by the attribute's type.
 *
 * Inputs are named `attr__<id>` so the Server Action can collect an arbitrary
 * set without knowing the category. For SELECT/COLOR_SELECT the option's
 * `value` is submitted, never its label — the API matches on value, and it is
 * case-sensitive.
 */
export function AttributeValueFields({
  specs,
  state,
  values = {},
}: {
  specs: AttributeSpec[];
  state: FormState;
  /** Existing values, keyed by attribute id. */
  values?: Record<string, string>;
}) {
  const { dict } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      {specs.map(({ attribute, isRequired }) => {
        const name = `${ATTRIBUTE_FIELD_PREFIX}${attribute.id}`;
        const label = attribute.name;
        const hint = isRequired ? undefined : dict.auth.optional;
        const errors = translateFieldErrors(dict, state, name);
        const defaultValue = values[attribute.id] ?? "";

        if (attribute.type === "SELECT" || attribute.type === "COLOR_SELECT") {
          return (
            <SelectField
              key={attribute.id}
              name={name}
              label={label}
              hint={hint}
              defaultValue={defaultValue}
              required={isRequired}
              errors={errors}
              options={[
                // Optional attributes need a way to say "not set"; a required
                // one still gets it so the form cannot silently pick the first.
                { value: "", label: "—" },
                ...(attribute.options ?? []).map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
          );
        }

        if (attribute.type === "BOOLEAN") {
          return (
            <SelectField
              key={attribute.id}
              name={name}
              label={label}
              hint={hint}
              defaultValue={defaultValue}
              required={isRequired}
              errors={errors}
              options={[
                { value: "", label: "—" },
                { value: "true", label: dict.common.yes },
                { value: "false", label: dict.common.no },
              ]}
            />
          );
        }

        const numeric =
          attribute.type === "DECIMAL_UNIT" || attribute.type === "INTEGER_UNIT";

        return (
          <Field
            key={attribute.id}
            name={name}
            label={label}
            hint={attribute.unit ?? hint}
            type={numeric ? "number" : "text"}
            step={attribute.type === "DECIMAL_UNIT" ? "any" : undefined}
            defaultValue={defaultValue}
            required={isRequired}
            errors={errors}
          />
        );
      })}
    </div>
  );
}
