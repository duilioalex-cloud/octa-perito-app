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
};

export function getAbacatePayConfig() {
  const apiKey = process.env.ABACATEPAY_API_KEY;
  const productId = process.env.ABACATEPAY_PRODUCT_ID;
  const baseUrl = process.env.ABACATEPAY_API_BASE_URL || DEFAULT_ABACATEPAY_API_URL;
  const planCode = process.env.ABACATEPAY_PLAN_CODE || "octa-perito-mensal";
  const amountCents = Number(process.env.ABACATEPAY_AMOUNT_CENTS || "0");
  const methods = (process.env.ABACATEPAY_PAYMENT_METHODS || "CARD")
    .split(",")
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean);

  return {
    apiKey,
    productId,
    baseUrl,
    planCode,
    amountCents: Number.isFinite(amountCents) ? amountCents : 0,
    methods: methods.length ? methods : ["CARD"],
  };
}

export function getCheckoutUrl(checkout: AbacatePayCheckout) {
  return checkout.url || checkout.checkoutUrl || "";
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
