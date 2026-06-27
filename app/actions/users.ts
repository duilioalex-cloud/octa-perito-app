"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { canManageRole, isMemberRole, type MemberRole } from "@/lib/permissions";

function usersPath(message?: string, type: "error" | "success" = "success") {
  if (!message) return "/configuracoes/usuarios";
  return `/configuracoes/usuarios?${type}=${encodeURIComponent(message)}`;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value || "").trim().toLowerCase();
}

function readRole(value: FormDataEntryValue | null): MemberRole | null {
  const role = String(value || "");
  return isMemberRole(role) ? role : null;
}

async function assertCanManageTarget(targetRole: MemberRole) {
  const organization = await requireCurrentOrganization("users:manage");
  if (!canManageRole(organization.role, targetRole)) {
    redirect(usersPath("Voce nao pode gerenciar esse nivel de acesso.", "error"));
  }
  return organization;
}

export async function inviteOrganizationMemberAction(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const role = readRole(formData.get("role"));

  if (fullName.length < 3) redirect(usersPath("Informe o nome do usuario.", "error"));
  if (!email || !email.includes("@")) redirect(usersPath("Informe um e-mail valido.", "error"));
  if (!role) redirect(usersPath("Selecione um nivel de acesso valido.", "error"));

  const organization = await assertCanManageTarget(role);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let invitedUserId: string | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        organization_id: organization.id,
        organization_name: organization.name,
        invited_role: role,
      },
      redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    });

    if (error) redirect(usersPath(error.message, "error"));
    invitedUserId = data.user?.id ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel enviar o convite.";
    redirect(usersPath(message, "error"));
  }

  const supabase = await createClient();
  const payload = {
    organization_id: organization.id,
    user_id: invitedUserId,
    invited_email: email,
    invited_name: fullName,
    role,
    invitation_status: invitedUserId ? "sent" : "pending",
    invited_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("organization_members").insert(payload);
  if (error) redirect(usersPath("Convite enviado, mas o vinculo nao foi salvo.", "error"));

  revalidatePath("/configuracoes/usuarios");
  redirect(usersPath("Convite registrado com sucesso."));
}

export async function updateOrganizationMemberRoleAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const invitedEmail = normalizeEmail(formData.get("invited_email"));
  const role = readRole(formData.get("role"));
  const currentRole = readRole(formData.get("current_role"));

  if (!role || !currentRole) redirect(usersPath("Nivel de acesso invalido.", "error"));
  const organization = await assertCanManageTarget(currentRole);
  if (!canManageRole(organization.role, role)) redirect(usersPath("Voce nao pode atribuir esse nivel.", "error"));
  if (currentRole === "owner") redirect(usersPath("O proprietario nao pode ter o nivel alterado pela interface.", "error"));

  const supabase = await createClient();
  let query = supabase.from("organization_members").update({ role }).eq("organization_id", organization.id);
  query = userId ? query.eq("user_id", userId) : query.eq("invited_email", invitedEmail);
  const { error } = await query;

  if (error) redirect(usersPath("Nao foi possivel alterar o nivel de acesso.", "error"));
  revalidatePath("/configuracoes/usuarios");
  redirect(usersPath("Nivel de acesso atualizado."));
}

export async function removeOrganizationMemberAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "");
  const invitedEmail = normalizeEmail(formData.get("invited_email"));
  const currentRole = readRole(formData.get("current_role"));

  if (!currentRole) redirect(usersPath("Nivel de acesso invalido.", "error"));
  const organization = await assertCanManageTarget(currentRole);
  if (currentRole === "owner") redirect(usersPath("O proprietario nao pode ser removido pela interface.", "error"));

  const supabase = await createClient();
  let query = supabase.from("organization_members").delete().eq("organization_id", organization.id);
  query = userId ? query.eq("user_id", userId) : query.eq("invited_email", invitedEmail);
  const { error } = await query;

  if (error) redirect(usersPath("Nao foi possivel remover o acesso.", "error"));
  revalidatePath("/configuracoes/usuarios");
  redirect(usersPath("Acesso removido."));
}

export async function resendOrganizationInviteAction(formData: FormData) {
  const email = normalizeEmail(formData.get("invited_email"));
  const currentRole = readRole(formData.get("current_role"));
  if (!email || !currentRole) redirect(usersPath("Convite invalido.", "error"));

  const organization = await assertCanManageTarget(currentRole);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: organization.id,
        organization_name: organization.name,
        invited_role: currentRole,
      },
      redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
    });
    if (error) redirect(usersPath(error.message, "error"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel reenviar o convite.";
    redirect(usersPath(message, "error"));
  }

  const supabase = await createClient();
  await supabase
    .from("organization_members")
    .update({ invitation_status: "sent", invited_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("invited_email", email);

  revalidatePath("/configuracoes/usuarios");
  redirect(usersPath("Convite reenviado."));
}
