export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="border-border bg-surface/40 shadow-raised w-full max-w-md rounded-2xl border p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
