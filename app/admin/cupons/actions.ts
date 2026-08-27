"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
export async function saveCoupon(formData:FormData){await requireAdmin();const code=String(formData.get('code')||'').trim().toUpperCase();if(!code)throw new Error('Informe o código.');const {error}=await createAdminSupabaseClient().from('coupons').insert({code,description:String(formData.get('description')||'')||null,discount_type:String(formData.get('discount_type'))==='fixed'?'fixed':'percentage',discount_value:Math.round(Number(formData.get('discount_value')||0)),min_order_cents:Math.round(Number(formData.get('min_order')||0)*100),max_uses:formData.get('max_uses')?Number(formData.get('max_uses')):null,is_active:true});if(error)throw new Error(error.message);revalidatePath('/admin/cupons');}
