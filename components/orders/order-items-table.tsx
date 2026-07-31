import type { OrderItem } from "@/lib/api/types";
import { formatAmount } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function OrderItemsTable({
  items,
  locale,
}: {
  items: OrderItem[];
  locale: Locale;
}) {
  const dict = getDictionary(locale);

  if (items.length === 0) {
    return <p className="text-muted text-sm">{dict.admin.empty}</p>;
  }

  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-border bg-surface/60 border-b">
          <tr>
            <th className="text-muted px-3 py-2 text-start text-xs font-medium">
              {dict.admin.products.sku}
            </th>
            <th className="text-muted px-3 py-2 text-start text-xs font-medium">
              {dict.admin.orders.quantity}
            </th>
            <th className="text-muted px-3 py-2 text-start text-xs font-medium">
              {dict.admin.orders.unitPrice}
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
              <td className="px-3 py-2">{item.quantity}</td>
              <td className="px-3 py-2">{formatAmount(item.unitPrice, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
