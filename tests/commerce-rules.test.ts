import { describe, expect, it } from "vitest";
import { assertPaymentMatchesOrder, couponDiscountCents, effectivePriceCents, shouldSkipWebhook } from "@/lib/commerce-rules";
import { assertCheckoutItems, assertUploadMetadata, canDownload } from "@/lib/security-rules";

describe("regras comerciais independentes", () => {
  it("usa preço promocional quando existir", () => { expect(effectivePriceCents(3490, 2790)).toBe(2790); expect(effectivePriceCents(3490, null)).toBe(3490); });
  it("não aceita promoção acima do preço regular", () => { expect(() => effectivePriceCents(1000, 1001)).toThrow("Preço promocional inválido"); });
  it("limita desconto ao subtotal", () => { expect(couponDiscountCents(1000, "percentage", 10)).toBe(100); expect(couponDiscountCents(1000, "fixed", 9999)).toBe(1000); });
  it("valida valor e moeda recebidos do provedor", () => { expect(() => assertPaymentMatchesOrder(1000, 999, "BRL")).toThrow(); expect(() => assertPaymentMatchesOrder(1000, 1000, "USD")).toThrow(); expect(() => assertPaymentMatchesOrder(1000, 1000, "BRL")).not.toThrow(); });
  it("identifica webhook processado como idempotente", () => { expect(shouldSkipWebhook("processed")).toBe(true); expect(shouldSkipWebhook("ignored")).toBe(true); expect(shouldSkipWebhook("failed")).toBe(false); });
  it("bloqueia checkout com itens duplicados", () => { expect(() => assertCheckoutItems([])).toThrow(); expect(() => assertCheckoutItems(["a", "a"])).toThrow(); expect(() => assertCheckoutItems(["a", "b"])).not.toThrow(); });
  it("libera download apenas para compra ativa e pedido aprovado", () => { expect(canDownload({ authenticated:true,purchaseStatus:"active",orderStatus:"approved" })).toBe(true); expect(canDownload({ authenticated:true,purchaseStatus:"revoked",orderStatus:"approved" })).toBe(false); expect(canDownload({ authenticated:true,purchaseStatus:"active",orderStatus:"refunded" })).toBe(false); });
  it("valida arquivos privados antes do upload", () => { expect(() => assertUploadMetadata({kind:"pdf",mimeType:"image/png",byteSize:12})).toThrow(); expect(() => assertUploadMetadata({kind:"cover",mimeType:"application/pdf",byteSize:12})).toThrow(); expect(() => assertUploadMetadata({kind:"pdf",mimeType:"application/pdf",byteSize:21*1024*1024})).toThrow(); expect(() => assertUploadMetadata({kind:"preview",mimeType:"image/webp",byteSize:12})).not.toThrow(); });
});
