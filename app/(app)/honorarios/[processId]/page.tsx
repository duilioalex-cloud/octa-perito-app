import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { SubmitButton } from "@/components/submit-button";
import { DangerActionButton } from "@/components/danger-action-button";
import {
  createFeeTransactionAction,
  deleteFeeTransactionAction,
  savePrimaryFeeAction,
  updateFeeTransactionStatusAction,
} from "@/app/actions/fees";
import {
  FEE_STATUS_OPTIONS,
  FEE_TYPE_OPTIONS,
  FUNDING_MODE_OPTIONS,
  RESPONSIBILITY_OPTIONS,
  TRANSACTION_STATUS_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  feeStatusLabel,
  feeTypeLabel,
  financeStatusClass,
  fundingModeLabel,
  moneyInputValue,
  responsibilityLabel,
  transactionStatusLabel,
  transactionTypeLabel,
} from "@/lib/finance-options";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/process-options";

export const metadata = { title: "Honorários do processo" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ProcessFeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ processId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { processId } = await params;
  const query = await searchParams;
  const organization = await requireCurrentOrganization("finance:view");
  const supabase = await createClient();

  const [{ data: process }, { data: fee }, { data: summary }] = await Promise.all([
    supabase.from("processes").select("id,process_number,subject,plaintiff,defendant,court,district,division,status,expertise_type").eq("id", processId).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_fees").select("*").eq("process_id", processId).eq("organization_id", organization.id).eq("is_primary", true).neq("status", "cancelled").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("process_financial_summary").select("*").eq("process_id", processId).eq("organization_id", organization.id).maybeSingle(),
  ]);
  if (!process) notFound();

  const { data: transactions } = fee
    ? await supabase.from("fee_transactions").select("*").eq("fee_id", fee.id).eq("organization_id", organization.id).order("occurred_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
    : { data: [] };

  const canDelete = ["owner", "admin"].includes(organization.role);
  const saveFee = savePrimaryFeeAction.bind(null, processId, fee?.id || null);
  const createTransaction = fee ? createFeeTransactionAction.bind(null, processId, fee.id) : null;
  const approved = num(summary?.approved_total);
  const deposited = num(summary?.deposited_total);
  const depositBalance = num(summary?.deposit_balance);
  const received = num(summary?.received_total);
  const withheld = num(summary?.withheld_total);
  const pendingDeposit = Math.max(approved - deposited, 0);
  const pendingRelease = Math.max(depositBalance, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">HONORÁRIOS DO PROCESSO</p>
          <h1>{process.process_number}</h1>
          <p>{process.subject || "Objeto ainda não informado"}</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/honorarios">Voltar</Link>
          <Link className="button button-secondary" href={`/processos/${processId}`}>Abrir processo</Link>
          <Link className="button button-primary" href={`/documentos/novo?process=${processId}`}>Gerar manifestação</Link>
        </div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}

      <section className="card process-summary-card finance-summary-card">
        <div><span>Proposto</span><strong>{formatCurrency(summary?.proposed_total)}</strong></div>
        <div><span>Homologado</span><strong>{formatCurrency(approved)}</strong></div>
        <div><span>Depositado</span><strong>{formatCurrency(deposited)}</strong></div>
        <div><span>Saldo judicial</span><strong>{formatCurrency(depositBalance)}</strong></div>
        <div><span>Levantado</span><strong>{formatCurrency(received)}</strong></div>
        <div><span>Retenções</span><strong>{formatCurrency(withheld)}</strong></div>
      </section>

      <section className="finance-alert-grid">
        <article className="card finance-alert-card"><span>Aguardando depósito</span><strong>{formatCurrency(pendingDeposit)}</strong><small>Diferença entre homologado e depositado</small></article>
        <article className="card finance-alert-card"><span>Disponível para levantamento</span><strong>{formatCurrency(pendingRelease)}</strong><small>Saldo confirmado ainda não levantado</small></article>
        <article className="card finance-alert-card"><span>Situação financeira</span><b className={financeStatusClass(summary?.financial_status)}>{feeStatusLabel(summary?.financial_status)}</b><small>Atualizada automaticamente pelos lançamentos</small></article>
      </section>

      <section className="dashboard-grid finance-main-grid">
        <article className="card panel">
          <div className="panel-header"><div><h2>Configuração dos honorários</h2><span>{fee ? "Registro principal do processo" : "Cadastre os honorários deste processo"}</span></div>{fee && <b className={financeStatusClass(fee.status)}>{feeStatusLabel(fee.status)}</b>}</div>
          <form className="form-grid" action={saveFee}>
            <label className="field full"><span>Título do controle</span><input className="input" name="title" defaultValue={fee?.title || "Honorários periciais"} required /></label>
            <label className="field"><span>Tipo de honorário</span><select className="select" name="fee_type" defaultValue={fee?.fee_type || "judicial_expert"}>{FEE_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Situação</span><select className="select" name="status" defaultValue={fee?.status || "not_defined"}>{FEE_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Modalidade de custeio</span><select className="select" name="funding_mode" defaultValue={fee?.funding_mode || "court_deposit"}>{FUNDING_MODE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Responsabilidade</span><select className="select" name="responsibility_type" defaultValue={fee?.responsibility_type || "not_defined"}>{RESPONSIBILITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field full"><span>Parte ou responsável pelo pagamento</span><input className="input" name="responsible_party" defaultValue={fee?.responsible_party || ""} placeholder="Ex.: partes em rateio igual ou Sistema AJ/TJMG" /></label>

            <div className="full finance-form-divider"><strong>Valores</strong><span>O sistema mantém proposta, homologação, depósito e recebimento como etapas distintas.</span></div>
            <label className="field"><span>Valor inicialmente arbitrado</span><input className="input" name="initial_arbitrated_amount" inputMode="decimal" defaultValue={moneyInputValue(fee?.initial_arbitrated_amount)} placeholder="0,00" /></label>
            <label className="field"><span>Valor proposto pelo perito</span><input className="input" name="proposed_amount" inputMode="decimal" defaultValue={moneyInputValue(fee?.proposed_amount)} placeholder="0,00" /></label>
            <label className="field"><span>Valor homologado</span><input className="input" name="approved_amount" inputMode="decimal" defaultValue={moneyInputValue(fee?.approved_amount)} placeholder="0,00" /></label>
            <label className="field"><span>Adiantamento solicitado (%)</span><input className="input" name="advance_percentage" inputMode="decimal" defaultValue={moneyInputValue(fee?.advance_percentage)} placeholder="50,00" /></label>
            <label className="field"><span>Saldo inicial depositado</span><input className="input" name="opening_deposited_amount" inputMode="decimal" defaultValue={moneyInputValue(fee?.opening_deposited_amount)} placeholder="0,00" /></label>
            <label className="field"><span>Saldo inicial recebido</span><input className="input" name="opening_received_amount" inputMode="decimal" defaultValue={moneyInputValue(fee?.opening_received_amount)} placeholder="0,00" /></label>

            <div className="full finance-form-divider"><strong>Datas de controle</strong><span>Use somente datas efetivamente verificadas nos autos.</span></div>
            <label className="field"><span>Proposta apresentada em</span><input className="input" type="date" name="proposed_at" defaultValue={fee?.proposed_at || ""} /></label>
            <label className="field"><span>Homologação em</span><input className="input" type="date" name="approved_at" defaultValue={fee?.approved_at || ""} /></label>
            <label className="field"><span>Prazo para depósito</span><input className="input" type="date" name="deposit_due_at" defaultValue={fee?.deposit_due_at || ""} /></label>
            <label className="field"><span>Levantamento solicitado em</span><input className="input" type="date" name="release_requested_at" defaultValue={fee?.release_requested_at || ""} /></label>
            <label className="field"><span>Encerramento financeiro</span><input className="input" type="date" name="closed_at" defaultValue={fee?.closed_at || ""} /></label>
            <label className="field full"><span>Observações</span><textarea className="textarea" name="notes" defaultValue={fee?.notes || ""} placeholder="Registre decisões, condições de pagamento e pendências relevantes." /></label>
            <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Salvando...">{fee ? "Salvar alterações" : "Criar controle de honorários"}</SubmitButton></div>
          </form>
        </article>

        <aside className="process-side-stack">
          <article className="card panel">
            <div className="panel-header"><h2>Dados do processo</h2></div>
            <div className="detail-grid detail-grid-single finance-process-facts">
              <div className="detail-item"><span>Autor</span><strong>{process.plaintiff || "Não informado"}</strong></div>
              <div className="detail-item"><span>Réu</span><strong>{process.defendant || "Não informado"}</strong></div>
              <div className="detail-item"><span>Órgão</span><strong>{[process.court, process.division, process.district].filter(Boolean).join(" · ") || "Não informado"}</strong></div>
            </div>
          </article>

          {fee && (
            <article className="card panel">
              <div className="panel-header"><h2>Resumo cadastral</h2></div>
              <div className="finance-definition-list">
                <div><span>Tipo</span><strong>{feeTypeLabel(fee.fee_type)}</strong></div>
                <div><span>Custeio</span><strong>{fundingModeLabel(fee.funding_mode)}</strong></div>
                <div><span>Responsabilidade</span><strong>{responsibilityLabel(fee.responsibility_type)}</strong></div>
                <div><span>Proposta</span><strong>{formatDate(fee.proposed_at)}</strong></div>
                <div><span>Homologação</span><strong>{formatDate(fee.approved_at)}</strong></div>
                <div><span>Última atualização</span><strong>{formatDateTime(fee.updated_at)}</strong></div>
              </div>
            </article>
          )}
        </aside>
      </section>

      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><div><h2>Movimentações financeiras</h2><span>Depósitos, levantamentos, devoluções e ajustes</span></div><span>{transactions?.length || 0} lançamento(s)</span></div>
        {!fee ? (
          <div className="empty-state"><strong>Crie primeiro o controle de honorários.</strong>Após salvar os valores principais, o registro de depósitos e levantamentos será liberado.</div>
        ) : (
          <>
            {!transactions?.length ? (
              <div className="empty-state"><strong>Nenhuma movimentação registrada.</strong>Use o formulário abaixo para cadastrar o primeiro depósito ou levantamento.</div>
            ) : (
              <div className="finance-transaction-list">
                {transactions.map((transaction) => {
                  const confirmAction = updateFeeTransactionStatusAction.bind(null, processId, transaction.id, "confirmed");
                  const cancelAction = updateFeeTransactionStatusAction.bind(null, processId, transaction.id, "cancelled");
                  const deleteAction = deleteFeeTransactionAction.bind(null, processId, transaction.id);
                  return (
                    <article className="finance-transaction-row" key={transaction.id}>
                      <div className={`transaction-icon transaction-${transaction.transaction_type}`} aria-hidden="true">{transaction.transaction_type === "deposit" ? "+" : transaction.transaction_type === "release" ? "↗" : transaction.transaction_type === "refund" ? "↩" : "±"}</div>
                      <div className="finance-transaction-main"><strong>{transactionTypeLabel(transaction.transaction_type)}</strong><span>{transaction.reference_number || transaction.payment_method || "Sem referência"}</span>{transaction.notes && <p>{transaction.notes}</p>}</div>
                      <div><span>Valor bruto</span><strong>{formatCurrency(transaction.amount)}</strong></div>
                      <div><span>Valor líquido</span><strong>{formatCurrency(transaction.net_amount)}</strong>{num(transaction.withheld_amount) > 0 && <small>Retido: {formatCurrency(transaction.withheld_amount)}</small>}</div>
                      <div><span>Data</span><strong>{formatDate(transaction.occurred_at || transaction.due_at)}</strong></div>
                      <div><span>Situação</span><b className={`transaction-status transaction-status-${transaction.status}`}>{transactionStatusLabel(transaction.status)}</b></div>
                      <div className="finance-transaction-actions">
                        {transaction.status !== "confirmed" && transaction.status !== "cancelled" && <form action={confirmAction}><button className="button button-ghost button-small" type="submit">Confirmar</button></form>}
                        {transaction.status !== "cancelled" && transaction.status !== "confirmed" && <form action={cancelAction}><button className="button button-ghost button-small" type="submit">Cancelar</button></form>}
                        {canDelete && <DangerActionButton action={deleteAction} label="Excluir" pendingLabel="Excluindo..." compact confirmation={`Excluir definitivamente esta movimentação de ${formatCurrency(transaction.amount)}?`} />}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <details className="report-add-panel finance-add-panel" open={!transactions?.length}>
              <summary>Adicionar movimentação</summary>
              <form className="form-grid" action={createTransaction!}>
                <label className="field"><span>Tipo</span><select className="select" name="transaction_type" defaultValue="deposit">{TRANSACTION_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="field"><span>Situação</span><select className="select" name="status" defaultValue="confirmed">{TRANSACTION_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="field"><span>Valor bruto</span><input className="input" name="amount" inputMode="decimal" placeholder="0,00" required /></label>
                <label className="field"><span>Valor líquido do levantamento</span><input className="input" name="net_amount" inputMode="decimal" placeholder="Preencher somente em levantamento" /></label>
                <label className="field"><span>Retenções</span><input className="input" name="withheld_amount" inputMode="decimal" placeholder="0,00" /></label>
                <label className="field"><span>Data efetiva</span><input className="input" name="occurred_at" type="date" /></label>
                <label className="field"><span>Data prevista</span><input className="input" name="due_at" type="date" /></label>
                <label className="field"><span>Forma de pagamento</span><input className="input" name="payment_method" placeholder="Ex.: depósito judicial, PIX, TED" /></label>
                <label className="field"><span>Alvará / referência</span><input className="input" name="reference_number" placeholder="Número do alvará ou comprovante" /></label>
                <label className="field"><span>Ajuste no saldo depositado</span><input className="input" name="deposit_delta" inputMode="decimal" placeholder="Somente para tipo Ajuste" /></label>
                <label className="field"><span>Ajuste no recebido</span><input className="input" name="received_delta" inputMode="decimal" placeholder="Somente para tipo Ajuste" /></label>
                <label className="field full"><span>Observações</span><textarea className="textarea textarea-small" name="notes" /></label>
                <div className="notice notice-neutral full">Para depósitos e levantamentos, os saldos são calculados automaticamente. Os campos de ajuste manual são usados somente quando o tipo selecionado for <strong>Ajuste de saldo</strong>.</div>
                <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Registrando...">Registrar movimentação</SubmitButton></div>
              </form>
            </details>
          </>
        )}
      </section>
    </>
  );
}
