import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Arquivo não informado." },
        { status: 400 }
      );
    }

    const db = createAdminSupabaseClient();

    const { data, error } = await db.storage
      .from("materials")
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      throw new Error(
        error?.message ?? "Não foi possível gerar o acesso ao arquivo."
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não autorizado.",
      },
      { status: 403 }
    );
  }
}