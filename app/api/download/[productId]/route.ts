import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canDownload } from "@/lib/security-rules";

export async function POST(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const sessionClient = await createServerSupabaseClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const { data: purchase } = await admin.from("purchases").select("order_item_id").eq("user_id", user.id).eq("product_id", productId).eq("status", "active").maybeSingle();
  if (!purchase) return NextResponse.json({ error: "Você não possui acesso a este material." }, { status: 403 });
  const { data: orderItem } = await admin.from("order_items").select("orders!inner(status)").eq("id", purchase.order_item_id).single();
  const order = orderItem?.orders as unknown as { status?: string } | null;
  if (!canDownload({ authenticated: true, purchaseStatus: "active", orderStatus: order?.status as "pending" | "approved" | "rejected" | "cancelled" | "refunded" | null })) return NextResponse.json({ error: "O pedido não está aprovado." }, { status: 403 });
  const { data: file } = await admin.from("product_files").select("storage_path,original_filename").eq("product_id", productId).eq("is_primary", true).maybeSingle();
  if (!file) return NextResponse.json({ error: "Arquivo ainda não disponível." }, { status: 404 });
  const { data: signed, error } = await admin.storage.from("materials").createSignedUrl(file.storage_path, 60);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "Não foi possível liberar o arquivo." }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl, filename: file.original_filename });
}
