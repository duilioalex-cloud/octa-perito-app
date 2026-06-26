"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

function toIsoDateTime(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createDeadlineAction(processId: string, formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  const dueAt = toIsoDateTime(formData.get("due_at"));
  if (title.length < 3 || !dueAt) {
    redirect(`/processos/${processId}?error=${encodeURIComponent("Informe o título e a data do prazo.")}`);
  }

  const { error } = await supabase.from("process_deadlines").insert({
    organization_id: organization.id,
    process_id: processId,
    title,
    due_at: dueAt,
    category: String(formData.get("category") || "other"),
    priority: String(formData.get("priority") || "normal"),
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.id,
  });

  if (error) redirect(`/processos/${processId}?error=${encodeURIComponent("Não foi possível cadastrar o prazo.")}`);

  await supabase.from("process_activities").insert({
    organization_id: organization.id,
    process_id: processId,
    activity_type: "deadline_created",
    description: `Prazo cadastrado: ${title}`,
    created_by: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/processos/${processId}`);
  redirect(`/processos/${processId}?success=${encodeURIComponent("Prazo cadastrado com sucesso.")}`);
}

export async function completeDeadlineAction(processId: string, deadlineId: string) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("process_deadlines")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", deadlineId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id);

  if (error) redirect(`/processos/${processId}?error=${encodeURIComponent("Não foi possível concluir o prazo.")}`);

  await supabase.from("process_activities").insert({
    organization_id: organization.id,
    process_id: processId,
    activity_type: "deadline_completed",
    description: "Prazo marcado como concluído.",
    created_by: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/processos/${processId}`);
}
