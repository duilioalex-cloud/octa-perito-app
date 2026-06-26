import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!["logo", "signature"].includes(kind)) return new NextResponse("Arquivo inválido.", { status: 400 });
  const organization = await getCurrentOrganization();
  if (!organization) return NextResponse.redirect(new URL("/login", request.url));
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("organization_document_settings")
    .select("logo_bucket,logo_path,signature_bucket,signature_path")
    .eq("organization_id", organization.id)
    .maybeSingle();
  const bucket = kind === "logo" ? settings?.logo_bucket : settings?.signature_bucket;
  const path = kind === "logo" ? settings?.logo_path : settings?.signature_path;
  if (!bucket || !path) return new NextResponse("Arquivo não cadastrado.", { status: 404 });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  if (error || !data?.signedUrl) return new NextResponse("Não foi possível abrir o arquivo.", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
