export type WebhookRecord = { status: "received" | "processed" | "ignored" | "failed" } | null;

export function webhookResponse(existing: WebhookRecord) {
  return existing?.status === "processed" || existing?.status === "ignored" ? { process: false, httpStatus: 200 } : { process: true, httpStatus: 200 };
}

export function downloadResponse(input: { authenticated: boolean; hasActivePurchase: boolean; orderApproved: boolean }) {
  if (!input.authenticated) return 401;
  if (!input.hasActivePurchase || !input.orderApproved) return 403;
  return 200;
}

export function uploadResponse(input: { isAdmin: boolean; mimeType: string; kind: "pdf" | "cover" | "preview" }) {
  if (!input.isAdmin) return 403;
  if (input.kind === "pdf") return input.mimeType === "application/pdf" ? 200 : 400;
  return ["image/png", "image/jpeg", "image/webp"].includes(input.mimeType) ? 200 : 400;
}
