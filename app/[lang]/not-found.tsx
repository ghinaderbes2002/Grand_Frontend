"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

export default function NotFound() {
  const { locale, dict } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-muted font-mono text-sm">404</p>
      <h1 className="text-xl font-semibold">{dict.common.somethingWentWrong}</h1>
      <Link href={`/${locale}`}>
        <Button>{dict.nav.home}</Button>
      </Link>
    </div>
  );
}
