import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

type PreferenceInput = { externalReference: string; title: string; totalCents: number; notificationUrl: string; successUrl: string; pendingUrl: string; failureUrl: string };

export async function createMercadoPagoPreference(input: PreferenceInput) {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.mercadoPagoToken()}`, "Content-Type": "application/json", "X-Idempotency-Key": input.externalReference },
    body: JSON.stringify({ external_reference: input.externalReference, items: [{ title: input.title, quantity: 1, unit_price: input.totalCents / 100, currency_id: "BRL" }], notification_url: input.notificationUrl, back_urls: { success: input.successUrl, pending: input.pendingUrl, failure: input.failureUrl }, auto_return: "approved" }),
  });
  if (!response.ok) throw new Error("Não foi possível criar o checkout do Mercado Pago.");
  const data = await response.json() as { id: string; init_point?: string; sandbox_init_point?: string };
  return { preferenceId: data.id, checkoutUrl: data.init_point ?? data.sandbox_init_point };
}

export async function fetchMercadoPagoPayment(id: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${env.mercadoPagoToken()}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível consultar o pagamento no Mercado Pago.");
  return response.json() as Promise<{ id: number; status: string; external_reference?: string; transaction_amount: number; currency_id: string; payment_type_id?: string }>;
}

export function mapMercadoPagoStatus(status: string) {
  if (status === "approved") return "approved" as const;
  if (["rejected", "cancelled"].includes(status)) return status === "cancelled" ? "cancelled" as const : "rejected" as const;
  if (status === "refunded") return "refunded" as const;
  return "pending" as const;
}

export function verifyMercadoPagoSignature(input: { signature: string | null; requestId: string | null; dataId: string }) {
  if (!input.signature || !input.requestId || !input.dataId) return false;
  const values = Object.fromEntries(input.signature.split(",").map((part) => part.trim().split("=") as [string, string]));
  const timestamp = values.ts; const actual = values.v1;
  if (!timestamp || !actual) return false;
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", env.mercadoPagoWebhookSecret()).update(manifest).digest("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
