import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { createAdminClient } from "@/lib/supabase/admin";

type PurchaseSuccessProps = {
  searchParams: Promise<{ session?: string; error?: string; success?: string }>;
};

export const dynamic = "force-dynamic";

type PurchaseSession = {
  id: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  organization_name: string;
  plan_code: string | null;
  amount_cents: number | null;
  organization_id: string | null;
  owner_user_id: string | null;
  paid_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const statusLabels: Record<string, string> = {
  pending: "Aguardando pagamento",
  checkout_created: "Checkout criado",
  paid: "Pagamento confirmado",
  provisioned: "Acesso liberado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function money(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function planLabel(planCode?: string | null) {
  const normalized = (planCode || "").toLowerCase();
  if (normalized.includes("anual") || normalized.includes("annual")) return "Plano anual";
  if (normalized.includes("teste")) return "Plano teste";
  return "Plano mensal";
}

async function loadPurchaseSession(sessionId?: string) {
  if (!sessionId) return { sale: null, error: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sales_checkout_sessions")
    .select("id,status,buyer_name,buyer_email,organization_name,plan_code,amount_cents,organization_id,owner_user_id,paid_at,created_at,metadata")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) return { sale: null, error: error.message };
  return { sale: (data as PurchaseSession | null) || null, error: null };
}

export default async function PurchaseSuccessPage({ searchParams }: PurchaseSuccessProps) {
  const params = await searchParams;
  const sessionId = String(params.session || "").trim();
  const { sale, error } = await loadPurchaseSession(sessionId);
  const email = sale?.buyer_email || "";
  const status = sale?.status || "pending";
  const accessReady = status === "provisioned" || Boolean(sale?.organization_id);
  const canRequestPassword = Boolean(email) && (accessReady || Boolean(sale?.owner_user_id));
  const returnTo = `/compra/sucesso?session=${encodeURIComponent(sessionId)}`;

  return (
    <main className="purchase-success-page">
      <section className="card purchase-success-card">
        <p className="eyebrow">OCTA Perito</p>
        <h1>{accessReady ? "Acesso liberado" : "Compra recebida"}</h1>
        {params.error && <div className="notice notice-error">{params.error}</div>}
        {params.success && <div className="notice notice-success">{params.success}</div>}
        {error && <div className="notice notice-error">Nao foi possivel consultar a compra: {error}</div>}
        {!sale && !error && (
          <div className="notice notice-neutral">Nao localizamos a compra nesta tela. Confira o e-mail usado no pagamento.</div>
        )}
        <p>
          {accessReady
            ? "Seu escritorio ja foi criado. Defina sua senha pelo link de acesso e entre no painel do OCTA Perito."
            : "Assim que a Abacate Pay confirmar o pagamento, criaremos o escritorio e liberaremos o acesso do comprador."}
        </p>
        {sale && (
          <div className="purchase-success-summary">
            <div><span>Status</span><strong>{statusLabels[status] || status}</strong></div>
            <div><span>Plano</span><strong>{planLabel(sale.plan_code)}</strong></div>
            <div><span>Valor</span><strong>{money(sale.amount_cents)}</strong></div>
            <div><span>E-mail de acesso</span><strong>{sale.buyer_email}</strong></div>
            <div><span>Escritorio</span><strong>{sale.organization_name}</strong></div>
          </div>
        )}
        {canRequestPassword && (
          <form action={requestPasswordResetAction} className="purchase-access-form">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="redirect_to" value={returnTo} />
            <SubmitButton pendingText="Enviando link..." className="button button-primary">
              Enviar link para definir senha
            </SubmitButton>
          </form>
        )}
        {sale && !accessReady && (
          <p className="purchase-success-note">
            Se voce acabou de pagar, aguarde alguns segundos e atualize a pagina. O webhook da Abacate Pay pode levar um pequeno intervalo para liberar o escritorio.
          </p>
        )}
        <div className="purchase-success-actions">
          <Link className="button button-primary" href="/login">Ir para o login</Link>
          {sessionId && <Link className="button button-secondary" href={returnTo}>Atualizar status</Link>}
          {canRequestPassword && <Link className="button button-secondary" href={`/recuperar-senha?email=${encodeURIComponent(email)}`}>Definir senha manualmente</Link>}
        </div>
      </section>
    </main>
  );
}
