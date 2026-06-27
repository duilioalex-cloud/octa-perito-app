import type { OrganizationBillingState } from "@/lib/billing";

function formatDate(value?: string | null) {
  if (!value) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function BillingBlockedPanel({
  organizationName,
  billingState,
}: {
  organizationName: string;
  billingState: OrganizationBillingState;
}) {
  return (
    <section className="page-section billing-blocked-page">
      <div className="card billing-blocked-card">
        <div>
          <p className="eyebrow">Assinatura</p>
          <h1>Acesso temporariamente bloqueado</h1>
          <p>
            O escritorio {organizationName} esta com a assinatura bloqueada. Assim que o pagamento for regularizado,
            o acesso aos modulos sera liberado novamente pelo administrador da plataforma.
          </p>
        </div>

        <div className="billing-blocked-grid">
          <div>
            <span>Status</span>
            <strong>Bloqueado</strong>
          </div>
          <div>
            <span>Bloqueado em</span>
            <strong>{formatDate(billingState.billing_blocked_at)}</strong>
          </div>
          <div>
            <span>Motivo</span>
            <strong>{billingState.billing_block_reason || "Pagamento pendente"}</strong>
          </div>
        </div>

        <div className="notice notice-error billing-blocked-note">
          Se o pagamento ja foi realizado, aguarde a conciliacao ou fale com o suporte OCTA para liberar o acesso.
        </div>
      </div>
    </section>
  );
}
