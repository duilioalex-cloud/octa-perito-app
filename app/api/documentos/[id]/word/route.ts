import { createClient } from "@/lib/supabase/server";
import { createDocx } from "@/lib/docx";

function filename(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "documento_octa"; }

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return new Response("Não autorizado", { status: 401 });
  const { data: document } = await supabase.from("generated_documents").select("title,content").eq("id", id).maybeSingle();
  if (!document) return new Response("Documento não encontrado", { status: 404 });
  const bytes = createDocx(document.title, document.content);
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${filename(document.title)}.docx"`, "Cache-Control": "no-store" } });
}
