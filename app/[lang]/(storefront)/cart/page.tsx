import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { CartItemRow } from "@/components/shop/cart-item-row";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { clearCartAction } from "@/lib/shop/cart";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/cart`);

  const cart = await getCart();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{dict.cart.title}</h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted text-sm">{dict.cart.empty}</p>
          <Link href={`/${lang}/shop`}>
            <Button>{dict.shop.title}</Button>
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </ul>

          <div className="border-border flex flex-col gap-4 border-t pt-4">
            {/* `total` is null when any line has no retail price — the order
                endpoint rejects such a cart, so checkout stays closed. */}
            {cart.total === null ? (
              <p className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
                {dict.cart.noTotal}
              </p>
            ) : (
              <p className="flex justify-between text-lg">
                <span className="text-muted">{dict.cart.total}</span>
                <span className="font-semibold">{formatAmount(cart.total, lang)}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {cart.total !== null ? (
                <Link href={`/${lang}/checkout`}>
                  <Button>{dict.cart.checkout}</Button>
                </Link>
              ) : null}

              <ConfirmButton
                action={clearCartAction.bind(null, lang)}
                label={dict.cart.clear}
                pendingLabel={dict.admin.actions.deleting}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
