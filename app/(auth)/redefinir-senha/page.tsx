import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { updatePasswordAction } from "@/app/actions/auth";

export const metadata = { title: "Redefinir senha" };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <div className="auth-card">
      <Logo href="/login" />
      <h2>Definir nova senha</h2>
      <p>Use uma senha forte com pelo menos oito caracteres.</p>
      {params.error && <div className="notice notice-error">{params.error}</div>}
      <form action={updatePasswordAction} className="form-stack">
        <label className="field"><span>Nova senha</span><input className="input" name="password" type="password" minLength={8} required /></label>
        <label className="field"><span>Confirmar senha</span><input className="input" name="confirm_password" type="password" minLength={8} required /></label>
        <SubmitButton pendingText="Atualizando...">Atualizar senha</SubmitButton>
      </form>
    </div>
  );
}
