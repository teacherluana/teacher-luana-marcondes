"use client";

import Link from "next/link";

import { useCart } from "@/components/CartProvider";
import { ProductCover } from "@/components/ProductCover";
import type {
  CartLine,
  CatalogProduct,
} from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({
  product,
  index = 0,
}: {
  product: CatalogProduct;
  index?: number;
}) {
  const { add } = useCart();

  const line: CartLine = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    coverUrl: product.coverUrl,
    regularPriceCents:
      product.regularPriceCents,
    salePriceCents:
      product.salePriceCents,
    effectivePriceCents:
      product.effectivePriceCents,
    productKind: product.productKind,
    hotmart_offer_code:
      product.hotmart_offer_code,
  };

  return (
    <article className="product-card">
      <Link href={`/produtos/${product.slug}`}>
        <ProductCover
          title={product.title}
          description={product.shortDescription}
          category={product.categoryName}
          priceCents={product.effectivePriceCents}
        />
      </Link>

      <div className="product-body">
        <span className="category-label">
          {product.categoryName ??
            "Material digital"}
        </span>

        <Link
          href={`/produtos/${product.slug}`}
          className="product-title"
        >
          {product.title}
        </Link>

        {product.salePriceCents ? (
          <div className="old-price">
            {formatCurrency(
              product.regularPriceCents
            )}
          </div>
        ) : null}

        <div
          className="row"
          style={{
            justifyContent: "space-between",
          }}
        >
          <span className="price">
            {formatCurrency(
              product.effectivePriceCents
            )}
          </span>

          <button
            className="icon-btn"
            onClick={() => add(line)}
            aria-label={`Adicionar ${product.title}`}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}