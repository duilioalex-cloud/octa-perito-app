import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type SaleCheckoutSession = {
  id: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_document: string | null;
  organization_name: string;
  organization_document: string | null;
  plan_code: string | null;
  amount_cents: number | null;
  currency: string | null;
  provider_customer_id: string | null;
  provider_checkout_id: string | null;
  provider_subscription_id: string | null;
  checkout_url: string | null;
  organization_id: string | null;
  owner_user_id: string | null;
  metadata: Record<string, unknown> | null;
};

type WebhookIds = {
  eventId: string | null;
  eventType: string;
  externalId: string | null;
  checkoutId: string | null;
  checkoutUrl: string | null;
  customerId: string | null;
  customerEmail: string | null;
  subscriptionId: string | null;
  paymentId: string | null;
  amountCents: number | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 54) || "escritorio";
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString();
}

export function extractAbacatePayWebhookIds(payload: unknown): WebhookIds {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const checkout = asRecord(data.checkout);
  const customer = asRecord(data.customer);
  const checkoutCustomer = asRecord(checkout.customer);
  const subscription = asRecord(data.subscription);
  const payment = asRecord(data.payment);
  const billing = asRecord(data.billing);
  const charge = asRecord(data.charge);

  return {
    eventId: readString(root.id, data.id, root.eventId),
    eventType: readString(root.event, root.type, data.event, data.type) || "unknown",
    externalId: readString(root.externalId, data.externalId, checkout.externalId, payment.externalId, subscription.externalId, billing.externalId, charge.externalId),
    checkoutId: readString(checkout.id, data.checkoutId, payment.checkoutId, billing.id, charge.id),
    checkoutUrl: readString(checkout.url, checkout.checkoutUrl, data.checkoutUrl, data.url, payment.checkoutUrl, billing.url, charge.url),
    customerId: readString(customer.id, checkoutCustomer.id, data.customerId, subscription.customerId, payment.customerId, billing.customerId, charge.customerId),
    customerEmail: normalizeEmail(readString(customer.email, checkoutCustomer.email, data.customerEmail, payment.customerEmail, billing.customerEmail, charge.customerEmail) || ""),
    subscriptionId: readString(subscription.id, data.subscriptionId, payment.subscriptionId, billing.subscriptionId, charge.subscriptionId),
    paymentId: readString(payment.id, data.paymentId, billing.paymentId, charge.paymentId),
    amountCents: readNumber(payment.amount, payment.paidAmount, data.amount, data.paidAmount, subscription.amount, billing.amount, charge.amount),
  };
}

export async function findSaleFromWebhook(admin: AdminClient, ids: WebhookIds) {
  const queries: Array<[keyof WebhookIds, string]> = [];
  if (ids.externalId) queries.push(["externalId", ids.externalId]);
  if (ids.checkoutId) queries.push(["checkoutId", ids.checkoutId]);
  if (ids.subscriptionId) queries.push(["subscriptionId", ids.subscriptionId]);
  if (ids.customerId) queries.push(["customerId", ids.customerId]);

  for (const [kind, value] of queries) {
    const column =
      kind === "externalId"
        ? "id"
        : kind === "checkoutId"
          ? "provider_checkout_id"
          : kind === "subscriptionId"
            ? "provider_subscription_id"
            : "provider_customer_id";
    const { data } = await admin.from("sales_checkout_sessions").select("*").eq(column, value).maybeSingle();
    if (data) return data as SaleCheckoutSession;
  }

  if (ids.checkoutUrl) {
    const { data } = await admin.from("sales_checkout_sessions").select("*").eq("checkout_url", ids.checkoutUrl).maybeSingle();
    if (data) return data as SaleCheckoutSession;
  }

  if (ids.customerEmail) {
    let query = admin
      .from("sales_checkout_sessions")
      .select("*")
      .ilike("buyer_email", ids.customerEmail)
      .in("status", ["pending", "checkout_created", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (ids.amountCents) query = query.eq("amount_cents", ids.amountCents);

    const { data } = await query;
    if (data?.[0]) return data[0] as SaleCheckoutSession;
  }

  return null;
}

export async function findOrganizationIdFromWebhook(admin: AdminClient, ids: WebhookIds) {
  if (ids.subscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("organization_id")
      .eq("provider", "abacatepay")
      .eq("provider_subscription_id", ids.subscriptionId)
      .maybeSingle();
    if (data?.organization_id) return String(data.organization_id);
  }

  if (ids.customerId) {
    const { data } = await admin
      .from("billing_customers")
      .select("organization_id")
      .eq("provider", "abacatepay")
      .eq("provider_customer_id", ids.customerId)
      .maybeSingle();
    if (data?.organization_id) return String(data.organization_id);
  }

  return null;
}

async function ensureBuyerUser(admin: AdminClient, sale: SaleCheckoutSession) {
  const email = normalizeEmail(sale.buyer_email);
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (profile?.id) return { id: String(profile.id), alreadyActive: true };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: sale.buyer_name,
      organization_name: sale.organization_name,
      source: "abacatepay_purchase",
    },
    redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
  });

  if (error || !data.user?.id) throw new Error(error?.message || "Nao foi possivel convidar o comprador.");
  return { id: data.user.id, alreadyActive: false };
}

