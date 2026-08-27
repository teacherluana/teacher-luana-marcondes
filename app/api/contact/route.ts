import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
const schema=z.object({name:z.string().trim().min(2).max(180),email:z.string().email().max(320),message:z.string().trim().min(10).max(5000)});
export async function POST(request:Request){try{const input=schema.parse(await request.json());const {error}=await createAdminSupabaseClient().from('contact_messages').insert(input);if(error)throw error;return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Mensagem inválida.'},{status:400});}}
