import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function checkPlatformAdmin(supabase: SupabaseServerClient, userId: string) {
  const rpcResult = await supabase.rpc("is_platform_admin");
  if (!rpcResult.error) return Boolean(rpcResult.data);

  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function getPlatformAdminStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;
  return checkPlatformAdmin(supabase, user.id);
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = await checkPlatformAdmin(supabase, user.id);
  if (!isAdmin) redirect("/acesso-negado");

  return user;
}
