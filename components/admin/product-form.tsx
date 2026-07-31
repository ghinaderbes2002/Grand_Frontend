"use client";

import { useActionState } from "react";

import {
  AttributeValueFields,
  type AttributeSpec,
} from "@/components/admin/attribute-value-fields";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProductAction, updateProductAction } from "@/lib/admin/products";
import type {
  Brand,
  Product,
  ProductStatus,
  ProductType,
  SellingUnit,
  Uuid,
} from "@/lib/api/types";
import { idleFormState } from "@/lib/forms/state";
import { translateFieldErrors } from "@/lib/forms/translate";
import { useI18n } from "@/lib/i18n/context";

const UNITS: SellingUnit[] = [
  "PIECE",
  "METER",
  "ROLL",
  "KILOGRAM",
  "PACKAGE",
  "PARCEL",
  "SHEET",
];

const STATUSES: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export function ProductForm({
  product,
  categoryId,
  type,
  brands,
  attributeSpecs,
}: {
  /** Omitted when creating. */
  product?: Product;
  categoryId: Uuid;
  /** Derived from the category, never chosen by hand. */
  type: ProductType;
  brands: Brand[];
  /** The category's informational (non variant-creating) attributes. */
  attributeSpecs: AttributeSpec[];
}) {
  const { locale, dict } = useI18n();
  const isEdit = Boolean(product);

  const [state, formAction] = useActionState(
    isEdit
      ? updateProductAction.bind(null, locale, product!.id)
      : createProductAction.bind(null, locale, categoryId, type),
    idleFormState,
  );

  const existingValues = Object.fromEntries(
    (product?.attributeValues ?? []).map((value) => [value.attributeId, value.value]),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormError state={state} />
      <FormSuccess state={state} message={dict.admin.actions.saved} />

      <div className="border-border bg-surface/40 rounded-lg border p-3 text-sm">
        <p className="font-medium">
          {dict.admin.products.type}:{" "}
          {type === "VARIABLE"
            ? dict.admin.products.typeVariable
            : dict.admin.products.typeSimple}
        </p>
        <p className="text-muted mt-1 text-xs">
          {type === "VARIABLE"
            ? dict.admin.products.typeVariableWhy
            : dict.admin.products.typeSimpleWhy}
        </p>
      </div>

      <Field
        name="name"
        label={dict.admin.fields.name}
        defaultValue={product?.name}
        required
        errors={translateFieldErrors(dict, state, "name")}
      />

      <Field
        name="slug"
        label={dict.admin.fields.slug}
        hint={dict.admin.fields.slugHint}
        defaultValue={product?.slug}
        errors={translateFieldErrors(dict, state, "slug")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          {dict.admin.products.description}
          <span className="text-muted font-normal"> ({dict.auth.optional})</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/40"
        />
      </div>

      <SelectField
        name="brandId"
        label={dict.admin.products.brand}
        defaultValue={product?.brandId ?? ""}
        errors={translateFieldErrors(dict, state, "brandId")}
        options={[
          { value: "", label: dict.admin.products.noBrand },
          ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="sellingUnit"
          label={dict.admin.products.sellingUnit}
          defaultValue={product?.sellingUnit ?? "PIECE"}
          errors={translateFieldErrors(dict, state, "sellingUnit")}
          options={UNITS.map((unit) => ({
            value: unit,
            label: dict.admin.products.units[unit],
          }))}
        />
        <Field
          name="minOrderQuantity"
          type="number"
          step="any"
          min={0}
          label={dict.admin.products.minOrderQuantity}
          defaultValue={product?.minOrderQuantity ?? 1}
          required
          errors={translateFieldErrors(dict, state, "minOrderQuantity")}
        />
      </div>

      {/* A simple product's single implicit variant is created alongside it, so
          its identifiers belong on this form. Variable products get theirs on
          the variant form instead. */}
      {!isEdit && type === "SIMPLE" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="sku"
            label={dict.admin.products.sku}
            hint={dict.admin.products.skuHint}
            required
            errors={translateFieldErrors(dict, state, "sku")}
          />
          <Field
            name="barcode"
            label={dict.admin.products.barcode}
            errors={translateFieldErrors(dict, state, "barcode")}
          />
          <Field
            name="weight"
            type="number"
            step="any"
            min={0}
            label={dict.admin.products.weight}
            errors={translateFieldErrors(dict, state, "weight")}
          />
        </div>
      ) : null}

      {isEdit ? (
        <SelectField
          name="status"
          label={dict.admin.products.status}
          defaultValue={product!.status}
          errors={translateFieldErrors(dict, state, "status")}
          options={STATUSES.map((status) => ({
            value: status,
            label: dict.admin.products.statuses[status],
          }))}
        />
      ) : null}

      <fieldset className="border-border flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          {dict.admin.products.productAttributes}
        </legend>
        {attributeSpecs.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.products.noProductAttributes}</p>
        ) : (
          <>
            <p className="text-muted text-xs">
              {dict.admin.products.productAttributesHint}
            </p>
            <AttributeValueFields
              specs={attributeSpecs}
              state={state}
              values={existingValues}
            />
          </>
        )}
      </fieldset>

      <SubmitButton
        label={isEdit ? dict.admin.actions.save : dict.admin.actions.create}
        pendingLabel={isEdit ? dict.admin.actions.saving : dict.admin.actions.creating}
      />
    </form>
  );
}
