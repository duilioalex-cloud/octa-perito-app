import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordResetAction } from "@/app/actions/auth";

export const metadata = { title: "Recuperar senha" };

export default async function PasswordResetPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; email?: string }> }) {
  const params = await searchParams;
  const email = String(params.email || "").trim().toLowerCase();
  return (
    <div className="auth-card">
      <Logo href="/login" />
      <h2>Recuperar senha</h2>
      <p>Enviaremos um link seguro para redefinir seu acesso.</p>
      {params.error && <div className="notice notice-error">{params.error}</div>}
      {params.success && <div className="notice notice-success">{params.success}</div>}
      <form action={requestPasswordResetAction} className="form-stack">
        <label className="field"><span>E-mail</span><input className="input" name="email" type="email" autoComplete="email" defaultValue={email} required /></label>
        <SubmitButton pendingText="Enviando...">Enviar instruções</SubmitButton>
      </form>
      <div className="auth-switch"><Link href="/login">Voltar ao login</Link></div>
    </div>
  );
}
