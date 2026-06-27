import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { SubmitButton } from "@/components/submit-button";
import { DangerActionButton } from "@/components/danger-action-button";
import {
  deleteExpenseAction,
  deleteTripAction,
  saveExpenseAction,
  saveTripAction,
  updateExpensePaymentStatusAction,
  updateExpenseReimbursementStatusAction,
  updateTripStatusAction,
} from "@/app/actions/expenses";
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_PAYMENT_STATUS_OPTIONS,
  REIMBURSEMENT_STATUS_OPTIONS,
  TRIP_STATUS_OPTIONS,
  expenseCategoryLabel,
  expensePaymentStatusLabel,
  expenseStatusClass,
  reimbursementStatusLabel,
  tripStatusClass,
  tripStatusLabel,
} from "@/lib/expense-options";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/process-options";
import { moneyInputValue } from "@/lib/finance-options";
import { toBrasiliaDateTimeInput, todayInBrasilia } from "@/lib/datetime";

export const metadata = { title: "Custos do processo" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateTimeLocal(value?: string | null) {
  return toBrasiliaDateTimeInput(value);
}

type Trip = {
  id: string;
  title: string;
  status: string;
  origin_city: string | null;
  origin_state: string | null;
  destination_city: string | null;
  destination_state: string | null;
  departure_at: string | null;
  return_at: string | null;
  one_way_km: number | string | null;
  total_km: number | string | null;
  trips_count: number | string | null;
  fuel_efficiency_km_l: number | string | null;
  fuel_price_per_liter: number | string | null;
  vehicle_cost_per_km: number | string | null;
  toll_amount: number | string | null;
  lodging_amount: number | string | null;
  meal_amount: number | string | null;
  other_amount: number | string | null;
  travel_hours: number | string | null;
  hourly_rate: number | string | null;
  fuel_cost: number | string | null;
  vehicle_operating_cost: number | string | null;
  travel_time_cost: number | string | null;
  total_cost: number | string | null;
  notes: string | null;
  updated_at: string;
};

type Expense = {
  id: string;
  trip_id: string | null;
  category: string;
  description: string;
  expense_date: string;
  quantity: number | string;
  unit_amount: number | string;
  total_amount: number | string;
  payment_method: string | null;
  payment_status: string;
  paid_at: string | null;
  is_estimated: boolean;
  is_reimbursable: boolean;
  reimbursement_status: string;
  vendor_name: string | null;
  document_number: string | null;
  notes: string | null;
  updated_at: string;
};

export default async function ProcessExpensesPage({ params, searchParams }: { params: Promise<{ processId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { processId } = await params;
  const query = await searchParams;
  const organization = await requireCurrentOrganization("finance:view");
  const supabase = await createClient();

  const [{ data: process }, { data: summary }, { data: trips }, { data: expenses }] = await Promise.all([
    supabase.from("processes").select("id,process_number,subject,plaintiff,defendant,court,division,district").eq("id", processId).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_financial_summary").select("approved_total,received_total,expenses_forecast_total,expenses_paid_total,reimbursable_pending_total,trip_cost_forecast_total,trip_cost_completed_total").eq("process_id", processId).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_trips").select("*").eq("process_id", processId).eq("organization_id", organization.id).order("departure_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("process_expenses").select("*").eq("process_id", processId).eq("organization_id", organization.id).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  if (!process) notFound();
  const typedTrips = (trips || []) as Trip[];
  const typedExpenses = (expenses || []) as Expense[];
  const canDelete = ["owner", "admin"].includes(organization.role);

  const expenseForecast = num(summary?.expenses_forecast_total);
  const expensePaid = num(summary?.expenses_paid_total);
  const tripForecast = num(summary?.trip_cost_forecast_total);
  const tripCompleted = num(summary?.trip_cost_completed_total);
  const totalForecast = expenseForecast + tripForecast;
  const totalRealized = expensePaid + tripCompleted;
  const approved = num(summary?.approved_total);
  const received = num(summary?.received_total);

  const createTrip = saveTripAction.bind(null, processId, null);
  const createExpense = saveExpenseAction.bind(null, processId, null);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CUSTOS DO PROCESSO</p>
          <h1>{process.process_number}</h1>
          <p>{process.subject || "Objeto ainda não informado"}</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/despesas">Voltar</Link>
          <Link className="button button-secondary" href={`/honorarios/${processId}`}>Honorários</Link>
          <Link className="button button-primary" href={`/processos/${processId}`}>Abrir processo</Link>
        </div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}

      <section className="card process-summary-card expense-summary-card">
        <div><span>Custo previsto</span><strong>{formatCurrency(totalForecast)}</strong></div>
        <div><span>Custo realizado</span><strong>{formatCurrency(totalRealized)}</strong></div>
        <div><span>Reembolso pendente</span><strong>{formatCurrency(summary?.reimbursable_pending_total)}</strong></div>
        <div><span>Resultado previsto</span><strong>{formatCurrency(approved - totalForecast)}</strong></div>
        <div><span>Caixa realizado</span><strong>{formatCurrency(received - totalRealized)}</strong></div>
      </section>

      <section className="dashboard-grid expense-main-grid">
        <article className="card panel">
          <div className="panel-header"><div><h2>Deslocamentos periciais</h2><span>Combustível, uso do veículo, tempo técnico, pedágios e estadia</span></div><span>{typedTrips.length} item(ns)</span></div>
          {!typedTrips.length ? (
            <div className="empty-state"><strong>Nenhum deslocamento cadastrado.</strong>Use o formulário abaixo para calcular a primeira viagem vinculada a este processo.</div>
          ) : (
            <div className="trip-list">
              {typedTrips.map((trip) => {
                const saveTrip = saveTripAction.bind(null, processId, trip.id);
                const confirmTrip = updateTripStatusAction.bind(null, processId, trip.id, "confirmed");
                const completeTrip = updateTripStatusAction.bind(null, processId, trip.id, "completed");
                const cancelTrip = updateTripStatusAction.bind(null, processId, trip.id, "cancelled");
                const deleteTrip = deleteTripAction.bind(null, processId, trip.id);
                return (
                  <article className="trip-card" key={trip.id}>
                    <div className="trip-card-header">
                      <div><strong>{trip.title}</strong><span>{[trip.origin_city, trip.origin_state].filter(Boolean).join("/") || "Origem não informada"} → {[trip.destination_city, trip.destination_state].filter(Boolean).join("/") || "Destino não informado"}</span></div>
                      <div><b className={tripStatusClass(trip.status)}>{tripStatusLabel(trip.status)}</b><strong>{formatCurrency(trip.total_cost)}</strong></div>
                    </div>
                    <div className="trip-cost-grid">
                      <div><span>Distância total</span><strong>{num(trip.total_km).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km</strong></div>
                      <div><span>Combustível</span><strong>{formatCurrency(trip.fuel_cost)}</strong></div>
                      <div><span>Veículo</span><strong>{formatCurrency(trip.vehicle_operating_cost)}</strong></div>
                      <div><span>Tempo técnico</span><strong>{formatCurrency(trip.travel_time_cost)}</strong></div>
                      <div><span>Pedágio/estadia/outros</span><strong>{formatCurrency(num(trip.toll_amount) + num(trip.lodging_amount) + num(trip.meal_amount) + num(trip.other_amount))}</strong></div>
                      <div><span>Data</span><strong>{formatDateTime(trip.departure_at)}</strong></div>
                    </div>
                    {trip.notes && <p className="trip-notes">{trip.notes}</p>}
                    <div className="expense-row-actions">
                      {trip.status === "planned" && <form action={confirmTrip}><button className="button button-ghost button-small" type="submit">Confirmar</button></form>}
                      {trip.status !== "completed" && trip.status !== "cancelled" && <form action={completeTrip}><button className="button button-ghost button-small" type="submit">Concluir</button></form>}
                      {trip.status !== "cancelled" && trip.status !== "completed" && <form action={cancelTrip}><button className="button button-ghost button-small" type="submit">Cancelar</button></form>}
                      {canDelete && <DangerActionButton action={deleteTrip} label="Excluir" pendingLabel="Excluindo..." compact confirmation={`Excluir definitivamente o deslocamento “${trip.title}”?`} />}
                    </div>
                    <details className="inline-edit-panel">
                      <summary>Editar deslocamento</summary>
                      <TripForm action={saveTrip} trip={trip} submitLabel="Salvar deslocamento" />
                    </details>
                  </article>
                );
              })}
            </div>
          )}

          <details className="report-add-panel expense-add-panel" open={!typedTrips.length}>
            <summary>Adicionar deslocamento</summary>
            <TripForm action={createTrip} submitLabel="Calcular e salvar deslocamento" />
          </details>
        </article>

        <aside className="process-side-stack">
          <article className="card panel">
            <div className="panel-header"><h2>Resumo operacional</h2></div>
            <div className="finance-definition-list">
              <div><span>Despesas previstas</span><strong>{formatCurrency(expenseForecast)}</strong></div>
              <div><span>Despesas pagas</span><strong>{formatCurrency(expensePaid)}</strong></div>
              <div><span>Viagens previstas</span><strong>{formatCurrency(tripForecast)}</strong></div>
              <div><span>Viagens concluídas</span><strong>{formatCurrency(tripCompleted)}</strong></div>
              <div><span>Honorários homologados</span><strong>{formatCurrency(approved)}</strong></div>
              <div><span>Honorários levantados</span><strong>{formatCurrency(received)}</strong></div>
            </div>
          </article>
          <article className="card panel">
            <div className="panel-header"><h2>Dados do processo</h2></div>
            <div className="detail-grid detail-grid-single finance-process-facts">
              <div className="detail-item"><span>Autor</span><strong>{process.plaintiff || "Não informado"}</strong></div>
              <div className="detail-item"><span>Réu</span><strong>{process.defendant || "Não informado"}</strong></div>
              <div className="detail-item"><span>Órgão</span><strong>{[process.court, process.division, process.district].filter(Boolean).join(" · ") || "Não informado"}</strong></div>
            </div>
          </article>
        </aside>
      </section>

      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><div><h2>Despesas do processo</h2><span>Custos previstos, pendentes, pagos e reembolsáveis</span></div><span>{typedExpenses.length} item(ns)</span></div>
        {!typedExpenses.length ? (
          <div className="empty-state"><strong>Nenhuma despesa cadastrada.</strong>Registre combustível, pedágio, hospedagem, laboratório, drone, topografia e demais custos.</div>
        ) : (
          <div className="expense-list">
            {typedExpenses.map((expense) => {
              const saveExpense = saveExpenseAction.bind(null, processId, expense.id);
              const markPaid = updateExpensePaymentStatusAction.bind(null, processId, expense.id, "paid");
              const cancelExpense = updateExpensePaymentStatusAction.bind(null, processId, expense.id, "cancelled");
              const requestReimbursement = updateExpenseReimbursementStatusAction.bind(null, processId, expense.id, "requested");
              const approveReimbursement = updateExpenseReimbursementStatusAction.bind(null, processId, expense.id, "approved");
              const reimburse = updateExpenseReimbursementStatusAction.bind(null, processId, expense.id, "reimbursed");
              const deleteExpense = deleteExpenseAction.bind(null, processId, expense.id);
              const linkedTrip = typedTrips.find((trip) => trip.id === expense.trip_id);
              return (
                <article className="expense-card" key={expense.id}>
                  <div className="expense-card-main">
                    <div className="expense-category-icon" aria-hidden="true">{expense.category === "fuel" ? "⛽" : expense.category === "toll" ? "◫" : expense.category === "lodging" ? "⌂" : expense.category === "meal" ? "◉" : expense.category === "drone" ? "◇" : expense.category === "topography" ? "⌖" : "▦"}</div>
                    <div><strong>{expense.description}</strong><span>{expenseCategoryLabel(expense.category)} · {formatDate(expense.expense_date)}{linkedTrip ? ` · ${linkedTrip.title}` : ""}</span>{expense.vendor_name && <small>{expense.vendor_name}{expense.document_number ? ` · Documento ${expense.document_number}` : ""}</small>}</div>
                  </div>
                  <div><span>Valor</span><strong>{formatCurrency(expense.total_amount)}</strong><small>{num(expense.quantity).toLocaleString("pt-BR")} × {formatCurrency(expense.unit_amount)}</small></div>
                  <div><span>Pagamento</span><b className={expenseStatusClass(expense.payment_status)}>{expensePaymentStatusLabel(expense.payment_status)}</b><small>{expense.paid_at ? formatDate(expense.paid_at) : expense.payment_method || "Sem forma informada"}</small></div>
                  <div><span>Reembolso</span><strong>{expense.is_reimbursable ? reimbursementStatusLabel(expense.reimbursement_status) : "Não reembolsável"}</strong>{expense.is_estimated && <small>Valor estimado</small>}</div>
                  <div className="expense-row-actions">
                    {expense.payment_status !== "paid" && expense.payment_status !== "cancelled" && <form action={markPaid}><button className="button button-ghost button-small" type="submit">Marcar paga</button></form>}
                    {expense.payment_status !== "cancelled" && expense.payment_status !== "paid" && <form action={cancelExpense}><button className="button button-ghost button-small" type="submit">Cancelar</button></form>}
                    {expense.is_reimbursable && expense.reimbursement_status === "pending" && <form action={requestReimbursement}><button className="button button-ghost button-small" type="submit">Solicitar reembolso</button></form>}
                    {expense.is_reimbursable && expense.reimbursement_status === "requested" && <form action={approveReimbursement}><button className="button button-ghost button-small" type="submit">Aprovar reembolso</button></form>}
                    {expense.is_reimbursable && expense.reimbursement_status === "approved" && <form action={reimburse}><button className="button button-ghost button-small" type="submit">Marcar reembolsada</button></form>}
                    {canDelete && <DangerActionButton action={deleteExpense} label="Excluir" pendingLabel="Excluindo..." compact confirmation={`Excluir definitivamente a despesa “${expense.description}”?`} />}
                  </div>
                  {expense.notes && <p className="expense-notes">{expense.notes}</p>}
                  <details className="inline-edit-panel expense-edit-panel">
                    <summary>Editar despesa</summary>
                    <ExpenseForm action={saveExpense} expense={expense} trips={typedTrips} submitLabel="Salvar despesa" />
                  </details>
                </article>
              );
            })}
          </div>
        )}

        <details className="report-add-panel expense-add-panel" open={!typedExpenses.length}>
          <summary>Adicionar despesa</summary>
          <ExpenseForm action={createExpense} trips={typedTrips} submitLabel="Cadastrar despesa" />
        </details>
      </section>
    </>
  );
}

function TripForm({ action, trip, submitLabel }: { action: (formData: FormData) => void | Promise<void>; trip?: Trip; submitLabel: string }) {
  return (
    <form className="form-grid trip-form" action={action}>
      <label className="field full"><span>Título do deslocamento</span><input className="input" name="title" defaultValue={trip?.title || "Deslocamento pericial"} required /></label>
      <label className="field"><span>Situação</span><select className="select" name="status" defaultValue={trip?.status || "planned"}>{TRIP_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Quantidade de viagens</span><input className="input" name="trips_count" type="number" min="1" step="1" defaultValue={Number(trip?.trips_count || 1)} required /></label>
      <label className="field"><span>Cidade de origem</span><input className="input" name="origin_city" defaultValue={trip?.origin_city || "Araxá"} /></label>
      <label className="field"><span>UF de origem</span><input className="input" name="origin_state" maxLength={2} defaultValue={trip?.origin_state || "MG"} /></label>
      <label className="field"><span>Cidade de destino</span><input className="input" name="destination_city" defaultValue={trip?.destination_city || ""} required /></label>
      <label className="field"><span>UF de destino</span><input className="input" name="destination_state" maxLength={2} defaultValue={trip?.destination_state || "MG"} /></label>
      <label className="field"><span>Saída</span><input className="input" name="departure_at" type="datetime-local" defaultValue={dateTimeLocal(trip?.departure_at)} /></label>
      <label className="field"><span>Retorno</span><input className="input" name="return_at" type="datetime-local" defaultValue={dateTimeLocal(trip?.return_at)} /></label>

      <div className="full finance-form-divider"><strong>Distância e veículo</strong><span>Quando a distância total ficar vazia, o sistema calcula ida × 2 × quantidade de viagens.</span></div>
      <label className="field"><span>Distância de ida (km)</span><input className="input" name="one_way_km" inputMode="decimal" defaultValue={moneyInputValue(trip?.one_way_km)} placeholder="0,00" /></label>
      <label className="field"><span>Distância total manual (km)</span><input className="input" name="total_km" inputMode="decimal" defaultValue={moneyInputValue(trip?.total_km)} placeholder="Automático quando vazio" /></label>
      <label className="field"><span>Consumo do veículo (km/L)</span><input className="input" name="fuel_efficiency_km_l" inputMode="decimal" defaultValue={moneyInputValue(trip?.fuel_efficiency_km_l)} placeholder="Ex.: 10,00" /></label>
      <label className="field"><span>Preço do combustível por litro</span><input className="input" name="fuel_price_per_liter" inputMode="decimal" defaultValue={moneyInputValue(trip?.fuel_price_per_liter)} placeholder="0,00" /></label>
      <label className="field"><span>Custo operacional do veículo por km</span><input className="input" name="vehicle_cost_per_km" inputMode="decimal" defaultValue={moneyInputValue(trip?.vehicle_cost_per_km)} placeholder="0,00" /></label>

      <div className="full finance-form-divider"><strong>Tempo técnico e despesas adicionais</strong><span>Os valores serão somados ao combustível e ao custo operacional do veículo.</span></div>
      <label className="field"><span>Horas de deslocamento</span><input className="input" name="travel_hours" inputMode="decimal" defaultValue={moneyInputValue(trip?.travel_hours)} placeholder="0,00" /></label>
      <label className="field"><span>Valor da hora técnica</span><input className="input" name="hourly_rate" inputMode="decimal" defaultValue={moneyInputValue(trip?.hourly_rate)} placeholder="0,00" /></label>
      <label className="field"><span>Pedágios</span><input className="input" name="toll_amount" inputMode="decimal" defaultValue={moneyInputValue(trip?.toll_amount)} placeholder="0,00" /></label>
      <label className="field"><span>Hospedagem</span><input className="input" name="lodging_amount" inputMode="decimal" defaultValue={moneyInputValue(trip?.lodging_amount)} placeholder="0,00" /></label>
      <label className="field"><span>Alimentação</span><input className="input" name="meal_amount" inputMode="decimal" defaultValue={moneyInputValue(trip?.meal_amount)} placeholder="0,00" /></label>
      <label className="field"><span>Outros custos</span><input className="input" name="other_amount" inputMode="decimal" defaultValue={moneyInputValue(trip?.other_amount)} placeholder="0,00" /></label>
      <label className="field full"><span>Observações</span><textarea className="textarea textarea-small" name="notes" defaultValue={trip?.notes || ""} placeholder="Registre rota, pedágios, necessidade de pernoite ou particularidades da diligência." /></label>
      {trip && <div className="notice notice-neutral full">Cálculo atual: combustível <strong>{formatCurrency(trip.fuel_cost)}</strong> + veículo <strong>{formatCurrency(trip.vehicle_operating_cost)}</strong> + tempo técnico <strong>{formatCurrency(trip.travel_time_cost)}</strong> + adicionais = <strong>{formatCurrency(trip.total_cost)}</strong>.</div>}
      <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Calculando...">{submitLabel}</SubmitButton></div>
    </form>
  );
}

function ExpenseForm({ action, expense, trips, submitLabel }: { action: (formData: FormData) => void | Promise<void>; expense?: Expense; trips: Trip[]; submitLabel: string }) {
  return (
    <form className="form-grid expense-form" action={action}>
      <label className="field"><span>Categoria</span><select className="select" name="category" defaultValue={expense?.category || "other"}>{EXPENSE_CATEGORY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Deslocamento relacionado</span><select className="select" name="trip_id" defaultValue={expense?.trip_id || ""}><option value="">Nenhum</option>{trips.map((trip) => <option value={trip.id} key={trip.id}>{trip.title} — {trip.destination_city || "sem destino"}</option>)}</select></label>
      <label className="field full"><span>Descrição</span><input className="input" name="description" defaultValue={expense?.description || ""} placeholder="Ex.: diária de hospedagem para diligência" required /></label>
      <label className="field"><span>Data</span><input className="input" name="expense_date" type="date" defaultValue={expense?.expense_date || todayInBrasilia()} required /></label>
      <label className="field"><span>Situação do pagamento</span><select className="select" name="payment_status" defaultValue={expense?.payment_status || "pending"}>{EXPENSE_PAYMENT_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>Quantidade</span><input className="input" name="quantity" inputMode="decimal" defaultValue={moneyInputValue(expense?.quantity) || "1,00"} required /></label>
      <label className="field"><span>Valor unitário</span><input className="input" name="unit_amount" inputMode="decimal" defaultValue={moneyInputValue(expense?.unit_amount)} placeholder="0,00" required /></label>
      <label className="field"><span>Forma de pagamento</span><input className="input" name="payment_method" defaultValue={expense?.payment_method || ""} placeholder="PIX, cartão, dinheiro, boleto" /></label>
      <label className="field"><span>Pago em</span><input className="input" name="paid_at" type="date" defaultValue={expense?.paid_at || ""} /></label>
      <label className="field"><span>Fornecedor</span><input className="input" name="vendor_name" defaultValue={expense?.vendor_name || ""} /></label>
      <label className="field"><span>Nota / documento</span><input className="input" name="document_number" defaultValue={expense?.document_number || ""} /></label>
      <label className="field"><span>Situação do reembolso</span><select className="select" name="reimbursement_status" defaultValue={expense?.reimbursement_status || "pending"}>{REIMBURSEMENT_STATUS_OPTIONS.filter(([value]) => value !== "not_applicable").map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <div className="field expense-checks"><span>Classificação</span><label className="check-line"><input type="checkbox" name="is_estimated" defaultChecked={expense?.is_estimated || false} /> Valor estimado</label><label className="check-line"><input type="checkbox" name="is_reimbursable" defaultChecked={expense?.is_reimbursable || false} /> Despesa reembolsável</label></div>
      <label className="field full"><span>Observações</span><textarea className="textarea textarea-small" name="notes" defaultValue={expense?.notes || ""} /></label>
      <div className="notice notice-neutral full">O total será calculado automaticamente por <strong>quantidade × valor unitário</strong>. Marque como reembolsável somente quando houver previsão de restituição pela parte, cliente ou contratante.</div>
      <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Salvando...">{submitLabel}</SubmitButton></div>
    </form>
  );
}
