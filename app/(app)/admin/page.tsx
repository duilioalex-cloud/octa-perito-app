import Link from "next/link";
import { processPaidCheckoutSessionAction, updateOrganizationBillingStatusAction } from "@/app/actions/admin";
import { billingStatusLabels, normalizeBillingStatus, type BillingStatus } from "@/lib/billing";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  owner_id: string | null;
  created_at: string;
  billing_status: string | null;
  billing_plan: string | null;
  billing_blocked_at: string | null;
  billing_block_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_trial_ends_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type SubscriptionRow = {
  id: string;
  organization_id: string;
  status: string | null;
  plan_code: string | null;
  amount_cents: number | null;
  current_period_ends_at: string | null;
  provider: string | null;
};

type PaymentRow = {
  organization_id: string;
  status: string | null;
  amount_cents: number | null;
  paid_at: string | null;
  due_at: string | null;
};

type MemberRow = {
  organization_id: string;
  user_id: string | null;
  invited_email: string | null;
};

type SaleRow = {
  id: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  organization_name: string;
  plan_code: string | null;
  amount_cents: number | null;
  checkout_url: string | null;
  organization_id: string | null;
  paid_at: string | null;
  failed_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  organization_id: string | null;
  event_type: string;
  provider: string | null;
  provider_event_id: string | null;
  created_at: string;
};

const saleStatusLabels: Record<string, string> = {
  pending: "Pendente",
  checkout_created: "Checkout criado",
  paid: "Pago",
  provisioned: "Provisionado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function formatCurrencyFromCents(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: BillingStatus) {
  return `admin-billing-status admin-billing-status-${status}`;
}

