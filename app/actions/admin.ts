"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isBillingStatus } from "@/lib/billing";
import { provisionPaidSale, type SaleCheckoutSession } from "@/lib/billing-provisioning";
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

export async function processPaidCheckoutSessionAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  const saleId = String(formData.get("sale_id") || "").trim();
  if (!saleId) redirect(adminPath("Compra invalida.", "error"));

  const admin = createAdminClient();
  const { data: saleData, error: saleError } = await admin
    .from("sales_checkout_sessions")
    .select("*")
    .eq("id", saleId)
    .maybeSingle();

  if (saleError || !saleData) {
    redirect(adminPath(`Nao foi possivel localizar a compra: ${saleError?.message || "registro nao encontrado"}`, "error"));
  }

  const sale = saleData as SaleCheckoutSession;
  if (sale.status === "provisioned") redirect(adminPath("Esta compra ja estava provisionada."));

  let organizationId: string | null = null;
  try {
    const result = await provisionPaidSale(
      admin,
      sale,
      {
        eventId: `manual-${sale.id}`,
        eventType: "manual.payment_confirmed",
        externalId: sale.id,
        checkoutId: sale.provider_checkout_id,
        checkoutUrl: sale.checkout_url,
        customerId: sale.provider_customer_id,
        customerEmail: sale.buyer_email,
        subscriptionId: sale.provider_subscription_id || `manual-subscription-${sale.id}`,
        paymentId: `manual-payment-${sale.id}`,
        amountCents: sale.amount_cents,
      },
      { source: "admin_panel", sale_id: sale.id, processed_by: user.id },
    );
    organizationId = result.organizationId;

    await admin.from("subscription_events").insert({
      organization_id: result.organizationId,
      event_type: "manual_payment_confirmed",
      provider: "manual",
      provider_event_id: `manual-${sale.id}`,
      created_by: user.id,
      payload: {
        sale_id: sale.id,
        buyer_email: sale.buyer_email,
        source: "admin_panel",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    redirect(adminPath(`Nao foi possivel processar a compra paga: ${message}`, "error"));
  }

  if (!organizationId) redirect(adminPath("Nao foi possivel identificar o cliente liberado.", "error"));
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(adminPath("Compra processada e cliente liberado."));
}
