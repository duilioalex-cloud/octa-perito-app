import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Permission } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireCurrentOrganization(permission?: Permission): Promise<CurrentOrganization> {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  if (permission && !hasPermission(organization.role, permission)) redirect("/acesso-negado");
  return organization;
}

export async function getCurrentOrganization(): Promise<CurrentOrganization | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.organizations) return null;
  const organization = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;

  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    role: data.role,
  } as CurrentOrganization;
}
