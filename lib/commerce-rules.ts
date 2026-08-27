export function effectivePriceCents(regularPriceCents: number, salePriceCents: number | null) {
  if (!Number.isSafeInteger(regularPriceCents) || regularPriceCents < 0) throw new Error("Preço regular inválido.");
  if (salePriceCents === null) return regularPriceCents;
  if (!Number.isSafeInteger(salePriceCents) || salePriceCents < 0 || salePriceCents > regularPriceCents) throw new Error("Preço promocional inválido.");
  return salePriceCents;
}

export function couponDiscountCents(subtotalCents: number, kind: "percentage" | "fixed", value: number) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 || !Number.isSafeInteger(value) || value < 0) throw new Error("Dados de cupom inválidos.");
  const discount = kind === "percentage" ? Math.floor((subtotalCents * value) / 100) : value;
  return Math.min(discount, subtotalCents);
}

export function assertPaymentMatchesOrder(expectedCents: number, receivedCents: number, currency: string) {
  if (currency !== "BRL") throw new Error("Moeda do pagamento inválida.");
  if (expectedCents !== receivedCents) throw new Error("Valor do pagamento incompatível com o pedido.");
}

export function shouldSkipWebhook(status: string | null | undefined) {
  return status === "processed" || status === "ignored";
}
