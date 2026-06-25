import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <section className="auth-visual">
        <Logo href="https://www.octaperito.com.br" />
        <div>
          <p className="eyebrow">PLATAFORMA OCTA SYSTEMS</p>
          <h1>Seu escritório pericial em <span>controle técnico.</span></h1>
          <p>Processos, prazos, honorários e documentos reunidos em um ambiente profissional, seguro e orientado ao fluxo real da perícia.</p>
        </div>
        <div className="auth-points">
          <div><strong>Gestão</strong><span>Processos e prazos</span></div>
          <div><strong>Biblioteca</strong><span>Petições e laudos</span></div>
          <div><strong>Resultado</strong><span>Honorários e produtividade</span></div>
        </div>
      </section>
      <section className="auth-panel">{children}</section>
    </div>
  );
}
