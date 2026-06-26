import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { templateCategoryLabel } from "@/lib/document-options";

export const metadata = { title: "Biblioteca técnica" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; source?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  let request = supabase.from("templates").select("id,title,category,document_type,specialty,description,is_octa_model,version,status,sort_order").eq("status", "active").order("is_octa_model", { ascending: false }).order("sort_order", { ascending: true }).order("title");
  if (query.q) request = request.ilike("title", `%${query.q}%`);
  if (query.category) request = request.eq("category", query.category);
  if (query.source === "octa") request = request.eq("is_octa_model", true);
  if (query.source === "personal") request = request.eq("organization_id", organization.id).eq("is_octa_model", false);
  const { data: templates } = await request;

  return <>
    <header className="page-header"><div><p className="eyebrow">PRODUÇÃO DOCUMENTAL</p><h1>Biblioteca técnica</h1><p>Modelos OCTA protegidos e modelos particulares do seu escritório.</p></div><div className="header-actions"><Link className="button button-secondary" href="/documentos">Documentos gerados</Link><Link className="button button-primary" href="/biblioteca/novo">+ Novo modelo</Link></div></header>
    {query.error && <div className="notice notice-error">{query.error}</div>}
    <section className="card filter-card"><form className="filter-form"><label className="field filter-grow"><span>Pesquisar</span><input className="input" name="q" defaultValue={query.q || ""} placeholder="Título do modelo" /></label><label className="field"><span>Categoria</span><select className="select" name="category" defaultValue={query.category || ""}><option value="">Todas</option><option value="petition">Petições</option><option value="report">Laudos</option><option value="opinion">Pareceres</option><option value="checklist">Checklists</option><option value="technical_block">Blocos técnicos</option></select></label><label className="field"><span>Origem</span><select className="select" name="source" defaultValue={query.source || ""}><option value="">Todas</option><option value="octa">Modelos OCTA</option><option value="personal">Meus modelos</option></select></label><button className="button button-secondary filter-button">Filtrar</button></form></section>
    {!templates?.length ? <div className="card empty-state"><strong>Nenhum modelo encontrado.</strong>Ajuste os filtros ou crie um modelo particular.</div> : <section className="library-grid">{templates.map((item) => <Link className="card library-card library-link" href={`/biblioteca/${item.id}`} key={item.id}><div className="library-card-top"><span className="tag">{templateCategoryLabel(item.category)}</span><span className={item.is_octa_model ? "source-badge source-octa" : "source-badge"}>{item.is_octa_model ? "OCTA" : "MEU MODELO"}</span></div><h3>{item.title}</h3><p>{item.description || "Modelo estruturado para produção documental."}</p><footer><span>{item.specialty || "Geral"}</span><b>v{item.version}</b></footer></Link>)}</section>}
  </>;
}
