import Link from "next/link";

export default function NotFound() {
  return <main className="onboarding-page"><section className="card onboarding-card"><p className="eyebrow">ERRO 404</p><h1>Conteúdo não encontrado</h1><p>O endereço informado não existe ou não está disponível para seu usuário.</p><Link className="button button-primary" href="/dashboard">Voltar ao painel</Link></section></main>;
}
