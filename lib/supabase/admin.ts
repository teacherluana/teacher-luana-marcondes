import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createAdminSupabaseClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