async function createOrganizationForSale(admin: AdminClient, sale: SaleCheckoutSession, ownerId: string) {
  const baseSlug = slugify(sale.organization_name);
  const payload = {
    name: sale.organization_name,
    document: sale.organization_document || sale.buyer_document,
    owner_id: ownerId,
    billing_status: "active",
    billing_plan: sale.plan_code || "octa-perito-mensal",
    billing_blocked_at: null,
    billing_block_reason: null,
    billing_current_period_ends_at: addMonths(new Date(), 1),
    updated_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await admin
      .from("organizations")
      .insert({ ...payload, slug: `${baseSlug}${suffix}` })
      .select("id")
      .single();

    if (!error && data?.id) return String(data.id);
  }

  throw new Error("Nao foi possivel criar o escritorio do comprador.");
}

async function ensureOwnerMembership(admin: AdminClient, sale: SaleCheckoutSession, organizationId: string, ownerId: string, alreadyActive: boolean) {
  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (existing?.id) return;

  await admin.from("organization_members").insert({
    organization_id: organizationId,
    user_id: ownerId,
    role: "owner",
    invited_email: normalizeEmail(sale.buyer_email),
    invited_name: sale.buyer_name,
    invitation_status: alreadyActive ? "accepted" : "sent",
    invited_at: new Date().toISOString(),
    joined_at: alreadyActive ? new Date().toISOString() : null,
  });
}

