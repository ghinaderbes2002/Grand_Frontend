import { ATTR_QUERY_PREFIX, type FilterableAttribute } from "@/lib/shop/attribute-filters";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const inputClass =
  "border-border bg-background h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40";

/**
 * Filter inputs for a category's filterable attributes, shaped by attribute
 * type. Rendered inside the shop's GET form, so each one becomes an
 * `attr_<key>` query param — the format the products endpoint expects.
 */
export function AttributeFilterFields({
  filters,
  locale,
}: {
  filters: FilterableAttribute[];
  locale: Locale;
}) {
  const dict = getDictionary(locale);

  if (filters.length === 0) {
    return (
      <p className="text-muted col-span-full text-xs">
        {dict.shop.noFilterableAttributes}
      </p>
    );
  }

  return (
    <>
      {filters.map(({ attribute, value }) => {
        const name = `${ATTR_QUERY_PREFIX}${attribute.key}`;
        const label = attribute.unit
          ? `${attribute.name} (${attribute.unit})`
          : attribute.name;

        if (attribute.type === "SELECT" || attribute.type === "COLOR_SELECT") {
          return (
            <label key={attribute.id} className="flex flex-col gap-1.5 text-sm">
              {label}
              {/* The option's `value` is submitted, never its label — the API
                  matches on value and is case-sensitive about it. */}
              <select name={name} defaultValue={value} className={inputClass}>
                <option value="">{dict.shop.any}</option>
                {attribute.options.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (attribute.type === "BOOLEAN") {
          return (
            <label key={attribute.id} className="flex flex-col gap-1.5 text-sm">
              {label}
              <select name={name} defaultValue={value} className={inputClass}>
                <option value="">{dict.shop.any}</option>
                <option value="true">{dict.common.yes}</option>
                <option value="false">{dict.common.no}</option>
              </select>
            </label>
          );
        }

        const numeric =
          attribute.type === "DECIMAL_UNIT" || attribute.type === "INTEGER_UNIT";

        return (
          <label key={attribute.id} className="flex flex-col gap-1.5 text-sm">
            {label}
            <input
              name={name}
              type={numeric ? "number" : "text"}
              step={attribute.type === "DECIMAL_UNIT" ? "any" : undefined}
              defaultValue={value}
              className={inputClass}
            />
          </label>
        );
      })}
    </>
  );
}
