import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({ email: z.string().trim().email().max(320) });
export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    const db = createAdminSupabaseClient();
    const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    await db.from("email_events").insert({ user_id: profile?.id ?? null, template: "account_recovery", status: "delegated_to_supabase", payload: { email } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
