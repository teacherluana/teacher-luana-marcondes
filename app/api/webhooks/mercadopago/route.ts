import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchMercadoPagoPayment, mapMercadoPagoStatus, verifyMercadoPagoSignature } from "@/lib/mercadopago";
import { sendTransactionalEmail } from "@/lib/email";
import { shouldSkipWebhook } from "@/lib/commerce-rules";
import { webhookResponse } from "@/lib/route-contracts";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { id?: string | number; type?: string; action?: string; data?: { id?: string | number } };
  const url = new URL(request.url); const dataId = String(url.searchParams.get("data.id") ?? url.searchParams.get("data_id") ?? payload.data?.id ?? "");
  const requestId = request.headers.get("x-request-id");
  if (!verifyMercadoPagoSignature({ signature: request.headers.get("x-signature"), requestId, dataId })) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  if (!dataId) return NextResponse.json({ error: "Pagamento ausente." }, { status: 400 });
  const eventId = String(payload.id ?? requestId ?? `payment:${dataId}`);
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("webhook_events").select("id,status").eq("provider", "mercadopago").eq("external_event_id", eventId).maybeSingle();
  if (shouldSkipWebhook(existing?.status) || !webhookResponse(existing as { status: "received" | "processed" | "ignored" | "failed" } | null).process) return NextResponse.json({ received: true, duplicate: true });
  if (existing) await admin.from("webhook_events").update({ status: "received", error_message: null }).eq("id", existing.id);
  else await admin.from("webhook_events").insert({ provider: "mercadopago", external_event_id: eventId, external_resource_id: dataId, topic: payload.type ?? payload.action, signature_valid: true, payload });
  try {
    const payment = await fetchMercadoPagoPayment(dataId);
    if (!payment.external_reference) throw new Error("Pagamento sem referência vinculável.");
    const status = mapMercadoPagoStatus(payment.status);
    const { data: rawResult, error } = await admin.rpc("approve_payment_and_grant", { p_external_reference: payment.external_reference, p_payment_id: String(payment.id), p_amount_cents: Math.round(payment.transaction_amount * 100), p_currency: payment.currency_id, p_status: status, p_payload: payment }).single();
    if (error || !rawResult) throw new Error(error?.message ?? "Não foi possível processar o pagamento.");
    const result = rawResult as unknown as { order_id: string; user_id: string; approved_now: boolean };
    if (status === "refunded" || status === "cancelled") {
      await admin.from("orders").update({ status }).eq("id", result.order_id);
      await admin.rpc("revoke_order_purchases", { p_order_id: result.order_id, p_reason: status });
    }
    await admin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "mercadopago").eq("external_event_id", eventId);
    if (result.approved_now) await sendTransactionalEmail({ userId: result.user_id, orderId: result.order_id, template: "payment_approved" });
    else if (status === "pending") await sendTransactionalEmail({ userId: result.user_id, orderId: result.order_id, template: "payment_pending" });
    else if (status === "rejected") await sendTransactionalEmail({ userId: result.user_id, orderId: result.order_id, template: "payment_rejected" });
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("webhook_events").update({ status: "failed", error_message: error instanceof Error ? error.message : "Erro desconhecido" }).eq("provider", "mercadopago").eq("external_event_id", eventId);
    return NextResponse.json({ error: "Evento recebido, mas não processado." }, { status: 500 });
  }
}
