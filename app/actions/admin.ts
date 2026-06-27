"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isBillingStatus } from "@/lib/billing";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function adminPath(message?: string, type: "error" | "success" = "success") {
  if (!message) return "/admin";
  return `/admin?${type}=${encodeURIComponent(message)}`;
}

export async function updateOrganizationBillingStatusAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  const organizationId = String(formData.get("organization_id") || "").trim();
  const status = String(formData.get("billing_status") || "").trim();
  const reason = String(formData.get("billing_block_reason") || "").trim();

  if (!organizationId) redirect(adminPath("Organizacao invalida.", "error"));
  if (!isBillingStatus(status)) redirect(adminPath("Status de assinatura invalido.", "error"));

  const isBlocked = status === "blocked";
  const shouldKeepReason = isBlocked || status === "past_due" || status === "cancelled";
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const updatePayload = {
    billing_status: status,
    billing_blocked_at: isBlocked ? now : null,
    billing_block_reason: shouldKeepReason ? reason || (isBlocked ? "Pagamento pendente" : null) : null,
    updated_at: now,
  };

  const { error } = await admin.from("organizations").update(updatePayload).eq("id", organizationId);
  if (error) redirect(adminPath(`Nao foi possivel atualizar a assinatura: ${error.message}`, "error"));

  await admin.from("subscription_events").insert({
    organization_id: organizationId,
    event_type: "manual_status_update",
    created_by: user.id,
    payload: {
      status,
      reason: updatePayload.billing_block_reason,
      source: "admin_panel",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(adminPath("Status da assinatura atualizado."));
}
