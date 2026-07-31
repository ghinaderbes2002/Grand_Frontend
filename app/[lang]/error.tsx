"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // The backend being unreachable is the common case here, so it gets its own
  // wording; anything else falls back to the generic message.
  const isNetwork = error.name === "NetworkError";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">
        {isNetwork ? dict.errors.networkError : dict.common.somethingWentWrong}
      </h1>
      {error.digest ? (
        <p className="text-muted font-mono text-xs">{error.digest}</p>
      ) : null}
      <Button onClick={reset}>{dict.common.retry}</Button>
    </div>
  );
}
