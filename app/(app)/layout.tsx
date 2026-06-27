export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BillingBlockedPanel } from "@/components/billing-blocked-panel";
import { getOrganizationBillingState, isOrganizationBillingBlocked } from "@/lib/billing";
import { getCurrentOrganization } from "@/lib/current-organization";
import { getPlatformAdminStatus } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");

  const [isPlatformAdmin, billingState] = await Promise.all([
    getPlatformAdminStatus(),
    getOrganizationBillingState(organization.id),
  ]);

  const content =
    isOrganizationBillingBlocked(billingState) && !isPlatformAdmin ? (
      <BillingBlockedPanel organizationName={organization.name} billingState={billingState} />
    ) : (
      children
    );

  return (
    <AppShell
      organization={organization}
      userEmail={user.email || "Usuario"}
      isPlatformAdmin={isPlatformAdmin}
      billingState={billingState}
    >
      {content}
    </AppShell>
  );
}
