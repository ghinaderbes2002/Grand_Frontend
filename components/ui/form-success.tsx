import type { FormState } from "@/lib/forms/state";

export function FormSuccess({ state, message }: { state: FormState; message: string }) {
  if (state.status !== "success") return null;

  return (
    <p
      role="status"
      className="border-success/40 bg-success/10 text-success rounded-lg border px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}
