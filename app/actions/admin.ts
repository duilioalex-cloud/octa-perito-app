"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isBillingStatus } from "@/lib/billing";
import { provisionPaidSale, type SaleCheckoutSession } from "@/lib/billing-provisioning";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function adminPath(message?: string, type: "error" | "success" = "success") {
  if (!message) return "/admin";
  return `/admin?${type}=${encodeURIComponent(message)}&t=${Date.now()}`;
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

export async function cancelCheckoutTestAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  const saleId = String(formData.get("sale_id") || "").trim();
  if (!saleId) redirect(adminPath("Compra invalida.", "error"));

  const admin = createAdminClient();
  const { data: sale, error: saleError } = await admin
    .from("sales_checkout_sessions")
    .select("id,status,organization_id,buyer_email,metadata")
    .eq("id", saleId)
    .maybeSingle();

  if (saleError || !sale) {
    redirect(adminPath(`Nao foi possivel localizar a compra: ${saleError?.message || "registro nao encontrado"}`, "error"));
  }
  if (sale.status === "provisioned") {
    redirect(adminPath("Compra provisionada nao deve ser cancelada como teste. Exclua o cliente se for um ambiente de teste.", "error"));
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("sales_checkout_sessions")
    .update({
      status: "cancelled",
      cancelled_at: now,
      metadata: {
        ...((sale.metadata as Record<string, unknown> | null) || {}),
        cancelled_as_test: true,
        cancelled_by: user.id,
        cancelled_at: now,
      },
      updated_at: now,
    })
    .eq("id", saleId);

  if (error) redirect(adminPath(`Nao foi possivel cancelar o teste: ${error.message}`, "error"));

  await admin.from("subscription_events").insert({
    organization_id: sale.organization_id || null,
    event_type: "checkout_test_cancelled",
    provider: "manual",
    provider_event_id: `cancel-test-${sale.id}`,
    created_by: user.id,
    payload: {
      sale_id: sale.id,
      buyer_email: sale.buyer_email,
      source: "admin_panel",
    },
  });

  revalidatePath("/admin");
  redirect(adminPath("Checkout de teste cancelado."));
}

export async function deleteCheckoutSessionAction(formData: FormData) {
  await requirePlatformAdmin();
  const saleId = String(formData.get("sale_id") || "").trim();
  if (!saleId) redirect(adminPath("Compra invalida.", "error"));

  const admin = createAdminClient();
  const { data: sale, error: saleError } = await admin
    .from("sales_checkout_sessions")
    .select("id,status,organization_id")
    .eq("id", saleId)
    .maybeSingle();

  if (saleError || !sale) {
    redirect(adminPath(`Nao foi possivel localizar a compra: ${saleError?.message || "registro nao encontrado"}`, "error"));
  }
  if (sale.status === "provisioned" || sale.organization_id) {
    redirect(adminPath("Esta compra ja criou cliente. Exclua o cliente para remover os dados vinculados.", "error"));
  }

  const { error } = await admin.from("sales_checkout_sessions").delete().eq("id", saleId);
  if (error) redirect(adminPath(`Nao foi possivel excluir a compra: ${error.message}`, "error"));

  revalidatePath("/admin");
  redirect(adminPath("Compra de teste excluida."));
}

export async function deleteTestOrganizationAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  const organizationId = String(formData.get("organization_id") || "").trim();
  if (!organizationId) redirect(adminPath("Cliente invalido.", "error"));

  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id,name,slug,current_subscription_id,billing_customer_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    redirect(adminPath(`Nao foi possivel localizar o cliente: ${organizationError?.message || "registro nao encontrado"}`, "error"));
  }

  const now = new Date().toISOString();
  await admin
    .from("sales_checkout_sessions")
    .update({
      status: "cancelled",
      cancelled_at: now,
      organization_id: null,
      metadata: {
        deleted_test_client_id: organization.id,
        deleted_test_client_name: organization.name,
        deleted_by: user.id,
        deleted_at: now,
      },
      updated_at: now,
    })
    .eq("organization_id", organizationId);

  await admin
    .from("organizations")
    .update({
      current_subscription_id: null,
      billing_customer_id: null,
      updated_at: now,
    })
    .eq("id", organizationId);

  await admin.from("subscription_events").delete().eq("organization_id", organizationId);
  await admin.from("payments").delete().eq("organization_id", organizationId);
  await admin.from("subscriptions").delete().eq("organization_id", organizationId);
  await admin.from("billing_customers").delete().eq("organization_id", organizationId);

  const { error } = await admin.from("organizations").delete().eq("id", organizationId);
  if (error) redirect(adminPath(`Nao foi possivel excluir o cliente de teste: ${error.message}`, "error"));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(adminPath(`Cliente de teste ${organization.name || organization.slug} excluido.`));
}
