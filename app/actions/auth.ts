"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function messageUrl(path: string, type: "error" | "success", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${type}=${encodeURIComponent(message)}`;
}

function safeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect(messageUrl("/login", "error", "Informe e-mail e senha."));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(messageUrl("/login", "error", "Credenciais inválidas ou conta não confirmada."));
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (fullName.length < 3) redirect(messageUrl("/cadastro", "error", "Informe seu nome completo."));
  if (!email || password.length < 8) redirect(messageUrl("/cadastro", "error", "Use um e-mail válido e senha com pelo menos 8 caracteres."));
  if (password !== confirmPassword) redirect(messageUrl("/cadastro", "error", "As senhas não coincidem."));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) redirect(messageUrl("/cadastro", "error", error.message));
  redirect(messageUrl("/login", "success", "Conta criada. Confirme o e-mail para continuar."));
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const returnTo = safeRedirectPath(formData.get("redirect_to"), "/recuperar-senha");
  if (!email) redirect(messageUrl(returnTo, "error", "Informe seu e-mail."));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });
  if (error) redirect(messageUrl(returnTo, "error", "Nao foi possivel enviar o link de definicao de senha."));
  redirect(messageUrl(returnTo, "success", "Enviamos o link para definir a senha no e-mail informado."));
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");
  if (password.length < 8) redirect(messageUrl("/redefinir-senha", "error", "A senha deve ter pelo menos 8 caracteres."));
  if (password !== confirmPassword) redirect(messageUrl("/redefinir-senha", "error", "As senhas não coincidem."));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(messageUrl("/redefinir-senha", "error", "Não foi possível atualizar a senha."));
  redirect(messageUrl("/login", "success", "Senha atualizada. Entre novamente."));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
