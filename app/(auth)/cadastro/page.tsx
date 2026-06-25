import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { signUpAction } from "@/app/actions/auth";

export const metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="auth-card">
      <Logo href="/cadastro" />
      <h2>Criar conta profissional</h2>
      <p>Cadastre o responsável pelo escritório pericial.</p>
      {params.error && <div className="notice notice-error">{params.error}</div>}
      <form action={signUpAction} className="form-stack">
        <label className="field"><span>Nome completo</span><input className="input" name="full_name" autoComplete="name" required /></label>
        <label className="field"><span>E-mail</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Senha</span><input className="input" name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label className="field"><span>Confirmar senha</span><input className="input" name="confirm_password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <SubmitButton pendingText="Criando conta...">Criar conta</SubmitButton>
      </form>
      <div className="auth-switch">Já possui conta? <Link href="/login">Entrar</Link></div>
    </div>
  );
}
