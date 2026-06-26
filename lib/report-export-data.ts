import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportExportInput } from "@/lib/export-types";
import { loadDocumentIdentity, loadOptimizedExportImage } from "@/lib/export-loader";

export async function loadReportExportInput(input: {
  supabase: SupabaseClient;
  organizationId: string;
  organizationName: string;
  userId: string;
  reportId: string;
}): Promise<ReportExportInput | null> {
  const { supabase, organizationId, organizationName, userId, reportId } = input;
  const { data: report } = await supabase
    .from("expert_reports")
    .select("title,report_date,notes,process_id")
    .eq("id", reportId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!report) return null;

  const [
    { data: process },
    { data: sections },
    { data: questions },
    { data: sources },
    { data: equipment },
    { data: attachments },
    identity,
  ] = await Promise.all([
    supabase.from("processes").select("process_number,court,district,division,case_class,plaintiff,defendant,subject").eq("id", report.process_id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("expert_report_sections").select("title,content,is_enabled,sort_order").eq("report_id", reportId).order("sort_order"),
    supabase.from("expert_report_questions").select("origin,origin_label,question_number,question,answer,answer_status,sort_order").eq("report_id", reportId).order("origin").order("sort_order"),
    supabase.from("expert_report_sources").select("source_type,title,reference_label,description,source_date,sort_order").eq("report_id", reportId).order("sort_order"),
    supabase.from("expert_report_equipment").select("name,brand,model,serial_number,calibration_certificate,calibration_date,calibration_due_date,usage_description,sort_order").eq("report_id", reportId).order("sort_order"),
    supabase.from("expert_report_attachments").select("id,file_type,original_name,caption,description,location_text,captured_at,sort_order,storage_bucket,storage_path,mime_type").eq("report_id", reportId).order("sort_order"),
    loadDocumentIdentity({ supabase, organizationId, organizationName, userId }),
  ]);
  if (!process) return null;

  const exportAttachments = await Promise.all((attachments || []).map(async (attachment) => ({
    ...attachment,
    asset: attachment.mime_type?.startsWith("image/")
      ? await loadOptimizedExportImage({ supabase, bucket: attachment.storage_bucket, path: attachment.storage_path, mimeType: attachment.mime_type, name: attachment.original_name })
      : null,
  })));

  return {
    report,
    process,
    sections: sections || [],
    questions: questions || [],
    sources: sources || [],
    equipment: equipment || [],
    attachments: exportAttachments,
    identity,
  } as ReportExportInput;
}
