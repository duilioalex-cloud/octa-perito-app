import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { loadDocumentIdentity } from "@/lib/export-loader";
import { createProfessionalTextPdf } from "@/lib/professional-pdf";
import { safeFileName } from "@/lib/report-options";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return NextResponse.redirect(new URL("/login", request.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado.", { status: 401 });
  const { data: document } = await supabase.from("generated_documents").select("title,content").eq("id", id).eq("organization_id", organization.id).maybeSingle();
  if (!document) return new NextResponse("Documento não encontrado.", { status: 404 });
  const identity = await loadDocumentIdentity({ supabase, organizationId: organization.id, organizationName: organization.name, userId: user.id });
  const bytes = await createProfessionalTextPdf({ title: document.title, content: document.content, identity });
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName(document.title)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
