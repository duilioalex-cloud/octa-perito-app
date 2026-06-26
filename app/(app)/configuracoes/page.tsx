import Image from "next/image";
import { removeBrandAssetAction, updateDocumentIdentityAction } from "@/app/actions/settings";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentOrganization } from "@/lib/current-organization";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("full_name,professional_title,council,council_number,phone").eq("id", user.id).maybeSingle(),
    supabase.from("organization_document_settings").select("*").eq("organization_id", organization.id).maybeSingle(),
  ]);
  const canEdit = ["owner", "admin"].includes(organization.role);
  const removeLogo = removeBrandAssetAction.bind(null, "logo");
  const removeSignature = removeBrandAssetAction.bind(null, "signature");
  const registration = settings?.council_registration || [profile?.council, profile?.council_number].filter(Boolean).join(" ");

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Identidade profissional</h1><p>Configure logomarca, assinatura, cabeçalho, rodapé, cores e padrões de exportação.</p></div></header>
      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}
      {!canEdit && <div className="notice notice-error">Somente proprietários e administradores podem alterar estas configurações.</div>}

      <form className="card form-card form-card-wide identity-settings-form" action={updateDocumentIdentityAction}>
        <fieldset disabled={!canEdit}>
          <div className="form-section"><h2>Dados do emitente</h2><p>Estas informações serão usadas na capa, assinatura e identificação dos documentos.</p></div>
          <div className="form-grid">
            <label className="field"><span>Nome do escritório ou empresa</span><input className="input" name="office_name" defaultValue={settings?.office_name || organization.name} /></label>
            <label className="field"><span>Nome do profissional</span><input className="input" name="professional_name" defaultValue={settings?.professional_name || profile?.full_name || ""} /></label>
            <label className="field full"><span>Títulos profissionais</span><textarea className="textarea textarea-small" name="professional_titles" defaultValue={settings?.professional_titles || profile?.professional_title || ""} placeholder="Engenheiro Civil · Engenheiro de Segurança do Trabalho · Mestre..." /></label>
            <label className="field"><span>Conselho e registro</span><input className="input" name="council_registration" defaultValue={registration} placeholder="CREA-MG 231868/D" /></label>
            <label className="field"><span>Cidade/UF de emissão</span><input className="input" name="city_state" defaultValue={settings?.city_state || "Araxá/MG"} /></label>
            <label className="field full"><span>Linha de contato</span><input className="input" name="contact_line" defaultValue={settings?.contact_line || profile?.phone || ""} placeholder="E-mail · telefone · endereço profissional" /></label>
          </div>

          <div className="form-section"><h2>Cabeçalho e rodapé</h2><p>Textos curtos produzem melhor resultado em Word e PDF.</p></div>
          <div className="form-grid">
            <label className="field full"><span>Texto do cabeçalho</span><input className="input" name="header_text" defaultValue={settings?.header_text || organization.name} /></label>
            <label className="field full"><span>Texto do rodapé</span><input className="input" name="footer_text" defaultValue={settings?.footer_text || "Documento técnico emitido pelo OCTA Perito"} /></label>
            <label className="field"><span>Cor institucional principal</span><div className="color-field"><input name="primary_color" type="color" defaultValue={`#${settings?.primary_color || "1F7A6D"}`} /><code>#{settings?.primary_color || "1F7A6D"}</code></div></label>
            <label className="field"><span>Cor institucional secundária</span><div className="color-field"><input name="secondary_color" type="color" defaultValue={`#${settings?.secondary_color || "0B1C2D"}`} /><code>#{settings?.secondary_color || "0B1C2D"}</code></div></label>
          </div>

          <div className="form-section"><h2>Logomarca e assinatura</h2><p>Use arquivos PNG ou JPG, preferencialmente com fundo transparente para a logomarca.</p></div>
          <div className="brand-assets-grid">
            <div className="brand-asset-card">
              <div className="brand-preview">{settings?.logo_path ? <Image unoptimized src="/api/configuracoes/marca/logo" alt="Logomarca cadastrada" width={320} height={130} /> : <span>Sem logomarca</span>}</div>
              <label className="field"><span>Nova logomarca</span><input className="file-input" type="file" name="logo_file" accept="image/png,image/jpeg" /></label>
              {settings?.logo_path && <button className="button button-danger button-small" formAction={removeLogo}>Remover logomarca</button>}
            </div>
            <div className="brand-asset-card">
              <div className="brand-preview brand-preview-signature">{settings?.signature_path ? <Image unoptimized src="/api/configuracoes/marca/signature" alt="Assinatura cadastrada" width={320} height={130} /> : <span>Sem assinatura</span>}</div>
              <label className="field"><span>Nova assinatura</span><input className="file-input" type="file" name="signature_file" accept="image/png,image/jpeg" /></label>
              {settings?.signature_path && <button className="button button-danger button-small" formAction={removeSignature}>Remover assinatura</button>}
            </div>
          </div>

          <div className="form-section"><h2>Padrões de exportação</h2><p>As opções são aplicadas aos laudos e às petições exportadas.</p></div>
          <div className="settings-check-grid">
            <label className="setting-check"><input type="checkbox" name="show_cover" defaultChecked={settings?.show_cover ?? true} /><span><strong>Gerar capa nos laudos</strong><small>Inclui título, processo, partes, comarca e data. Petições permanecem sem capa.</small></span></label>
            <label className="setting-check"><input type="checkbox" name="show_table_of_contents" defaultChecked={settings?.show_table_of_contents ?? true} /><span><strong>Gerar sumário</strong><small>No Word, o campo é atualizado ao abrir o arquivo.</small></span></label>
            <label className="setting-check"><input type="checkbox" name="show_page_numbers" defaultChecked={settings?.show_page_numbers ?? true} /><span><strong>Numerar páginas</strong><small>Exibe página atual e total de páginas.</small></span></label>
            <label className="setting-check"><input type="checkbox" name="include_logo" defaultChecked={settings?.include_logo ?? true} /><span><strong>Incluir logomarca</strong><small>Aplicada na capa e no cabeçalho.</small></span></label>
            <label className="setting-check"><input type="checkbox" name="include_signature" defaultChecked={settings?.include_signature ?? true} /><span><strong>Incluir assinatura</strong><small>Aplicada no encerramento do documento.</small></span></label>
          </div>
          <div className="form-actions"><SubmitButton className="button button-primary" pendingText="Salvando configurações...">Salvar identidade profissional</SubmitButton></div>
        </fieldset>
      </form>

      <section className="card export-capabilities-card"><div><span className="tag">WORD</span><h3>Documento editável</h3><p>Capa, sumário, cabeçalho, rodapé, paginação, fotografias e assinatura.</p></div><div><span className="tag">PDF</span><h3>Arquivo final</h3><p>Layout paginado, imagens incorporadas, índice e identidade do escritório.</p></div><div><span className="tag">PRIVACIDADE</span><h3>Arquivos protegidos</h3><p>Logomarca, assinatura e anexos permanecem em armazenamento privado.</p></div></section>
    </>
  );
}
