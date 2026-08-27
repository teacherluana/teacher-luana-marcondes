"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
export async function saveCategory(formData:FormData){await requireAdmin();const name=String(formData.get('name')||'').trim();if(!name)throw new Error('Informe o nome.');const db=createAdminSupabaseClient();const {error}=await db.from('categories').upsert({id:String(formData.get('id')||undefined),name,slug:slugify(String(formData.get('slug')||name)),description:String(formData.get('description')||'')||null,is_active:formData.get('is_active')==='on'},{onConflict:'id'});if(error)throw new Error(error.message);revalidatePath('/admin/categorias');revalidatePath('/produtos');}
