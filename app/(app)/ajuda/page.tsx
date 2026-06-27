import Link from "next/link";

export const metadata = { title: "Ajuda e guia de acesso" };

const accessSteps = [
  "O administrador cadastra seu nome, e-mail e nivel de acesso.",
  "Voce recebe um convite no e-mail informado.",
  "Abra o e-mail e clique no link de acesso.",
  "Defina sua senha quando o sistema solicitar.",
  "Depois do login, o OCTA abre o painel inicial do escritorio.",
];

const roles = [
  { title: "Proprietario", text: "Acesso total ao sistema, usuarios, configuracoes, financeiro e exclusoes criticas." },
  { title: "Administrador", text: "Acesso amplo ao sistema, incluindo usuarios, configuracoes e financeiro." },
  { title: "Perito", text: "Acesso operacional completo e acesso ao financeiro." },
  { title: "Financeiro", text: "Acesso ao financeiro e consulta dos processos necessarios." },
  { title: "Assistente tecnico", text: "Acesso operacional para documentos, laudos, agenda e processos. Nao acessa financeiro." },
  { title: "Consulta", text: "Acesso de visualizacao. Nao acessa financeiro nem edicoes principais." },
];

const menuItems = [
  ["Painel", "Visao inicial das pericias realizadas e a realizar."],
  ["Processos", "Cadastro e acompanhamento dos processos."],
  ["Biblioteca tecnica", "Modelos e conteudos tecnicos do escritorio."],
  ["Documentos", "Geracao e consulta de documentos."],
  ["Laudos", "Criacao e acompanhamento de laudos."],
  ["Financeiro", "Honorarios, depositos, despesas e deslocamentos, quando permitido."],
  ["Agenda", "Diligencias, prazos, audiencias e compromissos."],
  ["Alertas", "Vencimentos e pendencias importantes."],
  ["Configuracoes", "Dados do escritorio, marca e usuarios, quando permitido."],
];

export default function HelpPage() {
  return (
    <>
      <header className="page-header help-page-header">
        <div>
          <p className="eyebrow">AJUDA</p>
          <h1>Guia de acesso do usuario</h1>
          <p>Orientacoes simples para entrar no OCTA Perito, entender o menu e usar o nivel de acesso correto.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/dashboard">Voltar ao painel</Link>
        </div>
      </header>

      <section className="help-hero card">
        <div>
          <span>Link oficial</span>
          <strong>https://octa-perito-app.vercel.app</strong>
          <p>Use preferencialmente Google Chrome, Microsoft Edge ou outro navegador atualizado.</p>
        </div>
        <Link className="button button-primary" href="/">Abrir sistema</Link>
      </section>

      <section className="help-grid">
        <article className="card panel help-panel">
          <div className="panel-header">
            <div>
              <h2>Primeiro acesso por convite</h2>
              <p>Fluxo recomendado para novos usuarios do escritorio.</p>
            </div>
          </div>
          <ol className="help-step-list">
            {accessSteps.map((step, index) => (
              <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>
            ))}
          </ol>
          <div className="notice notice-neutral help-note">Se o convite nao aparecer, verifique spam, lixo eletronico ou promocoes.</div>
        </article>

        <aside className="card panel help-panel">
          <div className="panel-header">
            <div>
              <h2>Login e senha</h2>
              <p>Uso diario do sistema.</p>
            </div>
          </div>
          <div className="help-simple-list">
            <div><strong>Entrar</strong><span>Acesse o link oficial, informe e-mail e senha, depois clique em entrar.</span></div>
            <div><strong>Recuperar senha</strong><span>Use a opcao recuperar senha na tela de login e siga o link enviado por e-mail.</span></div>
            <div><strong>Seguranca</strong><span>Nao compartilhe senha e use sempre um e-mail individual.</span></div>
          </div>
        </aside>
      </section>

      <section className="help-grid">
        <article className="card panel help-panel">
          <div className="panel-header">
            <div>
              <h2>Menu principal</h2>
              <p>O sistema mostra apenas os menus permitidos para o seu perfil.</p>
            </div>
          </div>
          <div className="help-menu-list">
            {menuItems.map(([title, text]) => (
              <div key={title}><strong>{title}</strong><span>{text}</span></div>
            ))}
          </div>
        </article>

        <article className="card panel help-panel">
          <div className="panel-header">
            <div>
              <h2>Niveis de acesso</h2>
              <p>Resumo das permissoes do escritorio.</p>
            </div>
          </div>
          <div className="help-role-list">
            {roles.map((role) => (
              <div key={role.title}><strong>{role.title}</strong><span>{role.text}</span></div>
            ))}
          </div>
        </article>
      </section>

      <section className="card panel help-support-panel">
        <div className="panel-header">
          <div>
            <h2>Quando pedir suporte</h2>
            <p>Procure o administrador do escritorio quando houver problema de acesso.</p>
          </div>
        </div>
        <div className="help-support-grid">
          <div>Convite nao chegou</div>
          <div>E-mail cadastrado incorreto</div>
          <div>Tela informou acesso negado</div>
          <div>Menu esperado nao apareceu</div>
          <div>Precisa alterar nivel de acesso</div>
          <div>Perdeu acesso ao e-mail cadastrado</div>
        </div>
      </section>
    </>
  );
}
