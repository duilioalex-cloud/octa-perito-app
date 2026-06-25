"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export async function createProcessAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const processNumber = String(formData.get("process_number") || "").trim();
  if (processNumber.length < 5) redirect("/processos/novo?error=Informe o número do processo.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    organization_id: organization.id,
    process_number: processNumber,
    court: String(formData.get("court") || "").trim() || null,
    district: String(formData.get("district") || "").trim() || null,
    division: String(formData.get("division") || "").trim() || null,
    plaintiff: String(formData.get("plaintiff") || "").trim() || null,
    defendant: String(formData.get("defendant") || "").trim() || null,
    subject: String(formData.get("subject") || "").trim() || null,
    expertise_type: String(formData.get("expertise_type") || "judicial_expert"),
    status: "appointment_received",
    appointed_at: String(formData.get("appointed_at") || "") || null,
    report_due_at: String(formData.get("report_due_at") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  };

  const { data, error } = await supabase.from("processes").insert(payload).select("id").single();
  if (error || !data) redirect(`/processos/novo?error=${encodeURIComponent("Não foi possível cadastrar o processo.")}`);
  revalidatePath("/dashboard");
  revalidatePath("/processos");
  redirect(`/processos/${data.id}`);
}
