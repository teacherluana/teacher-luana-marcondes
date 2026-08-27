"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import type { CatalogProduct, CartLine } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

const colors = ["mint", "yellow", "pink", "teal"];
export function ProductCard({ product, index = 0 }: { product: CatalogProduct; index?: number }) {
  const { add } = useCart();
  const line: CartLine = { id: product.id, title: product.title, slug: product.slug, coverUrl: product.coverUrl, regularPriceCents: product.regularPriceCents, salePriceCents: product.salePriceCents, effectivePriceCents: product.effectivePriceCents, productKind: product.productKind };
  return <article className="product-card"><Link href={`/produtos/${product.slug}`}><div className={`product-art ${colors[index % colors.length]}`} style={product.coverUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,.12), rgba(18,76,75,.12)), url(${product.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span className="badge">{product.isDemo ? "DEMO" : product.productKind === "kit" ? "Kit digital" : "Pronto para brincar"}</span><div><small>ENGLISH FUN</small><h3>{product.title}</h3></div><small>DIGITAL PRINTABLE ✂</small></div></Link><div className="product-body"><span className="category-label">{product.categoryName ?? "Material digital"}</span><Link href={`/produtos/${product.slug}`} className="product-title">{product.title}</Link>{product.salePriceCents ? <div className="old-price">{formatCurrency(product.regularPriceCents)}</div> : null}<div className="row" style={{ justifyContent:"space-between" }}><span className="price">{formatCurrency(product.effectivePriceCents)}</span><button className="icon-btn" onClick={() => add(line)} aria-label={`Adicionar ${product.title}`}>+</button></div></div></article>;
}
