import { createClient } from "@/lib/supabase/server";

export const billingStatuses = ["trialing", "active", "past_due", "blocked", "cancelled"] as const;
export type BillingStatus = (typeof billingStatuses)[number];

export type OrganizationBillingState = {
  billing_status: BillingStatus;
  billing_plan: string | null;
  billing_blocked_at: string | null;
  billing_block_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_trial_ends_at: string | null;
};

export const billingStatusLabels: Record<BillingStatus, string> = {
  trialing: "Teste",
  active: "Ativo",
  past_due: "Vencido",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
};

export function normalizeBillingStatus(value?: string | null): BillingStatus {
  return billingStatuses.includes(value as BillingStatus) ? (value as BillingStatus) : "active";
}

export function isBillingStatus(value: string): value is BillingStatus {
  return billingStatuses.includes(value as BillingStatus);
}

export function isOrganizationBillingBlocked(state?: OrganizationBillingState | null) {
  if (!state) return false;
  return state.billing_status === "blocked" || Boolean(state.billing_blocked_at);
}

export async function getOrganizationBillingState(organizationId: string): Promise<OrganizationBillingState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "billing_status,billing_plan,billing_blocked_at,billing_block_reason,billing_current_period_ends_at,billing_trial_ends_at",
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return {
      billing_status: "active",
      billing_plan: "manual",
      billing_blocked_at: null,
      billing_block_reason: null,
      billing_current_period_ends_at: null,
      billing_trial_ends_at: null,
    };
  }

  return {
    billing_status: normalizeBillingStatus(data.billing_status),
    billing_plan: data.billing_plan ?? "manual",
    billing_blocked_at: data.billing_blocked_at ?? null,
    billing_block_reason: data.billing_block_reason ?? null,
    billing_current_period_ends_at: data.billing_current_period_ends_at ?? null,
    billing_trial_ends_at: data.billing_trial_ends_at ?? null,
  };
}
