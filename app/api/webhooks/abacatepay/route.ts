import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  blockOrganizationForBilling,
  extractAbacatePayWebhookIds,
  findOrganizationIdFromWebhook,
  findSaleFromWebhook,
  markOrganizationPastDue,
  provisionPaidSale,
} from "@/lib/billing-provisioning";
import { createAdminClient } from "@/lib/supabase/admin";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifySignature(rawBody: string, request: Request) {
  const configuredSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const configuredHmacKey = process.env.ABACATEPAY_WEBHOOK_HMAC_KEY || process.env.ABACATEPAY_PUBLIC_KEY;
  const url = new URL(request.url);

  if (configuredSecret) {
    const receivedSecret = url.searchParams.get("webhookSecret");
    if (!receivedSecret || !safeEqual(receivedSecret, configuredSecret)) return false;
  }

  if (configuredHmacKey) {
    const receivedSignature = request.headers.get("x-webhook-signature");
    if (!receivedSignature) return false;
    const expectedSignature = createHmac("sha256", configuredHmacKey).update(rawBody).digest("base64");
    if (!safeEqual(receivedSignature, expectedSignature)) return false;
  }

  return Boolean(configuredSecret || configuredHmacKey);
}

function isPaidEvent(eventType: string) {
  return eventType.includes("completed") || eventType.includes("renewed") || eventType.includes("paid");
}

function isFailedEvent(eventType: string) {
  return eventType.includes("payment_failed") || eventType.includes("failed");
}

function isCancelledEvent(eventType: string) {
  return eventType.includes("cancelled") || eventType.includes("refunded") || eventType.includes("dispute.lost");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request)) {
    return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody || "{}") as unknown;
  } catch (error) {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }
  const ids = extractAbacatePayWebhookIds(payload);
  const admin = createAdminClient();

  if (ids.eventId) {
    const { data: existingEvent } = await admin
      .from("subscription_events")
      .select("id")
      .eq("provider", "abacatepay")
      .eq("provider_event_id", ids.eventId)
      .maybeSingle();

    if (existingEvent?.id) return NextResponse.json({ received: true, duplicate: true });
  }

  const sale = await findSaleFromWebhook(admin, ids);
  let organizationId = sale?.organization_id || (await findOrganizationIdFromWebhook(admin, ids));
  let processedAction = "logged";

  if (isPaidEvent(ids.eventType) && sale) {
    const result = await provisionPaidSale(admin, sale, ids, payload);
    organizationId = result.organizationId;
    processedAction = "provisioned";
  } else if (isPaidEvent(ids.eventType) && organizationId) {
    await admin
      .from("organizations")
      .update({
        billing_status: "active",
        billing_blocked_at: null,
        billing_block_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);
    processedAction = "reactivated";
  } else if (isFailedEvent(ids.eventType) && organizationId) {
    await markOrganizationPastDue(admin, organizationId, "Pagamento nao aprovado pela Abacate Pay.");
    processedAction = "past_due";
  } else if (isCancelledEvent(ids.eventType) && organizationId) {
    await blockOrganizationForBilling(admin, organizationId, "Assinatura cancelada ou pagamento contestado.");
    processedAction = "blocked";
  }

  await admin.from("subscription_events").insert({
    organization_id: organizationId,
    event_type: ids.eventType,
    provider: "abacatepay",
    provider_event_id: ids.eventId,
    payload,
  });

  return NextResponse.json({ received: true, action: processedAction });
}
