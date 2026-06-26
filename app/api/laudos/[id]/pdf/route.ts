import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { loadReportExportInput } from "@/lib/report-export-data";
import { createProfessionalReportPdf } from "@/lib/professional-pdf";
import { safeFileName } from "@/lib/report-options";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return NextResponse.redirect(new URL("/login", request.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado.", { status: 401 });
  const input = await loadReportExportInput({ supabase, organizationId: organization.id, organizationName: organization.name, userId: user.id, reportId: id });
  if (!input) return new NextResponse("Laudo não encontrado.", { status: 404 });
  const bytes = await createProfessionalReportPdf(input);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(input.report.title)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
