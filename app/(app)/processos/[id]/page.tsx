import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export const metadata = { title: "Detalhes da perícia" };

const labels: Record<string,string> = { appointment_received:"Nomeação recebida", analysis:"Em análise", fees_proposed:"Honorários propostos", scheduled:"Diligência agendada", drafting:"Laudo em elaboração", delivered:"Laudo entregue", closed:"Encerrado" };

export default async function ProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data: process } = await supabase.from("processes").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle();
  if (!process) notFound();

  const details = [
    ["Número do processo", process.process_number], ["Status", labels[process.status] || process.status], ["Tribunal", process.court || "Não informado"], ["Comarca", process.district || "Não informada"], ["Vara", process.division || "Não informada"], ["Tipo de atuação", process.expertise_type === "technical_assistant" ? "Assistente técnico" : process.expertise_type === "extrajudicial" ? "Extrajudicial" : "Perito judicial"], ["Autor", process.plaintiff || "Não informado"], ["Réu", process.defendant || "Não informado"], ["Objeto", process.subject || "Não informado"], ["Prazo do laudo", process.report_due_at ? new Date(process.report_due_at).toLocaleDateString("pt-BR") : "Não definido"]
  ];

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">PROCESSO PERICIAL</p><h1>{process.process_number}</h1><p>{process.subject || "Objeto ainda não informado"}</p></div><button className="button button-secondary" type="button" disabled>Editar em breve</button></header>
      <section className="card panel"><div className="panel-header"><h2>Dados essenciais</h2><span className="status">{labels[process.status] || process.status}</span></div><div className="detail-grid">{details.map(([label,value]) => <div className="detail-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      <section className="dashboard-grid"><article className="card panel"><div className="panel-header"><h2>Próximas etapas</h2></div><div className="quick-actions"><div className="quick-action"><span>Analisar nomeação e documentos</span><b>01</b></div><div className="quick-action"><span>Definir honorários</span><b>02</b></div><div className="quick-action"><span>Agendar diligência</span><b>03</b></div><div className="quick-action"><span>Gerar documento técnico</span><b>04</b></div></div></article><article className="card panel"><div className="panel-header"><h2>Observações</h2></div><p style={{ color:"var(--muted)", whiteSpace:"pre-wrap" }}>{process.notes || "Nenhuma observação registrada."}</p></article></section>
    </>
  );
}
