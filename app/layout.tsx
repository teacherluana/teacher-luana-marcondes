import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = { title: "Luana Marcondes | Inglês para anos iniciais", description: "Materiais digitais lúdicos para aulas de inglês nos anos iniciais." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body><CartProvider>{children}</CartProvider></body></html>; }
