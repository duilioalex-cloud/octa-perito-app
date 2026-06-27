-- OCTA Perito v0.6.6
-- Ajusta o painel financeiro para considerar despesas e deslocamentos no resultado operacional.

create or replace view public.process_financial_summary
with (security_invoker = true)
as
with fee_totals as (
  select
    pf.process_id,
    sum(case when pf.status <> 'cancelled' then pf.initial_arbitrated_amount else 0 end) as initial_arbitrated_total,
    sum(case when pf.status <> 'cancelled' then pf.proposed_amount else 0 end) as proposed_total,
    sum(case when pf.status <> 'cancelled' then pf.approved_amount else 0 end) as approved_total,
    sum(case when pf.status <> 'cancelled' then pf.opening_deposited_amount else 0 end) as opening_deposited_total,
    sum(case when pf.status <> 'cancelled' then pf.opening_received_amount else 0 end) as opening_received_total
  from public.process_fees pf
  group by pf.process_id
),
transaction_totals as (
  select
    pf.process_id,
    sum(case when ft.status = 'confirmed' and ft.deposit_delta > 0 then ft.deposit_delta else 0 end) as new_deposits_total,
    sum(case when ft.status = 'confirmed' then ft.deposit_delta else 0 end) as deposit_balance_delta,
    sum(case when ft.status = 'confirmed' then ft.received_delta else 0 end) as received_delta_total,
    sum(case when ft.status = 'confirmed' then ft.withheld_amount else 0 end) as withheld_total
  from public.process_fees pf
  left join public.fee_transactions ft on ft.fee_id = pf.id
  where pf.status <> 'cancelled'
  group by pf.process_id
),
expense_totals as (
  select
    pe.process_id,
    sum(case when pe.payment_status <> 'cancelled' then pe.total_amount else 0 end) as expenses_forecast_total,
    sum(case when pe.payment_status = 'paid' then pe.total_amount else 0 end) as expenses_paid_total,
    sum(case when pe.is_reimbursable = true and pe.reimbursement_status not in ('reimbursed','denied') and pe.payment_status <> 'cancelled' then pe.total_amount else 0 end) as reimbursable_pending_total
  from public.process_expenses pe
  group by pe.process_id
),
trip_totals as (
  select
    pt.process_id,
    sum(case when pt.status <> 'cancelled' then pt.total_cost else 0 end) as trip_cost_forecast_total,
    sum(case when pt.status = 'completed' then pt.total_cost else 0 end) as trip_cost_completed_total
  from public.process_trips pt
  group by pt.process_id
)
select
  p.id as process_id,
  p.organization_id,
  p.process_number,
  p.subject,
  p.status as process_status,
  p.financial_status,
  coalesce(f.initial_arbitrated_total, 0)::numeric(14,2) as initial_arbitrated_total,
  coalesce(f.proposed_total, 0)::numeric(14,2) as proposed_total,
  coalesce(f.approved_total, 0)::numeric(14,2) as approved_total,
  (coalesce(f.opening_deposited_total, 0) + coalesce(t.new_deposits_total, 0))::numeric(14,2) as deposited_total,
  (coalesce(f.opening_deposited_total, 0) + coalesce(t.deposit_balance_delta, 0))::numeric(14,2) as deposit_balance,
  (coalesce(f.opening_received_total, 0) + coalesce(t.received_delta_total, 0))::numeric(14,2) as received_total,
  coalesce(t.withheld_total, 0)::numeric(14,2) as withheld_total,
  coalesce(e.expenses_forecast_total, 0)::numeric(14,2) as expenses_forecast_total,
  coalesce(e.expenses_paid_total, 0)::numeric(14,2) as expenses_paid_total,
  coalesce(e.reimbursable_pending_total, 0)::numeric(14,2) as reimbursable_pending_total,
  coalesce(tr.trip_cost_forecast_total, 0)::numeric(14,2) as trip_cost_forecast_total,
  coalesce(tr.trip_cost_completed_total, 0)::numeric(14,2) as trip_cost_completed_total,
  (
    coalesce(f.approved_total, 0)
    - coalesce(e.expenses_forecast_total, 0)
    - coalesce(tr.trip_cost_forecast_total, 0)
  )::numeric(14,2) as forecast_result,
  (
    coalesce(f.opening_received_total, 0)
    + coalesce(t.received_delta_total, 0)
    - coalesce(e.expenses_paid_total, 0)
    - coalesce(tr.trip_cost_completed_total, 0)
  )::numeric(14,2) as realized_cash_result,
  p.last_movement_at,
  (
    coalesce(e.expenses_forecast_total, 0)
    + coalesce(tr.trip_cost_forecast_total, 0)
  )::numeric(14,2) as operational_cost_forecast_total,
  (
    coalesce(e.expenses_paid_total, 0)
    + coalesce(tr.trip_cost_completed_total, 0)
  )::numeric(14,2) as operational_cost_realized_total
from public.processes p
left join fee_totals f on f.process_id = p.id
left join transaction_totals t on t.process_id = p.id
left join expense_totals e on e.process_id = p.id
left join trip_totals tr on tr.process_id = p.id;

create or replace view public.organization_financial_dashboard
with (security_invoker = true)
as
select
  organization_id,
  count(*) as process_count,
  count(*) filter (where financial_status not in ('fully_released','cancelled','not_defined')) as processes_with_financial_pending,
  sum(initial_arbitrated_total)::numeric(16,2) as initial_arbitrated_total,
  sum(proposed_total)::numeric(16,2) as proposed_total,
  sum(approved_total)::numeric(16,2) as approved_total,
  sum(deposited_total)::numeric(16,2) as deposited_total,
  sum(deposit_balance)::numeric(16,2) as deposit_balance,
  sum(received_total)::numeric(16,2) as received_total,
  sum(withheld_total)::numeric(16,2) as withheld_total,
  sum(expenses_forecast_total)::numeric(16,2) as expenses_forecast_total,
  sum(expenses_paid_total)::numeric(16,2) as expenses_paid_total,
  sum(reimbursable_pending_total)::numeric(16,2) as reimbursable_pending_total,
  sum(trip_cost_forecast_total)::numeric(16,2) as trip_cost_forecast_total,
  sum(forecast_result)::numeric(16,2) as forecast_result,
  sum(realized_cash_result)::numeric(16,2) as realized_cash_result,
  case when sum(approved_total) > 0
    then round(sum(approved_total) / nullif(count(*) filter (where approved_total > 0), 0), 2)
    else 0
  end::numeric(16,2) as average_approved_fee,
  sum(operational_cost_forecast_total)::numeric(16,2) as operational_cost_forecast_total,
  sum(operational_cost_realized_total)::numeric(16,2) as operational_cost_realized_total
from public.process_financial_summary
group by organization_id;

grant select on public.process_financial_summary to authenticated;
grant select on public.organization_financial_dashboard to authenticated;

comment on view public.process_financial_summary is 'Resumo financeiro por processo, incluindo honorários, despesas, deslocamentos e resultado operacional.';
comment on view public.organization_financial_dashboard is 'Painel financeiro consolidado da organização com custos operacionais previstos e realizados.';
