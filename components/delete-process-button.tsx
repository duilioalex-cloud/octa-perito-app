"use client";

import { DangerActionButton } from "@/components/danger-action-button";

type DeleteProcessButtonProps = {
  action: () => void | Promise<void>;
  processNumber: string;
  compact?: boolean;
};

export function DeleteProcessButton({ action, processNumber, compact = false }: DeleteProcessButtonProps) {
  return (
    <DangerActionButton
      action={action}
      label={compact ? "Excluir" : "Excluir processo"}
      pendingLabel="Excluindo..."
      compact={compact}
      confirmation={`Excluir definitivamente o processo ${processNumber}?\n\nPrazos, histórico, petições, laudos, versões e anexos vinculados também serão removidos. Esta ação não pode ser desfeita.`}
    />
  );
}
