import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { buildReportText, createReportDocx } from "@/lib/report-docx";
import { safeFileName } from "@/lib/report-options";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return NextResponse.redirect(new URL("/login", _request.url));
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("expert_reports")
    .select("title,report_date,notes,process_id")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!report) return new NextResponse("Laudo não encontrado.", { status: 404 });

  const [
    { data: process },
    { data: sections },
    { data: questions },
    { data: sources },
    { data: equipment },
    { data: attachments },
  ] = await Promise.all([
    supabase.from("processes").select("process_number,court,district,division,case_class,plaintiff,defendant,subject").eq("id", report.process_id).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("expert_report_sections").select("title,content,is_enabled,sort_order").eq("report_id", id).order("sort_order"),
    supabase.from("expert_report_questions").select("origin,origin_label,question_number,question,answer,answer_status,sort_order").eq("report_id", id).order("origin").order("sort_order"),
    supabase.from("expert_report_sources").select("source_type,title,reference_label,description,source_date,sort_order").eq("report_id", id).order("sort_order"),
    supabase.from("expert_report_equipment").select("name,brand,model,serial_number,calibration_certificate,calibration_date,calibration_due_date,usage_description,sort_order").eq("report_id", id).order("sort_order"),
    supabase.from("expert_report_attachments").select("file_type,original_name,caption,description,location_text,captured_at,sort_order").eq("report_id", id).order("sort_order"),
  ]);

  if (!process) return new NextResponse("Processo não encontrado.", { status: 404 });
  const content = buildReportText({
    report,
    process,
    sections: sections || [],
    questions: questions || [],
    sources: sources || [],
    equipment: equipment || [],
    attachments: attachments || [],
  });
  const bytes = createReportDocx(report.title, content);
  const fileName = `${safeFileName(report.title)}.docx`;
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
