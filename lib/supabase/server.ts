import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values: Array<{ name: string; value: string; options: Record<string, unknown> }>) { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server components cannot persist cookies. */ } },
    },
  });
}
