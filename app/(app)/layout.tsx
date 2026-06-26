export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  return <AppShell organization={organization} userEmail={user.email || "Usuário"}>{children}</AppShell>;
}
