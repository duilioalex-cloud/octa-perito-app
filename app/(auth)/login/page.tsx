import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { signInAction } from "@/app/actions/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return (
    <div className="auth-card">
      <Logo href="/login" />
      <h2>Acessar o sistema</h2>
      <p>Entre com suas credenciais profissionais.</p>
      {params.error && <div className="notice notice-error">{params.error}</div>}
      {params.success && <div className="notice notice-success">{params.success}</div>}
      <form action={signInAction} className="form-stack">
        <label className="field"><span>E-mail</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Senha</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
        <div className="form-meta"><span></span><Link href="/recuperar-senha">Esqueci minha senha</Link></div>
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </form>
      <div className="auth-switch">Ainda não tem acesso? <Link href="/cadastro">Criar conta</Link></div>
    </div>
  );
}
