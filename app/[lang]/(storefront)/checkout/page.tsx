import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckoutForm } from "@/components/shop/checkout-form";
import { Panel, ShopPageHeader } from "@/components/shop/page-shell";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/api/orders";
import { requireSession } from "@/lib/auth/session";
import { formatAmount } from "@/lib/format";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  await requireSession(lang, `/${lang}/checkout`);

  const cart = await getCart();

  // The order endpoint rejects an empty cart or one with an unpriced line, so
  // there is nothing to show here in either case.
  if (cart.items.length === 0) {
    redirect(`/${lang}/cart`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <ShopPageHeader
        back={{ href: `/${lang}/cart`, label: dict.cart.title }}
        title={dict.checkout.title}
        subtitle={dict.checkout.subtitle}
      />

      {cart.total === null ? (
        <div className="flex flex-col items-start gap-4">
          <p className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
            {dict.cart.noTotal}
          </p>
          <Link href={`/${lang}/cart`}>
            <Button variant="ghost">{dict.cart.title}</Button>
          </Link>
        </div>
      ) : (
        <>
          <Panel className="flex items-baseline justify-between">
            <span className="text-muted text-sm">{dict.cart.total}</span>
            <span className="text-lg font-semibold">
              {formatAmount(cart.total, lang)}
            </span>
          </Panel>
          <CheckoutForm subtotal={cart.total} />
        </>
      )}
    </div>
  );
}
