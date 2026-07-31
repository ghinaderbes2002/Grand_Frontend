import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckoutForm } from "@/components/shop/checkout-form";
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{dict.checkout.title}</h1>
        <p className="text-muted text-sm">{dict.checkout.subtitle}</p>
      </div>

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
          <p className="flex justify-between text-lg">
            <span className="text-muted">{dict.cart.total}</span>
            <span className="font-semibold">{formatAmount(cart.total, lang)}</span>
          </p>
          <CheckoutForm />
        </>
      )}
    </div>
  );
}
