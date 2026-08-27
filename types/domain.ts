export type UserRole = "user" | "admin";
export type ProductKind = "individual" | "kit";
export type OrderStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";
export type PurchaseStatus = "active" | "revoked";

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  regularPriceCents: number;
  salePriceCents: number | null;
  effectivePriceCents: number;
  productKind: ProductKind;
  gradeLevel: string | null;
  materialType: string | null;
  coverUrl: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: string[];
  isDemo: boolean;
};

export type CartLine = Pick<CatalogProduct, "id" | "title" | "slug" | "coverUrl" | "regularPriceCents" | "salePriceCents" | "effectivePriceCents" | "productKind">;
