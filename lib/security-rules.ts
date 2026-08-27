export function assertCheckoutItems(productIds: string[]) {
  if (!productIds.length) throw new Error("Carrinho vazio.");
  if (new Set(productIds).size !== productIds.length) throw new Error("Carrinho contém produtos duplicados.");
}

export function canDownload(input: { authenticated: boolean; purchaseStatus: "active" | "revoked" | null; orderStatus: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | null }) {
  return input.authenticated && input.purchaseStatus === "active" && input.orderStatus === "approved";
}

export function assertUploadMetadata(input: { kind: "pdf" | "cover" | "preview"; mimeType: string; byteSize: number }) {
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > 20 * 1024 * 1024) throw new Error("Tamanho de arquivo inválido.");
  const image = ["image/png", "image/jpeg", "image/webp"];
  if (input.kind === "pdf" && input.mimeType !== "application/pdf") throw new Error("O arquivo principal deve ser PDF.");
  if (input.kind !== "pdf" && !image.includes(input.mimeType)) throw new Error("Capa e prévia devem ser imagens permitidas.");
}
