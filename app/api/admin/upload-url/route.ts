import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertUploadMetadata } from "@/lib/security-rules";

const schema = z.object({ productId: z.string().uuid(), kind: z.enum(["pdf", "cover", "preview"]), filename: z.string().min(3).max(180), contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]) });

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());
    assertUploadMetadata({ kind: input.kind, mimeType: input.contentType, byteSize: 1 });
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `products/${input.productId}/${input.kind}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await createAdminSupabaseClient().storage.from("materials").createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "Não foi possível autorizar o upload.");
    return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não autorizado." }, { status: 400 });
  }
}
