import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { CartItemRow } from "@/components/shop/cart-item-row";
import { PageShell, Panel, ShopPageHeader } from "@/components/shop/page-shell";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { clearCartAction } from "@/lib/shop/cart";
import { ORDERING_ENABLED } from "@/lib/shop/ordering";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  // Ordering is suspended: the route stops existing rather than asking for
  // a login it no longer has any use for.
  if (!ORDERING_ENABLED) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/cart`);

  const cart = await getCart();

  return (
    <PageShell>
      <ShopPageHeader
        title={dict.cart.title}
        action={
          <Link href={`/${lang}/shop`} className="text-accent-strong text-sm hover:underline">
            {dict.cart.continueShopping}
          </Link>
        }
      />

      {cart.items.length === 0 ? (
        <div className="border-border flex flex-col items-start gap-4 rounded-2xl border border-dashed p-8">
          <p className="text-muted text-sm">{dict.cart.empty}</p>
          <Link href={`/${lang}/shop`}>
            <Button>{dict.shop.title}</Button>
          </Link>
        </div>
      ) : (
        /* Lines on the left, a summary that stays put on the right — the
           usual shape, and it keeps checkout reachable on a long cart. */
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </ul>

          <Panel className="flex flex-col gap-4 lg:sticky lg:top-20">
            <h2 className="font-medium">{dict.cart.summary}</h2>

            {/* `total` is null when any line has no retail price — the order
                endpoint rejects such a cart, so checkout stays closed. */}
            {cart.total === null ? (
              <p className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
                {dict.cart.noTotal}
              </p>
            ) : (
              <p className="border-border flex items-baseline justify-between border-t pt-4 text-lg">
                <span className="text-muted text-sm">{dict.cart.total}</span>
                <span className="font-semibold">{formatAmount(cart.total, lang)}</span>
              </p>
            )}

            {cart.total !== null ? (
              <Link href={`/${lang}/checkout`}>
                <Button className="w-full">{dict.cart.checkout}</Button>
              </Link>
            ) : null}

            <ConfirmButton
              action={clearCartAction.bind(null, lang)}
              label={dict.cart.clear}
              pendingLabel={dict.admin.actions.deleting}
            />
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
