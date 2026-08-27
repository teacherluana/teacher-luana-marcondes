import { describe, expect, it } from "vitest";
import { downloadResponse, uploadResponse, webhookResponse } from "@/lib/route-contracts";

describe("contratos das rotas críticas", () => {
  it("trata webhook processado ou ignorado como duplicado idempotente", () => { expect(webhookResponse({ status: "processed" }).process).toBe(false); expect(webhookResponse({ status: "ignored" }).process).toBe(false); expect(webhookResponse({ status: "failed" }).process).toBe(true); });
  it("aplica respostas corretas de download protegido", () => { expect(downloadResponse({ authenticated:false,hasActivePurchase:false,orderApproved:false })).toBe(401); expect(downloadResponse({ authenticated:true,hasActivePurchase:false,orderApproved:true })).toBe(403); expect(downloadResponse({ authenticated:true,hasActivePurchase:true,orderApproved:true })).toBe(200); });
  it("exige administração e MIME permitido para upload", () => { expect(uploadResponse({ isAdmin:false,kind:"pdf",mimeType:"application/pdf" })).toBe(403); expect(uploadResponse({ isAdmin:true,kind:"pdf",mimeType:"image/png" })).toBe(400); expect(uploadResponse({ isAdmin:true,kind:"cover",mimeType:"image/webp" })).toBe(200); });
});
