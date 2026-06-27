const DEFAULT_ABACATEPAY_API_URL = "https://api.abacatepay.com/v2";

type AbacatePayResponse<T> = {
  data?: T;
  error?: unknown;
  success?: boolean;
};

export type AbacatePayCustomer = {
  id?: string;
  name?: string;
  email?: string;
  cellphone?: string;
  taxId?: string;
};

export type AbacatePayCheckout = {
  id?: string;
  url?: string;
  checkoutUrl?: string;
  paymentUrl?: string;
};

export type AbacatePayPlanKind = "monthly" | "annual";

export type AbacatePayPlanConfig = {
  kind: AbacatePayPlanKind;
  mode: "subscription" | "checkout";
  productId?: string;
  productName: string;
  productDescription: string;
  planCode: string;
  amountCents: number;
  accessMonths: number;
  methods: string[];
  maxInstallments?: number;
};

function readAmountCents(value: string | undefined, fallback: number) {
  const amount = Number(value || "");
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const number = Number(value || "");
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function parseMethods(value: string | undefined, fallback = "CARD") {
  const methods = (value || fallback)
    .split(",")
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);

  return methods.length ? methods : ["CARD"];
}

export function getAbacatePayConfig() {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  const productId = process.env.ABACATEPAY_PRODUCT_ID;
  const baseUrl = process.env.ABACATEPAY_API_BASE_URL || DEFAULT_ABACATEPAY_API_URL;
  const planCode = process.env.ABACATEPAY_PLAN_CODE || "octa-perito-mensal";
  const amountCents = Number(process.env.ABACATEPAY_AMOUNT_CENTS || "0");
  const methods = parseMethods(process.env.ABACATEPAY_PAYMENT_METHODS);

  return {
    apiKey,
    productId,
    baseUrl,
    planCode,
    amountCents: Number.isFinite(amountCents) ? amountCents : 0,
    methods,
  };
}

export function getAbacatePayPlanConfig(kind: AbacatePayPlanKind): AbacatePayPlanConfig {
  if (kind === "annual") {
    return {
      kind,
      mode: "checkout",
      productId: process.env.ABACATEPAY_ANNUAL_PRODUCT_ID || undefined,
      productName: process.env.ABACATEPAY_ANNUAL_PRODUCT_NAME || "OCTA Perito Anual",
      productDescription:
        process.env.ABACATEPAY_ANNUAL_PRODUCT_DESCRIPTION || "Acesso anual ao OCTA Perito com parcelamento em ate 12x.",
      planCode: process.env.ABACATEPAY_ANNUAL_PLAN_CODE || "octa-perito-anual",
      amountCents: readAmountCents(process.env.ABACATEPAY_ANNUAL_AMOUNT_CENTS, 179880),
      accessMonths: readPositiveInteger(process.env.ABACATEPAY_ANNUAL_ACCESS_MONTHS, 12),
      methods: parseMethods(process.env.ABACATEPAY_ANNUAL_PAYMENT_METHODS, process.env.ABACATEPAY_PAYMENT_METHODS || "CARD"),
      maxInstallments: readPositiveInteger(process.env.ABACATEPAY_ANNUAL_MAX_INSTALLMENTS, 12),
    };
  }

  const legacy = getAbacatePayConfig();
  return {
    kind,
    mode: "subscription",
    productId: process.env.ABACATEPAY_MONTHLY_PRODUCT_ID || legacy.productId || undefined,
    productName: process.env.ABACATEPAY_MONTHLY_PRODUCT_NAME || "OCTA Perito Mensal",
    productDescription: process.env.ABACATEPAY_MONTHLY_PRODUCT_DESCRIPTION || "Assinatura mensal do OCTA Perito.",
    planCode: process.env.ABACATEPAY_MONTHLY_PLAN_CODE || legacy.planCode || "octa-perito-mensal",
    amountCents: readAmountCents(process.env.ABACATEPAY_MONTHLY_AMOUNT_CENTS, legacy.amountCents || 29700),
    accessMonths: readPositiveInteger(process.env.ABACATEPAY_MONTHLY_ACCESS_MONTHS, 1),
    methods: parseMethods(process.env.ABACATEPAY_MONTHLY_PAYMENT_METHODS, process.env.ABACATEPAY_PAYMENT_METHODS || "CARD"),
  };
}

export function getCheckoutUrl(checkout: AbacatePayCheckout) {
  return checkout.url || checkout.checkoutUrl || checkout.paymentUrl || "";
}

async function requestAbacatePay<T>(path: string, body: unknown): Promise<T> {
  const { apiKey, baseUrl } = getAbacatePayConfig();
  if (!apiKey) throw new Error("Configure ABACATEPAY_API_KEY na Vercel.");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as AbacatePayResponse<T>;
  if (!response.ok || payload.error) {
    const detail =
      typeof payload.error === "string"
        ? payload.error
        : payload.error && typeof payload.error === "object"
          ? JSON.stringify(payload.error)
          : response.statusText;
    throw new Error(`Abacate Pay retornou erro: ${detail}`);
  }

  return (payload.data ?? payload) as T;
}

export async function createAbacatePayCustomer(input: {
  name: string;
  email: string;
  cellphone?: string;
  taxId?: string;
}) {
  try {
    return await requestAbacatePay<AbacatePayCustomer>("customers/create", input);
  } catch (error) {
    return requestAbacatePay<AbacatePayCustomer>("customers/create", { data: input });
  }
}

export async function createAbacatePaySubscriptionCheckout(input: {
  customerId: string;
  productId: string;
  externalId: string;
  completionUrl: string;
  returnUrl: string;
  methods: string[];
}) {
  return requestAbacatePay<AbacatePayCheckout>("subscriptions/create", {
    customerId: input.customerId,
    externalId: input.externalId,
    completionUrl: input.completionUrl,
    returnUrl: input.returnUrl,
    items: [{ id: input.productId, quantity: 1 }],
    methods: input.methods,
  });
}

export async function createAbacatePayOneTimeCheckout(input: {
  customerId?: string;
  customer: {
    name: string;
    email: string;
    cellphone?: string;
    taxId?: string;
  };
  plan: AbacatePayPlanConfig;
  externalId: string;
  completionUrl: string;
  returnUrl: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.plan.productId) {
    throw new Error("Configure ABACATEPAY_ANNUAL_PRODUCT_ID na Vercel com o ID do produto anual da Abacate Pay.");
  }

  return requestAbacatePay<AbacatePayCheckout>("checkouts/create", {
    customerId: input.customerId,
    externalId: input.externalId,
    completionUrl: input.completionUrl,
    returnUrl: input.returnUrl,
    items: [{ id: input.plan.productId, quantity: 1 }],
    methods: input.plan.methods,
    card: { maxInstallments: input.plan.maxInstallments || 12 },
    metadata: input.metadata || {},
  });
}
