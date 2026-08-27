import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CatalogProduct } from "@/types/domain";

type RawProduct = Record<string, unknown> & { product_categories?: Array<{ categories?: { name?: string; slug?: string } | null }> };

function mapProduct(row: RawProduct): CatalogProduct {
  const category = row.product_categories?.[0]?.categories ?? null;
  const regular = Number(row.regular_price_cents);
  const sale = row.sale_price_cents === null || row.sale_price_cents === undefined ? null : Number(row.sale_price_cents);
  return { id: String(row.id), title: String(row.title), slug: String(row.slug), shortDescription: row.short_description ? String(row.short_description) : null, description: String(row.description), regularPriceCents: regular, salePriceCents: sale, effectivePriceCents: sale ?? regular, productKind: row.product_kind === "kit" ? "kit" : "individual", gradeLevel: row.grade_level ? String(row.grade_level) : null, materialType: row.material_type ? String(row.material_type) : null, coverUrl: row.cover_path ? String(row.cover_path) : null, categoryName: category?.name ?? null, categorySlug: category?.slug ?? null, tags: Array.isArray(row.tags) ? row.tags.map(String) : [], isDemo: Boolean(row.is_demo), };
}

export async function listCatalog(input: { query?: string; categorySlug?: string; sort?: "newest" | "price_asc" | "price_desc"; limit?: number } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("products").select("*, product_categories(categories(name,slug))").eq("status", "published");
  if (process.env.SHOW_DEMO !== "true") query = query.eq("is_demo", false);
  if (input.query) query = query.ilike("title", `%${input.query.replace(/[%_]/g, "")}%`);
  if (input.categorySlug) query = query.eq("product_categories.categories.slug", input.categorySlug);
  if (input.sort === "price_asc") query = query.order("sale_price_cents", { ascending: true, nullsFirst: false }).order("regular_price_cents", { ascending: true });
  else if (input.sort === "price_desc") query = query.order("sale_price_cents", { ascending: false, nullsFirst: false }).order("regular_price_cents", { ascending: false });
  else query = query.order("published_at", { ascending: false });
  if (input.limit) query = query.limit(input.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const admin = createAdminSupabaseClient();
  const products = await Promise.all(((data ?? []) as RawProduct[]).map(async (row) => { const product = mapProduct(row); if (!product.coverUrl) return product; const { data: signed } = await admin.storage.from("materials").createSignedUrl(product.coverUrl, 300); return { ...product, coverUrl: signed?.signedUrl ?? null }; }));
  return products.sort((a, b) => input.sort === "price_asc" ? a.effectivePriceCents - b.effectivePriceCents : input.sort === "price_desc" ? b.effectivePriceCents - a.effectivePriceCents : 0);
}

export async function listCategories() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("categories").select("id,name,slug,description").eq("is_active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProduct(slug: string) {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("products")
    .select(
      "*, product_categories(categories(name,slug)), product_previews(storage_path,alt_text,sort_order), kit_items!kit_items_kit_product_id_fkey(included_product_id, products!kit_items_included_product_id_fkey(title,slug))"
    )
    .eq("slug", slug)
    .eq("status", "published");

  if (process.env.SHOW_DEMO !== "true") {
    query = query.eq("is_demo", false);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Erro ao buscar produto:", error);
    return null;
  }

  if (!data) return null;

  const previewRows = (data.product_previews ?? []) as Array<{
    storage_path: string;
    alt_text: string | null;
    sort_order: number;
  }>;

  const admin = createAdminSupabaseClient();

  const product = mapProduct(data as RawProduct);

  const { data: coverSigned } = product.coverUrl
    ? await admin.storage
        .from("materials")
        .createSignedUrl(product.coverUrl, 300)
    : { data: null };

  const previews = await Promise.all(
    previewRows
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(async (preview) => {
        const { data: signed } = await admin.storage
          .from("materials")
          .createSignedUrl(preview.storage_path, 300);

        return {
          ...preview,
          url: signed?.signedUrl ?? null,
        };
      })
  );

  return {
    product: {
      ...product,
      coverUrl: coverSigned?.signedUrl ?? null,
    },
    previews,
    kitItems: (data.kit_items ?? []) as Array<{
      included_product_id: string;
      products: {
        title: string;
        slug: string;
      } | null;
    }>,
  };
}