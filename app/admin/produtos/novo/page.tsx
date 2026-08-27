import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ProductEditor } from "@/components/ProductEditor";
export const dynamic="force-dynamic";
export default async function NewProductPage(){const db=createAdminSupabaseClient();const [{data:materials},{data:categories}]=await Promise.all([db.from('products').select('id,title').neq('status','archived').order('title'),db.from('categories').select('id,name').eq('is_active',true).order('sort_order')]);return <><p className="eyebrow">Catálogo</p><h1 style={{marginTop:14,fontSize:46}}>Novo material</h1><div style={{marginTop:24}}><ProductEditor product={null} materials={materials??[]} categories={categories??[]}/></div></>;}
