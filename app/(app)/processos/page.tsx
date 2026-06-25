import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export const metadata = { title: "Processos" };

export default async function ProcessesPage() {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data: processes } = await supabase.from("processes").select("id, process_number, court, district, plaintiff, defendant, status, report_due_at").eq("organization_id", organization.id).order("created_at", { ascending: false });

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">GESTÃO PERICIAL</p><h1>Processos</h1><p>Cadastre e acompanhe o ciclo completo de cada perícia.</p></div><Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link></header>
      <section className="card panel">
        <div className="panel-header"><h2>{processes?.length ?? 0} processo(s)</h2></div>
        {!processes?.length ? <div className="empty-state"><strong>Seu cadastro ainda está vazio.</strong>Inclua a primeira perícia para ativar o painel.</div> : processes.map((process) => (
          <Link className="list-row" href={`/processos/${process.id}`} key={process.id}>
            <div><strong>{process.process_number}</strong><span>{process.plaintiff || "Autor não informado"} × {process.defendant || "Réu não informado"}</span></div>
            <div><small>{process.court || "Tribunal não informado"}</small><strong>{process.district || "Comarca não informada"}</strong></div>
            <span className="status">{process.status}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
