import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { StorefrontHeader } from "@/components/Storefront";
const links=[['Visão geral','/admin'],['Produtos','/admin/produtos'],['Novo produto','/admin/produtos/novo'],['Pedidos','/admin/pedidos'],['Clientes','/admin/clientes'],['Categorias','/admin/categorias'],['Cupons','/admin/cupons'],['Configurações','/admin/configuracoes']];
export default async function AdminLayout({children}:{children:React.ReactNode}){await requireAdmin();return <><StorefrontHeader isAdmin/><div className="admin-layout"><aside className="admin-nav"><b>Painel administrativo</b>{links.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</aside><main className="admin-content">{children}</main></div></>;}
