import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  if (!organization) return NextResponse.redirect(new URL("/login", request.url));
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("expert_report_attachments")
    .select("storage_bucket,storage_path")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!attachment) return new NextResponse("Anexo não encontrado.", { status: 404 });
  const { data, error } = await supabase.storage.from(attachment.storage_bucket).createSignedUrl(attachment.storage_path, 60);
  if (error || !data?.signedUrl) return new NextResponse("Não foi possível abrir o arquivo.", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
