"use client";
import { useCart } from "@/components/CartProvider";
import type { CartLine } from "@/types/domain";

export function AddToCartButton({ product }: { product: CartLine }) { const { add } = useCart(); return <button className="button" onClick={() => add(product)}>Adicionar ao carrinho +</button>; }
