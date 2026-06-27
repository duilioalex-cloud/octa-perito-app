import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Controle de acesso</p>
          <h1>Acesso negado</h1>
          <p>Seu nivel atual nao permite visualizar ou alterar esta area do OCTA Perito.</p>
        </div>
        <Link className="button button-primary" href="/dashboard">Voltar ao painel</Link>
      </div>
    </section>
  );
}