async function syncBillingRecords(admin: AdminClient, sale: SaleCheckoutSession, ids: WebhookIds, payload: unknown) {
  if (!sale.organization_id) return;
  const now = new Date();
  const periodEnd = addMonths(now, 1);

  const { data: customer } = await admin
    .from("billing_customers")
    .upsert(
      {
        organization_id: sale.organization_id,
        owner_id: sale.owner_user_id,
        name: sale.buyer_name,
        email: normalizeEmail(sale.buyer_email),
        document: sale.buyer_document,
        phone: sale.buyer_phone,
        provider: "abacatepay",
        provider_customer_id: ids.customerId || sale.provider_customer_id,
        external_reference: sale.id,
        metadata: { sale_id: sale.id },
        updated_at: now.toISOString(),
      },
      { onConflict: "organization_id" },
    )
    .select("id")
    .single();

  let subscriptionId: string | null = null;
  if (ids.subscriptionId || sale.provider_subscription_id) {
    const providerSubscriptionId = ids.subscriptionId || sale.provider_subscription_id;
    const { data: existingSubscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("provider", "abacatepay")
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle();

    const subscriptionPayload = {
      organization_id: sale.organization_id,
      customer_id: customer?.id || null,
      plan_code: sale.plan_code || "octa-perito-mensal",
      status: "active",
      amount_cents: sale.amount_cents || ids.amountCents || 0,
      currency: sale.currency || "BRL",
      provider: "abacatepay",
      provider_subscription_id: providerSubscriptionId,
      current_period_started_at: now.toISOString(),
      current_period_ends_at: periodEnd,
      metadata: { sale_id: sale.id, payload },
      updated_at: now.toISOString(),
    };

    if (existingSubscription?.id) {
      subscriptionId = String(existingSubscription.id);
      await admin.from("subscriptions").update(subscriptionPayload).eq("id", subscriptionId);
    } else {
      const { data: createdSubscription } = await admin.from("subscriptions").insert(subscriptionPayload).select("id").single();
      subscriptionId = createdSubscription?.id ? String(createdSubscription.id) : null;
    }
  }

  if (ids.paymentId) {
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id")
      .eq("provider", "abacatepay")
      .eq("provider_payment_id", ids.paymentId)
      .maybeSingle();

    const paymentPayload = {
      organization_id: sale.organization_id,
      subscription_id: subscriptionId,
      status: "paid",
      amount_cents: sale.amount_cents || ids.amountCents || 0,
      currency: sale.currency || "BRL",
      provider: "abacatepay",
      provider_payment_id: ids.paymentId,
      paid_at: now.toISOString(),
      metadata: { sale_id: sale.id, payload },
      updated_at: now.toISOString(),
    };

    if (existingPayment?.id) {
      await admin.from("payments").update(paymentPayload).eq("id", existingPayment.id);
    } else {
      await admin.from("payments").insert(paymentPayload);
    }
  }

  await admin
    .from("organizations")
    .update({
      billing_status: "active",
      billing_plan: sale.plan_code || "octa-perito-mensal",
      billing_blocked_at: null,
      billing_block_reason: null,
      billing_current_period_ends_at: periodEnd,
      billing_customer_id: customer?.id || null,
      current_subscription_id: subscriptionId,
      updated_at: now.toISOString(),
    })
    .eq("id", sale.organization_id);
}

export async function provisionPaidSale(admin: AdminClient, sale: SaleCheckoutSession, ids: WebhookIds, payload: unknown) {
  let ownerUserId = sale.owner_user_id;
  let organizationId = sale.organization_id;
  let ownerAlreadyActive = false;

  if (!ownerUserId) {
    const user = await ensureBuyerUser(admin, sale);
    ownerUserId = user.id;
    ownerAlreadyActive = user.alreadyActive;
    await admin.from("sales_checkout_sessions").update({ owner_user_id: ownerUserId, updated_at: new Date().toISOString() }).eq("id", sale.id);
    sale.owner_user_id = ownerUserId;
  }

  if (!organizationId) {
    organizationId = await createOrganizationForSale(admin, sale, ownerUserId);
    await ensureOwnerMembership(admin, sale, organizationId, ownerUserId, ownerAlreadyActive);
    await admin
      .from("sales_checkout_sessions")
      .update({ organization_id: organizationId, updated_at: new Date().toISOString() })
      .eq("id", sale.id);
    sale.organization_id = organizationId;
  }

  await admin
    .from("sales_checkout_sessions")
    .update({
      status: "provisioned",
      provider_customer_id: ids.customerId || sale.provider_customer_id,
      provider_subscription_id: ids.subscriptionId || sale.provider_subscription_id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sale.id);

  await syncBillingRecords(admin, sale, ids, payload);
  return { organizationId, ownerUserId };
}

export async function markOrganizationPastDue(admin: AdminClient, organizationId: string, reason: string) {
  await admin
    .from("organizations")
    .update({
      billing_status: "past_due",
      billing_block_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);
}

export async function blockOrganizationForBilling(admin: AdminClient, organizationId: string, reason: string) {
  await admin
    .from("organizations")
    .update({
      billing_status: "blocked",
      billing_blocked_at: new Date().toISOString(),
      billing_block_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);
}