function saleStatusClass(status: string) {
  return `admin-sale-status admin-sale-status-${status}`;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: organizationsData, error: organizationsError } = await admin
    .from("organizations")
    .select(
      "id,name,slug,document,owner_id,created_at,billing_status,billing_plan,billing_blocked_at,billing_block_reason,billing_current_period_ends_at,billing_trial_ends_at",
    )
    .order("created_at", { ascending: false });

  const organizations = (organizationsData ?? []) as OrganizationRow[];
  const ownerIds = Array.from(new Set(organizations.map((org) => org.owner_id).filter(Boolean))) as string[];

  const [profilesResult, subscriptionsResult, paymentsResult, membersResult, salesResult, eventsResult] = await Promise.all([
    ownerIds.length
      ? admin.from("profiles").select("id,full_name,email").in("id", ownerIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    admin
      .from("subscriptions")
      .select("id,organization_id,status,plan_code,amount_cents,current_period_ends_at,provider")
      .order("created_at", { ascending: false }),
    admin.from("payments").select("organization_id,status,amount_cents,paid_at,due_at").order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id,user_id,invited_email"),
    admin
      .from("sales_checkout_sessions")
      .select("id,status,buyer_name,buyer_email,organization_name,plan_code,amount_cents,checkout_url,organization_id,paid_at,failed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("subscription_events")
      .select("id,organization_id,event_type,provider,provider_event_id,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const members = (membersResult.data ?? []) as MemberRow[];
  const sales = (salesResult.data ?? []) as SaleRow[];
  const events = (eventsResult.data ?? []) as EventRow[];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));
  const subscriptionByOrg = new Map<string, SubscriptionRow>();
  for (const subscription of subscriptions) {
    if (!subscriptionByOrg.has(subscription.organization_id)) subscriptionByOrg.set(subscription.organization_id, subscription);
  }

  const lastPaymentByOrg = new Map<string, PaymentRow>();
  for (const payment of payments) {
    if (!lastPaymentByOrg.has(payment.organization_id)) lastPaymentByOrg.set(payment.organization_id, payment);
  }

  const memberCountByOrg = new Map<string, number>();
  for (const member of members) {
    memberCountByOrg.set(member.organization_id, (memberCountByOrg.get(member.organization_id) ?? 0) + 1);
  }

  const activeCount = organizations.filter((org) => ["active", "trialing"].includes(normalizeBillingStatus(org.billing_status))).length;
  const blockedCount = organizations.filter((org) => normalizeBillingStatus(org.billing_status) === "blocked" || org.billing_blocked_at).length;
  const pastDueCount = organizations.filter((org) => normalizeBillingStatus(org.billing_status) === "past_due").length;
  const monthlyRevenueCents = subscriptions
    .filter((subscription) => ["active", "trialing", "past_due"].includes(normalizeBillingStatus(subscription.status)))
    .reduce((sum, subscription) => sum + (subscription.amount_cents ?? 0), 0);
  const loadError =
    organizationsError?.message ||
    profilesResult.error?.message ||
    subscriptionsResult.error?.message ||
    paymentsResult.error?.message ||
    membersResult.error?.message ||
    salesResult.error?.message ||
    eventsResult.error?.message;

  return (
    <section className="page-section admin-page">
      <div className="page-header admin-page-header">
        <div>
          <p className="eyebrow">Admin SaaS</p>
          <h1>Painel administrativo</h1>
          <p>Controle clientes, assinaturas, compras, bloqueios e liberacoes do OCTA Perito.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/configuracoes/usuarios">Usuarios do escritorio</Link>
          <Link className="button button-primary" href="/dashboard">Voltar ao painel</Link>
        </div>
      </div>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}
      {loadError && (
        <div className="notice notice-error">
          Nao foi possivel carregar todos os dados administrativos. Confirme se as migracoes 011 e 012 foram executadas
          no Supabase. Detalhe: {loadError}
        </div>
      )}

      <section className="admin-summary-grid">
        <article className="card admin-summary-card"><span>Clientes</span><strong>{organizations.length}</strong><small>Escritorios cadastrados</small></article>
        <article className="card admin-summary-card"><span>Ativos</span><strong>{activeCount}</strong><small>Pagantes ou em teste</small></article>
        <article className="card admin-summary-card"><span>Atencao</span><strong>{pastDueCount + blockedCount}</strong><small>Vencidos ou bloqueados</small></article>
        <article className="card admin-summary-card"><span>Receita mensal</span><strong>{formatCurrencyFromCents(monthlyRevenueCents)}</strong><small>Base informada nas assinaturas</small></article>
      </section>

      <section className="card panel admin-control-panel">
        <div className="panel-header">
          <div>
            <h2>Clientes e assinaturas</h2>
            <p>Bloqueie por falta de pagamento ou libere assim que a cobranca for regularizada.</p>
          </div>
        </div>

        <div className="responsive-table admin-table">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Responsavel</th>
                <th>Assinatura</th>
                <th>Financeiro</th>
                <th>Equipe</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => {
                const status = normalizeBillingStatus(org.billing_status);
                const owner = org.owner_id ? profileById.get(org.owner_id) : null;
                const subscription = subscriptionByOrg.get(org.id);
                const payment = lastPaymentByOrg.get(org.id);

                return (
                  <tr key={org.id}>
                    <td>
                      <strong className="admin-client-name">{org.name}</strong>
                      <span className="admin-client-meta">{org.slug}</span>
                      {org.document && <span className="admin-client-meta">{org.document}</span>}
                    </td>
                    <td>
                      <strong className="admin-client-owner">{owner?.full_name || "Nao informado"}</strong>
                      <span className="admin-client-meta">{owner?.email || "-"}</span>
                    </td>
                    <td>
                      <span className={statusClass(status)}>{billingStatusLabels[status]}</span>
                      <span className="admin-client-meta">Plano: {org.billing_plan || subscription?.plan_code || "manual"}</span>
                      <span className="admin-client-meta">Renova: {formatDate(org.billing_current_period_ends_at || subscription?.current_period_ends_at)}</span>
                      {org.billing_block_reason && <span className="admin-client-warning">{org.billing_block_reason}</span>}
                    </td>
                    <td>
                      <strong className="admin-money">{formatCurrencyFromCents(subscription?.amount_cents)}</strong>
                      <span className="admin-client-meta">Ultimo pagamento: {formatDate(payment?.paid_at || payment?.due_at)}</span>
                      <span className="admin-client-meta">Gateway: {subscription?.provider || "manual"}</span>
                    </td>
                    <td>
                      <strong className="admin-client-owner">{memberCountByOrg.get(org.id) ?? 0}</strong>
                      <span className="admin-client-meta">Criado em {formatDate(org.created_at)}</span>
                    </td>
                    <td>
                      <form action={updateOrganizationBillingStatusAction} className="admin-status-form">
                        <input type="hidden" name="organization_id" value={org.id} />
                        <label className="field">
                          <span>Status</span>
                          <select className="select select-small" name="billing_status" defaultValue={status}>
                            <option value="trialing">Teste</option>
                            <option value="active">Ativo</option>
                            <option value="past_due">Vencido</option>
                            <option value="blocked">Bloqueado</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Observacao</span>
                          <input
                            className="input input-small"
                            name="billing_block_reason"
                            defaultValue={org.billing_block_reason || ""}
                            placeholder="Ex.: pagamento pendente"
                          />
                        </label>
                        <button className="button button-primary button-small" type="submit">Salvar</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {!organizations.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <strong>Nenhum cliente encontrado</strong>
                      <span>Os escritorios cadastrados aparecerao aqui.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel admin-control-panel">
        <div className="panel-header">
          <div>
            <h2>Compras recentes</h2>
            <p>Pedidos criados pelo site de vendas e processados pela Abacate Pay.</p>
          </div>
        </div>

        <div className="responsive-table admin-sales-table">
          <table>
            <thead>
              <tr>
                <th>Comprador</th>
                <th>Escritorio</th>
                <th>Status</th>
                <th>Plano</th>
                <th>Data</th>
                <th>Checkout</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const linkedOrganization = sale.organization_id ? organizationById.get(sale.organization_id) : null;
                return (
                  <tr key={sale.id}>
                    <td>
                      <strong className="admin-client-name">{sale.buyer_name}</strong>
                      <span className="admin-client-meta">{sale.buyer_email}</span>
                    </td>
                    <td>
                      <strong className="admin-client-owner">{linkedOrganization?.name || sale.organization_name}</strong>
                      <span className="admin-client-meta">{sale.organization_id ? "Cliente criado" : "Aguardando provisionamento"}</span>
                    </td>
                    <td>
                      <span className={saleStatusClass(sale.status)}>{saleStatusLabels[sale.status] || sale.status}</span>
                    </td>
                    <td>
                      <strong className="admin-money">{formatCurrencyFromCents(sale.amount_cents)}</strong>
                      <span className="admin-client-meta">{sale.plan_code || "octa-perito-mensal"}</span>
                    </td>
                    <td>
                      <strong className="admin-client-owner">{formatDate(sale.paid_at || sale.failed_at || sale.created_at)}</strong>
                    </td>
                    <td>
                      {sale.checkout_url ? (
                        <a className="button button-secondary button-small" href={sale.checkout_url} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {sale.status !== "provisioned" ? (
                        <form action={processPaidCheckoutSessionAction}>
                          <input type="hidden" name="sale_id" value={sale.id} />
                          <button className="button button-primary button-small" type="submit">Processar pago</button>
                        </form>
                      ) : (
                        <span className="admin-client-meta">Concluido</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!sales.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <strong>Nenhuma compra registrada</strong>
                      <span>As vendas criadas pelo endpoint de checkout aparecerao aqui.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card panel admin-control-panel">
        <div className="panel-header">
          <div>
            <h2>Eventos recentes</h2>
            <p>Ultimos webhooks e acoes manuais registradas no controle de assinaturas.</p>
          </div>
        </div>

        <div className="responsive-table admin-sales-table">
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Gateway</th>
                <th>Referencia</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const organization = event.organization_id ? organizationById.get(event.organization_id) : null;
                return (
                  <tr key={event.id}>
                    <td><strong className="admin-client-name">{event.event_type}</strong></td>
                    <td>
                      <strong className="admin-client-owner">{organization?.name || "Nao vinculado"}</strong>
                      <span className="admin-client-meta">{event.organization_id || "-"}</span>
                    </td>
                    <td><span className="admin-client-meta">{event.provider || "manual"}</span></td>
                    <td><span className="admin-client-meta">{event.provider_event_id || "-"}</span></td>
                    <td><strong className="admin-client-owner">{formatDate(event.created_at)}</strong></td>
                  </tr>
                );
              })}
              {!events.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>Nenhum evento registrado</strong>
                      <span>Webhooks e acoes administrativas aparecerao aqui.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
