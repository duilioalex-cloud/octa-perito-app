import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { createOrganizationAction } from "@/app/actions/organization";
import { getCurrentOrganization } from "@/lib/current-organization";

export const metadata = { title: "Configurar escritório" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const organization = await getCurrentOrganization();
  if (organization) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="onboarding-page">
      <section className="card onboarding-card">
        <Logo href="/onboarding" />
        <p className="eyebrow" style={{ marginTop: 28 }}>CONFIGURAÇÃO INICIAL</p>
        <h1>Cadastre seu escritório pericial</h1>
        <p>Esses dados formarão a base dos processos, documentos e assinaturas gerados pelo sistema.</p>
        {params.error && <div className="notice notice-error">{params.error}</div>}
        <form action={createOrganizationAction}>
          <div className="form-grid">
            <label className="field full"><span>Nome do escritório ou nome profissional</span><input className="input" name="name" placeholder="Ex.: Pereira Engenharia e Perícias" required /></label>
            <label className="field"><span>Título profissional</span><input className="input" name="professional_title" placeholder="Engenheiro Civil e Ambiental" /></label>
            <label className="field"><span>Conselho profissional</span><select className="select" name="council"><option value="">Selecione</option><option>CREA</option><option>CAU</option><option>CRBio</option><option>CRM</option><option>CRC</option><option>Outro</option></select></label>
            <label className="field"><span>Número do registro</span><input className="input" name="council_number" placeholder="Ex.: 140269473-3" /></label>
            <label className="field"><span>Telefone</span><input className="input" name="phone" placeholder="(34) 99999-9999" /></label>
          </div>
          <div className="form-actions"><div style={{ minWidth: 230 }}><SubmitButton pendingText="Criando escritório...">Concluir configuração</SubmitButton></div></div>
        </form>
      </section>
    </main>
  );
}
