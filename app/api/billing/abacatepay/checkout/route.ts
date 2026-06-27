import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  createAbacatePayCustomer,
  createAbacatePaySubscriptionCheckout,
  getAbacatePayConfig,
  getCheckoutUrl,
} from "@/lib/abacatepay";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckoutInput = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerDocument?: string;
  organizationName: string;
  organizationDocument?: string;
  returnUrl?: string;
  redirect?: boolean;
  metadata?: Record<string, unknown>;
};

function corsHeaders(request: Request) {
  const allowedOrigin = process.env.BILLING_ALLOWED_ORIGIN || "*";
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin === "*" ? "*" : origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function readInput(request: Request): Promise<CheckoutInput> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      buyerName: String(body.buyerName || body.name || "").trim(),
      buyerEmail: normalizeEmail(String(body.buyerEmail || body.email || "")),
      buyerPhone: String(body.buyerPhone || body.phone || "").trim() || undefined,
      buyerDocument: String(body.buyerDocument || body.document || "").trim() || undefined,
      organizationName: String(body.organizationName || body.companyName || body.officeName || "").trim(),
      organizationDocument: String(body.organizationDocument || body.companyDocument || "").trim() || undefined,
      returnUrl: String(body.returnUrl || "").trim() || undefined,
      redirect: body.redirect === true || body.redirect === "true",
      metadata: typeof body.metadata === "object" && body.metadata ? (body.metadata as Record<string, unknown>) : {},
    };
  }

  const form = await request.formData();
  return {
    buyerName: String(form.get("buyerName") || form.get("name") || "").trim(),
    buyerEmail: normalizeEmail(String(form.get("buyerEmail") || form.get("email") || "")),
    buyerPhone: String(form.get("buyerPhone") || form.get("phone") || "").trim() || undefined,
    buyerDocument: String(form.get("buyerDocument") || form.get("document") || "").trim() || undefined,
    organizationName: String(form.get("organizationName") || form.get("companyName") || form.get("officeName") || "").trim(),
    organizationDocument: String(form.get("organizationDocument") || form.get("companyDocument") || "").trim() || undefined,
    returnUrl: String(form.get("returnUrl") || "").trim() || undefined,
    redirect: String(form.get("redirect") || "") === "true",
    metadata: {},
  };
}

function validateInput(input: CheckoutInput) {
  if (input.buyerName.length < 3) return "Informe o nome do comprador.";
  if (!input.buyerEmail.includes("@")) return "Informe um e-mail valido.";
  if (input.organizationName.length < 3) return "Informe o nome do escritorio.";
  return null;
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const input = await readInput(request);
  const validationError = validateInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400, headers });

  const config = getAbacatePayConfig();
  if (!config.productId) {
    return NextResponse.json({ error: "Configure ABACATEPAY_PRODUCT_ID na Vercel." }, { status: 500, headers });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const sessionId = randomUUID();
  const completionUrl = `${siteUrl.replace(/\/$/, "")}/compra/sucesso?session=${sessionId}`;
  const returnUrl = input.returnUrl || process.env.ABACATEPAY_RETURN_URL || siteUrl;
  const admin = createAdminClient();

  const { error: sessionError } = await admin.from("sales_checkout_sessions").insert({
    id: sessionId,
    status: "pending",
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail,
    buyer_phone: input.buyerPhone || null,
    buyer_document: input.buyerDocument || null,
    organization_name: input.organizationName,
    organization_document: input.organizationDocument || input.buyerDocument || null,
    plan_code: config.planCode,
    amount_cents: config.amountCents,
    currency: "BRL",
    provider: "abacatepay",
    completion_url: completionUrl,
    return_url: returnUrl,
    metadata: input.metadata || {},
  });
  if (sessionError) {
    return NextResponse.json(
      { error: `Nao foi possivel registrar a venda. Confirme se a migracao 012 foi executada. Detalhe: ${sessionError.message}` },
      { status: 500, headers },
    );
  }

  try {
    const customer = await createAbacatePayCustomer({
      name: input.buyerName,
      email: input.buyerEmail,
      cellphone: input.buyerPhone,
      taxId: input.buyerDocument,
    });
    if (!customer.id) throw new Error("A Abacate Pay nao retornou o ID do cliente.");

    const checkout = await createAbacatePaySubscriptionCheckout({
      customerId: customer.id,
      productId: config.productId,
      externalId: sessionId,
      completionUrl,
      returnUrl,
      methods: config.methods,
    });

    const checkoutUrl = getCheckoutUrl(checkout);
    if (!checkoutUrl) throw new Error("A Abacate Pay nao retornou a URL do checkout.");

    await admin
      .from("sales_checkout_sessions")
      .update({
        status: "checkout_created",
        provider_customer_id: customer.id || null,
        provider_checkout_id: checkout.id || null,
        checkout_url: checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (input.redirect) return NextResponse.redirect(checkoutUrl, { headers });
    return NextResponse.json({ sessionId, checkoutUrl }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar o checkout.";
    await admin
      .from("sales_checkout_sessions")
      .update({ status: "failed", failed_at: new Date().toISOString(), metadata: { error: message }, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({ error: message, sessionId }, { status: 500, headers });
  }
}
