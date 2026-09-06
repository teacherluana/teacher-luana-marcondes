import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductVisual } from "@/components/ProductVisual";
import { getProduct } from "@/lib/catalog";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getProduct(slug);

  if (!data) {
    notFound();
  }

  const { product, kitItems, previews } = data;

  const line = {
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
    <>
      <main className="page container">
        <Link className="link" href="/produtos">
          ← Voltar ao catálogo
        </Link>

        <div
          className="split"
          style={{ marginTop: 24 }}
        >
          <section>
            <ProductVisual
              title={product.title}
              coverUrl={product.coverUrl}
              variant="detail"
            />

            {previews.length ? (
              <div
                className="product-grid"
                style={{ marginTop: 18 }}
              >
                {previews.map((preview) => (
                  <div
                    className="panel"
                    key={preview.storage_path}
                  >
                    {preview.url ? (
                      <Image
                        src={preview.url}
                        alt={
                          preview.alt_text ??
                          `Prévia de ${product.title}`
                        }
                        width={640}
                        height={480}
                        unoptimized
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: 12,
                        }}
                      />
                    ) : (
                      <span>
                        Prévia indisponível
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div
              className="panel"
              style={{ marginTop: 18 }}
            >
              <p className="eyebrow">
                Detalhes do material
              </p>

              <p
                className="lead"
                style={{ maxWidth: "none" }}
              >
                {product.description}
              </p>

              <div className="row">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="badge"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {product.productKind === "kit" ? (
                <div style={{ marginTop: 24 }}>
                  <h2 style={{ fontSize: 28 }}>
                    O que vem neste kit
                  </h2>

                  <ul>
                    {kitItems.map((item) => (
                      <li
                        key={
                          item.included_product_id
                        }
                      >
                        {item.products?.title ??
                          "Material incluso"}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>

          <aside
            className="panel"
            style={{ height: "max-content" }}
          >
            <p className="eyebrow">
              Material digital
            </p>

            <h2 style={{ marginTop: 14 }}>
              {product.title}
            </h2>

            <p style={{ color: "var(--muted)" }}>
              {product.shortDescription ??
                "Material lúdico para enriquecer sua aula."}
            </p>

            {product.salePriceCents ? (
              <p className="old-price">
                {formatCurrency(
                  product.regularPriceCents
                )}
              </p>
            ) : null}

            <p
              className="price"
              style={{ fontSize: 34 }}
            >
              {formatCurrency(
                product.effectivePriceCents
              )}
            </p>

            <div className="stack">
              <AddToCartButton product={line} />

              <Link
                className="button secondary"
                href="/carrinho"
              >
                Ver carrinho
              </Link>
            </div>

            <hr
              style={{
                border: 0,
                borderTop:
                  "1px solid var(--line)",
                margin: "22px 0",
              }}
            />

            <p
              style={{
                fontSize: 14,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              ✓ Checkout seguro pela Hotmart.
              <br />
              ✓ Pagamento processado pela
              Hotmart.
              <br />
              ✓ Acesso ao material após a
              confirmação do pagamento.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}