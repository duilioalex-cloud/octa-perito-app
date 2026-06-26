"use client";

import { useFormStatus } from "react-dom";

type DangerActionButtonProps = {
  action: () => void | Promise<void>;
  label: string;
  pendingLabel?: string;
  confirmation: string;
  compact?: boolean;
  fullWidth?: boolean;
};

function SubmitDangerButton({
  label,
  pendingLabel,
  compact,
  fullWidth,
}: Omit<DangerActionButtonProps, "action" | "confirmation">) {
  const { pending } = useFormStatus();
  const classes = [
    "button",
    "button-danger",
    compact ? "button-small" : "",
    fullWidth ? "button-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="submit" disabled={pending}>
      {pending ? pendingLabel || "Excluindo..." : label}
    </button>
  );
}

export function DangerActionButton({
  action,
  label,
  pendingLabel,
  confirmation,
  compact = false,
  fullWidth = false,
}: DangerActionButtonProps) {
  return (
    <form
      action={action}
      className="danger-action-form"
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <SubmitDangerButton
        label={label}
        pendingLabel={pendingLabel}
        compact={compact}
        fullWidth={fullWidth}
      />
    </form>
  );
}
