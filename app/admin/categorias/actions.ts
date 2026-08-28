"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

export async function saveCategory(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();

  if (!name) {
    throw new Error("Informe o nome.");
  }

  const id = String(formData.get("id") || "").trim();

  const slug = slugify(
    String(formData.get("slug") || name).trim()
  );

  const description =
    String(formData.get("description") || "").trim() || null;

  const isActive = formData.get("is_active") === "on";

  const db = createAdminSupabaseClient();

  const data = {
    name,
    slug,
    description,
    is_active: isActive,
  };

  const result = id
    ? await db
        .from("categories")
        .update(data)
        .eq("id", id)
    : await db
        .from("categories")
        .insert(data);

  if (result.error) {
    throw new Error(result.error.message);
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/admin/produtos/novo");
  revalidatePath("/produtos");
}