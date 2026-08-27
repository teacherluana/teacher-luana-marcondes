"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/types/domain";

type CartContextValue = { items: CartLine[]; add: (item: CartLine) => void; remove: (id: string) => void; clear: () => void; totalCents: number };
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  useEffect(() => { const raw = window.localStorage.getItem("luana-cart"); if (raw) setItems(JSON.parse(raw) as CartLine[]); }, []);
  useEffect(() => { window.localStorage.setItem("luana-cart", JSON.stringify(items)); }, [items]);
  const value = useMemo(() => ({ items, add: (item: CartLine) => setItems((current) => current.some((line) => line.id === item.id) ? current : [...current, item]), remove: (id: string) => setItems((current) => current.filter((line) => line.id !== id)), clear: () => setItems([]), totalCents: items.reduce((total, item) => total + item.effectivePriceCents, 0) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("CartProvider ausente."); return value; }
