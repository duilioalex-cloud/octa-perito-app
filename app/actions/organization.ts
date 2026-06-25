"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 55);
}

export async function createOrganizationAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const professionalTitle = String(formData.get("professional_title") || "").trim();
  const council = String(formData.get("council") || "").trim();
  const councilNumber = String(formData.get("council_number") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (name.length < 3) redirect("/onboarding?error=Informe o nome do escritório.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("profiles").update({
    professional_title: professionalTitle || null,
    council: council || null,
    council_number: councilNumber || null,
    phone: phone || null,
  }).eq("id", user.id);

  const baseSlug = slugify(name) || "escritorio";
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;
  const { data: organization, error } = await supabase.from("organizations").insert({
    name,
    slug,
    owner_id: user.id,
  }).select("id").single();

  if (error || !organization) redirect(`/onboarding?error=${encodeURIComponent("Não foi possível criar o escritório.")}`);

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) redirect(`/onboarding?error=${encodeURIComponent("Escritório criado, mas o acesso não foi vinculado.")}`);
  redirect("/dashboard");
}
