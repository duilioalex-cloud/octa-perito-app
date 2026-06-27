import { formatCurrency } from "@/lib/process-options";
import { formatPercent, numberValue } from "@/lib/dashboard-options";

export type FunnelItem = {
  label: string;
  value: number;
  help: string;
  tone: "blue" | "green" | "warning" | "purple";
};

export function FinancialFunnel({ items }: { items: FunnelItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="dashboard-funnel">
      {items.map((item, index) => {
        const width = item.value > 0 ? Math.max((item.value / max) * 100, 3) : 0;
        const previous = index > 0 ? items[index - 1].value : 0;
        const conversion = previous > 0 ? (item.value / previous) * 100 : 0;
        return (
          <div className="dashboard-funnel-row" key={item.label}>
            <div className="dashboard-funnel-label">
              <span>{item.label}</span>
              <strong>{formatCurrency(item.value)}</strong>
            </div>
            <div className="dashboard-funnel-track" aria-label={`${item.label}: ${formatCurrency(item.value)}`}>
              <i className={`dashboard-funnel-fill dashboard-tone-${item.tone}`} style={{ width: `${width}%` }} />
            </div>
            <div className="dashboard-funnel-meta">
              <small>{item.help}</small>
              {index > 0 && <b>{formatPercent(conversion)} da etapa anterior</b>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type MonthChartItem = { key: string; label: string; revenue: number; cost: number };

export function MonthlyCashChart({ items }: { items: MonthChartItem[] }) {
  const max = Math.max(...items.flatMap((item) => [item.revenue, item.cost]), 1);
  const totalRevenue = items.reduce((sum, item) => sum + numberValue(item.revenue), 0);
  const totalCost = items.reduce((sum, item) => sum + numberValue(item.cost), 0);

  return (
    <div>
      <div className="dashboard-chart-legend">
        <span><i className="legend-revenue" />Recebimentos</span>
        <span><i className="legend-cost" />Custos realizados</span>
        <strong>Saldo: {formatCurrency(totalRevenue - totalCost)}</strong>
      </div>
      <div className="dashboard-month-chart">
        {items.map((item) => {
          const revenueHeight = item.revenue > 0 ? Math.max((item.revenue / max) * 100, 4) : 0;
          const costHeight = item.cost > 0 ? Math.max((item.cost / max) * 100, 4) : 0;
          return (
            <div className="dashboard-month-column" key={item.key}>
              <div className="dashboard-month-values">
                <div className="dashboard-month-bar dashboard-month-revenue" style={{ height: `${revenueHeight}%` }} title={`Recebido: ${formatCurrency(item.revenue)}`} />
                <div className="dashboard-month-bar dashboard-month-cost" style={{ height: `${costHeight}%` }} title={`Custos: ${formatCurrency(item.cost)}`} />
              </div>
              <span>{item.label}</span>
              <small>{formatCurrency(item.revenue - item.cost)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type BreakdownItem = { label: string; value: number; help?: string };

export function BreakdownBars({ items, emptyLabel = "Nenhum valor registrado no período." }: { items: BreakdownItem[]; emptyLabel?: string }) {
  const visible = items.filter((item) => item.value > 0);
  if (!visible.length) return <div className="empty-state dashboard-compact-empty"><strong>{emptyLabel}</strong></div>;
  const max = Math.max(...visible.map((item) => item.value), 1);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="dashboard-breakdown-list">
      {visible.map((item) => (
        <div className="dashboard-breakdown-row" key={item.label}>
          <div><strong>{item.label}</strong><span>{item.help || formatPercent((item.value / total) * 100)}</span></div>
          <div className="dashboard-breakdown-track"><i style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} /></div>
          <b>{formatCurrency(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

export function StatusBars({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <div className="empty-state dashboard-compact-empty"><strong>Nenhum processo cadastrado.</strong></div>;
  return (
    <div className="dashboard-status-list">
      {items.filter((item) => item.value > 0).map((item) => (
        <div className="dashboard-status-row" key={item.label}>
          <div><span>{item.label}</span><strong>{item.value}</strong></div>
          <div className="dashboard-status-track"><i style={{ width: `${(item.value / total) * 100}%` }} /></div>
          <small>{formatPercent((item.value / total) * 100)}</small>
        </div>
      ))}
    </div>
  );
}
