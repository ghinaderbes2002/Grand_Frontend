import { ArcField } from "@/components/brand/arc-field";
import { Logo } from "@/components/brand/logo";

/**
 * The sign-in, sign-up and password pages: the form beside a navy brand panel,
 * the way the brand book pairs a white card with a navy one.
 *
 * The panel is decoration and folds away below `md`, where the form alone
 * fills the width.
 */
export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="border-border bg-card shadow-raised grid w-full max-w-4xl overflow-hidden rounded-3xl border md:grid-cols-[1fr_1.1fr]">
        <div
          aria-hidden="true"
          className="bg-navy relative isolate hidden flex-col justify-between overflow-hidden p-10 text-white md:flex"
        >
          <ArcField split className="animate-orbit absolute -end-36 -bottom-36 -z-10 w-[32rem] text-white/20" />
          <div className="mesh absolute inset-0 -z-10 text-white opacity-[0.05]!" />
          <Logo tone="reversed" className="h-14 w-auto self-start" />
          <span className="brand-rule h-1 w-24 rounded-full" />
        </div>

        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
