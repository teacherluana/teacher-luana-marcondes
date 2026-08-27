import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema=z.object({productId:z.string().uuid(),kind:z.enum(['pdf','cover','preview']),path:z.string().min(1),filename:z.string().min(1),mimeType:z.string().min(1),byteSize:z.number().int().positive().max(20971520),checksum:z.string().min(16)});
export async function POST(request:Request){try{await requireAdmin();const input=schema.parse(await request.json());const db=createAdminSupabaseClient();if(input.kind==='pdf'){const {error}=await db.from('product_files').upsert({product_id:input.productId,storage_path:input.path,original_filename:input.filename,mime_type:input.mimeType,byte_size:input.byteSize,checksum_sha256:input.checksum,is_primary:true},{onConflict:'product_id,is_primary'});if(error)throw error;}else if(input.kind==='cover'){const {error}=await db.from('products').update({cover_path:input.path}).eq('id',input.productId);if(error)throw error;}else{const {error}=await db.from('product_previews').insert({product_id:input.productId,storage_path:input.path,alt_text:input.filename});if(error)throw error;}return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Não foi possível registrar o arquivo.'},{status:400});}}
