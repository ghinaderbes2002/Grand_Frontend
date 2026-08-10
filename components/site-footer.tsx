import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { ORDERING_ENABLED } from "@/lib/shop/ordering";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Storefront footer — the one deliberately dark surface on the page, in both
 * themes. It is what closes the site.
 *
 * Four columns: the brand, two link lists and the contact details. Every link
 * points at a route that exists; a footer padded with dead "About"/"Careers"
 * entries is the clearest sign a site is a template.
 *
 * **The contact details are placeholders.** `info@example.com` sits in a domain
 * IANA reserves for exactly this and can never belong to anyone, and the phone
 * is all zeros — both are visibly not real, so nothing here misleads a visitor
 * before launch. Replace them under `footer.address` / `footer.phone` /
 * `footer.email` in the dictionaries.
 *
 * Social links are env-driven and each renders only when its URL is set:
 *   NEXT_PUBLIC_WHATSAPP_URL, NEXT_PUBLIC_FACEBOOK_URL, NEXT_PUBLIC_INSTAGRAM_URL
 *
 * The dashboard has no footer; it is a workspace, not a site.
 */
export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const columns = [
    {
      title: dict.footer.shop,
      links: [
        { href: `/${locale}`, label: dict.nav.home },
        { href: `/${locale}/shop`, label: dict.shop.title },
        { href: `/${locale}/categories`, label: dict.nav.categories },
      ],
    },
    {
      title: dict.footer.help,
      links: [
        { href: `/${locale}/faq`, label: dict.nav.faq },
        // Those two routes answer 404 while ordering is suspended.
        ...(ORDERING_ENABLED
          ? [
              { href: `/${locale}/orders`, label: dict.admin.orders.myOrders },
              { href: `/${locale}/cart`, label: dict.cart.title },
            ]
          : []),
        { href: `/${locale}/account`, label: dict.nav.account },
      ],
    },
  ];

  const socials = [
    {
      href: process.env.NEXT_PUBLIC_WHATSAPP_URL,
      label: "WhatsApp",
      icon: <WhatsappIcon />,
    },
    {
      href: process.env.NEXT_PUBLIC_FACEBOOK_URL,
      label: "Facebook",
      icon: <FacebookIcon />,
    },
    {
      href: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      label: "Instagram",
      icon: <InstagramIcon />,
    },
  ].filter((social): social is typeof social & { href: string } => Boolean(social.href));

  // `tel:` wants the raw digits; the display keeps its spacing.
  const telHref = `tel:${dict.footer.phone.replace(/\s+/g, "")}`;

  return (
    // A diagonal run rather than a flat fill, so the panel has depth across its
    // width instead of reading as one slab.
    <footer className="text-footer-foreground mt-20 bg-linear-to-br from-[#16233a] via-[#1b2733] to-[#24405a]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <Link href={`/${locale}`} className="flex items-center gap-2.5">
              <LogoMark className="size-8" />
              <span className="text-lg font-semibold tracking-tight">
                {dict.common.appName}
              </span>
            </Link>
            <p className="text-footer-foreground/65 max-w-xs text-sm leading-relaxed">
              {dict.footer.tagline}
            </p>

            {socials.length > 0 ? (
              <ul className="mt-1 flex items-center gap-2.5">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      // `noopener` keeps the opened tab from reaching back into
                      // this one through `window.opener`.
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      className="border-footer-foreground/20 text-footer-foreground/70 hover:border-footer-accent hover:text-footer-accent flex size-10 items-center justify-center rounded-full border transition hover:-translate-y-0.5"
                    >
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {columns.map((column) => (
            <nav key={column.title} className="flex flex-col gap-4">
              <h2 className="text-footer-accent text-sm font-semibold">{column.title}</h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-footer-foreground/65 hover:text-footer-foreground text-sm transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="flex flex-col gap-4">
            <h2 className="text-footer-accent text-sm font-semibold">
              {dict.footer.contact}
            </h2>
            <ul className="flex flex-col gap-3 text-sm">
              <li className="text-footer-foreground/65 flex items-start gap-3">
                <PinIcon className="text-footer-accent mt-0.5 size-4 shrink-0" />
                <span>{dict.footer.address}</span>
              </li>
              <li>
                <a
                  href={telHref}
                  className="text-footer-foreground/65 hover:text-footer-foreground flex items-center gap-3 transition"
                >
                  <PhoneIcon className="text-footer-accent size-4 shrink-0" />
                  {/* `dir="ltr"` so the leading + and the digits keep their
                      order inside a right-to-left paragraph. */}
                  <span dir="ltr">{dict.footer.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${dict.footer.email}`}
                  className="text-footer-foreground/65 hover:text-footer-foreground flex items-center gap-3 transition"
                >
                  <MailIcon className="text-footer-accent size-4 shrink-0" />
                  <span dir="ltr">{dict.footer.email}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-footer-foreground/15 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <p className="text-footer-foreground/55 text-xs">
            © {new Date().getFullYear()} {dict.common.appName}. {dict.footer.rights}
          </p>
          <p className="text-footer-foreground/45 text-xs">{dict.home.badge}</p>
        </div>
      </div>
    </footer>
  );
}

/* Contact glyphs, stroked to match the house style. */

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 16.9v2.5a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.6 2 2 0 0 1 3.1 1.4h2.5a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.7 9.2a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

/* Brand glyphs are solid shapes, not the stroked house style — a stroked
   WhatsApp mark is not recognisable as one. */

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4.5">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.69 8.23-8.24 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.19-.54.06-.25-.12-1.05-.38-1.99-1.23-.74-.65-1.23-1.46-1.38-1.71-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.06s.89 2.39 1.01 2.56c.12.16 1.74 2.67 4.22 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4.5">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33v7.03C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4.5">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.98c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 3.37a4.49 4.49 0 1 1 0 8.98 4.49 4.49 0 0 1 0-8.98Zm0 7.4a2.91 2.91 0 1 0 0-5.82 2.91 2.91 0 0 0 0 5.82Zm5.72-7.6a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 0 1 2.1 0Z" />
    </svg>
  );
}
