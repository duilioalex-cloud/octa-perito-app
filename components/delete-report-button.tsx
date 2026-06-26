"use client";

import { DangerActionButton } from "@/components/danger-action-button";

type DeleteReportButtonProps = {
  action: () => void | Promise<void>;
  reportTitle: string;
  compact?: boolean;
};

export function DeleteReportButton({ action, reportTitle, compact = false }: DeleteReportButtonProps) {
  return (
    <DangerActionButton
      action={action}
      label={compact ? "Excluir" : "Excluir laudo"}
      pendingLabel="Excluindo..."
      compact={compact}
      confirmation={`Excluir definitivamente o laudo “${reportTitle}”?\n\nCapítulos, quesitos, versões, fontes, equipamentos e anexos vinculados também serão removidos. Esta ação não pode ser desfeita.`}
    />
  );
}
