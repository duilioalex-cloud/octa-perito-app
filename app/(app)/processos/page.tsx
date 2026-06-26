import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { formatCurrency, formatDate, PROCESS_STATUS_OPTIONS, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Processos" };

type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function ProcessesPage({ searchParams }: { searchParams: SearchParams }) {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const supabase = await createClient();

  let builder = supabase
    .from("processes")
    .select("id, process_number, court, district, plaintiff, defendant, subject, status, priority, report_due_at, fee_arbitrated, fee_received")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (status) builder = builder.eq("status", status);
  if (query) {
    const safe = query.replace(/[,%()]/g, " ");
    builder = builder.or(`process_number.ilike.%${safe}%,plaintiff.ilike.%${safe}%,defendant.ilike.%${safe}%,subject.ilike.%${safe}%`);
  }

  const { data: processes } = await builder;

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">GESTÃO PERICIAL</p><h1>Processos</h1><p>Cadastre, filtre e acompanhe o ciclo completo de cada perícia.</p></div>
        <Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link>
      </header>

      <section className="card filter-card">
        <form className="filter-form" method="get">
          <label className="field filter-grow"><span>Pesquisar</span><input className="input" name="q" defaultValue={query} placeholder="Número, parte ou objeto" /></label>
          <label className="field"><span>Status</span><select className="select" name="status" defaultValue={status}><option value="">Todos</option>{PROCESS_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <button className="button button-secondary filter-button" type="submit">Filtrar</button>
          {(query || status) && <Link className="button button-ghost filter-button" href="/processos">Limpar</Link>}
        </form>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>{processes?.length ?? 0} processo(s)</h2></div>
        {!processes?.length ? <div className="empty-state"><strong>Nenhum processo encontrado.</strong>Altere os filtros ou inclua uma nova perícia.</div> : processes.map((process) => (
          <Link className="list-row process-list-row" href={`/processos/${process.id}`} key={process.id}>
            <div><strong>{process.process_number}</strong><span>{process.plaintiff || "Autor não informado"} × {process.defendant || "Réu não informado"}</span><small>{process.subject || "Objeto não informado"}</small></div>
            <div><small>{process.court || "Tribunal não informado"}</small><strong>{process.district || "Comarca não informada"}</strong><span>Laudo: {formatDate(process.report_due_at)}</span></div>
            <div><small>Arbitrado / recebido</small><strong>{formatCurrency(process.fee_arbitrated)}</strong><span>{formatCurrency(process.fee_received)}</span></div>
            <span className={`status status-${process.status}`}>{processStatusLabel(process.status)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
