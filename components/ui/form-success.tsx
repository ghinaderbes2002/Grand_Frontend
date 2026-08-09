import type { FormState } from "@/lib/forms/state";

export function FormSuccess({
  state,
  message,
  /** Optional follow-up — a success the user can act on beats one they read. */
  action,
}: {
  state: FormState;
  message: string;
  action?: React.ReactNode;
}) {
  if (state.status !== "success") return null;

  return (
    <div
      role="status"
      className="border-success/40 bg-success/10 text-success flex flex-wrap items-center justify-between gap-2 rounded-[0.625rem] border px-3 py-2 text-sm"
    >
      <span>{message}</span>
      {action}
    </div>
  );
}
