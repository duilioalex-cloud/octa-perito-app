export const metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <><header className="page-header"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Configurações</h1><p>Perfil, escritório, assinatura, equipe e identidade visual.</p></div></header><section className="library-grid"><article className="card library-card"><span className="tag">PERFIL</span><h3>Dados profissionais</h3><p>Nome, especialidades, conselho, registro, telefone e currículo resumido.</p></article><article className="card library-card"><span className="tag">DOCUMENTOS</span><h3>Identidade do escritório</h3><p>Logomarca, cabeçalho, rodapé, assinatura e padrões de exportação.</p></article><article className="card library-card"><span className="tag">ACESSO</span><h3>Usuários e permissões</h3><p>Administrador, perito, assistente e acesso somente para consulta.</p></article></section></>
  );
}
