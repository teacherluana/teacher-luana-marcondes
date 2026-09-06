"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import {
  getHotmartProductOffers,
  getHotmartProductWithOffer,
  getHotmartProducts,
} from "@/lib/hotmart";

export async function saveProduct(formData: FormData) {
  await requireAdmin();

  const db = createAdminSupabaseClient();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();

  const data = {
    title,
    slug: slugify(
      String(formData.get("slug") || title)
    ),
    description: String(
      formData.get("description") || ""
    ),
    short_description:
      String(formData.get("short_description") || "") ||
      null,
    regular_price_cents: Math.round(
      Number(formData.get("regular_price") || 0) * 100
    ),
    sale_price_cents: formData.get("sale_price")
      ? Math.round(
          Number(formData.get("sale_price")) * 100
        )
      : null,
    product_kind:
      String(formData.get("product_kind")) === "kit"
        ? "kit"
        : "individual",
    status:
      String(formData.get("status")) === "published"
        ? "published"
        : "draft",
    grade_level:
      String(formData.get("grade_level") || "") ||
      null,
    material_type:
      String(formData.get("material_type") || "") ||
      null,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    published_at:
      String(formData.get("status")) === "published"
        ? new Date().toISOString()
        : null,
  };

  if (!title || !data.description) {
    throw new Error(
      "Título e descrição são obrigatórios."
    );
  }

  const result = id
    ? await db
        .from("products")
        .update(data)
        .eq("id", id)
        .select("id")
        .single()
    : await db
        .from("products")
        .insert(data)
        .select("id")
        .single();

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ||
        "Não foi possível salvar o produto."
    );
  }

  const categoryIds = String(
    formData.get("category_ids") || ""
  )
    .split(",")
    .filter(Boolean);

  await db
    .from("product_categories")
    .delete()
    .eq("product_id", result.data.id);

  if (categoryIds.length) {
    await db
      .from("product_categories")
      .insert(
        categoryIds.map((category_id) => ({
          product_id: result.data!.id,
          category_id,
        }))
      );
  }

  const kitIds = String(
    formData.get("kit_items") || ""
  )
    .split(",")
    .filter(Boolean);

  if (data.product_kind === "kit") {
    await db
      .from("kit_items")
      .delete()
      .eq("kit_product_id", result.data.id);

    if (kitIds.length) {
      await db
        .from("kit_items")
        .insert(
          kitIds.map(
            (included_product_id, sort_order) => ({
              kit_product_id: result.data!.id,
              included_product_id,
              sort_order,
            })
          )
        );
    }
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");

  redirect("/admin/produtos");
}

export async function syncProductWithHotmart(
  formData: FormData
) {
  await requireAdmin();

  const db = createAdminSupabaseClient();

  const productId = String(
    formData.get("product_id") || ""
  ).trim();

  const hotmartProductId = Number(
    formData.get("hotmart_product_id") || 0
  );

  if (!productId) {
    throw new Error(
      "ID do produto do catálogo não informado."
    );
  }

  if (
    !Number.isInteger(hotmartProductId) ||
    hotmartProductId <= 0
  ) {
    throw new Error(
      "Informe um ID de produto Hotmart válido."
    );
  }

  const hotmart =
    await getHotmartProductWithOffer(
      hotmartProductId
    );

  if (!hotmart) {
    throw new Error(
      `Produto Hotmart com ID ${hotmartProductId} não foi encontrado.`
    );
  }

  const offer = hotmart.offer;

  if (!offer) {
    throw new Error(
      "O produto Hotmart foi encontrado, mas não possui nenhuma oferta disponível."
    );
  }

  const offerCode =
    offer.code?.trim() || null;

  if (!offerCode) {
    throw new Error(
      "A oferta principal da Hotmart não possui código."
    );
  }

  const price =
    typeof offer.price?.value === "number"
      ? offer.price.value
      : null;

  const hotmartDescription =
    offer.description?.trim() || "";

  const updateData = {
    hotmart_product_id:
      hotmart.product.id,
    hotmart_ucode:
      hotmart.product.ucode,
    hotmart_offer_code:
      offerCode,
    ...(price !== null
      ? {
          sale_price_cents:
            Math.round(price * 100),
        }
      : {}),
    ...(hotmartDescription
      ? {
          description: hotmartDescription,
          short_description:
            hotmartDescription.slice(0, 160),
        }
      : {}),
  };

  const result = await db
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .select(
      "id,hotmart_product_id,hotmart_ucode,hotmart_offer_code,sale_price_cents"
    )
    .single();

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message ||
        "Não foi possível salvar a integração com a Hotmart."
    );
  }

  revalidatePath(
    `/admin/produtos/${productId}`
  );

  revalidatePath("/admin/produtos");

  revalidatePath("/produtos");

  redirect(
    `/admin/produtos/${productId}`
  );
}

/**
 * Importa produtos selecionados da Hotmart
 * para o catálogo local.
 *
 * Os produtos entram como PUBLICADOS,
 * pois a Hotmart é a fonte dos produtos
 * comercializados no catálogo.
 */
export async function importHotmartProducts(
  formData: FormData
) {
  await requireAdmin();

  const db = createAdminSupabaseClient();

  const selectedIds = formData
    .getAll("hotmart_product")
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isInteger(value) && value > 0
    );

  if (!selectedIds.length) {
    throw new Error(
      "Selecione pelo menos um produto da Hotmart."
    );
  }

  /*
   * Consulta todos os produtos uma única vez.
   */
  const productsResult =
    await getHotmartProducts();

  const selectedProducts =
    productsResult.items.filter((product) =>
      selectedIds.includes(product.id)
    );

  if (!selectedProducts.length) {
    throw new Error(
      "Nenhum dos produtos selecionados foi encontrado na Hotmart."
    );
  }

  let imported = 0;
  let skipped = 0;

  for (const hotmartProduct of selectedProducts) {
    /*
     * Verifica se este produto Hotmart já está
     * vinculado a algum produto do nosso catálogo.
     */
    const { data: existing } = await db
      .from("products")
      .select("id,title")
      .eq(
        "hotmart_product_id",
        hotmartProduct.id
      )
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    /*
     * Busca as ofertas do produto e escolhe
     * a oferta principal.
     */
    const offersResult =
      await getHotmartProductOffers(
        hotmartProduct.ucode
      );

    if (!offersResult.items.length) {
      skipped++;
      continue;
    }

    const offer =
      offersResult.items.find(
        (item) =>
          item.is_main_offer === true ||
          item.is_main === true
      ) ?? offersResult.items[0];

    const offerCode =
      offer.code?.trim() || null;

    /*
     * Sem código de oferta não conseguimos
     * integrar o checkout.
     */
    if (!offerCode) {
      skipped++;
      continue;
    }

    const price =
      typeof offer.price?.value === "number"
        ? offer.price.value
        : 0;

    const priceCents = Math.round(
      price * 100
    );

    /*
     * Aproveita a descrição da oferta quando
     * a Hotmart realmente fornecer uma.
     */
    const hotmartDescription =
      offer.description?.trim() || "";

    const description =
      hotmartDescription ||
      `Material digital "${hotmartProduct.name}" importado da Hotmart.`;

    const shortDescription =
      hotmartDescription
        ? hotmartDescription.slice(0, 160)
        : "Material digital importado da Hotmart.";

    /*
     * Gera um slug inicial a partir do nome
     * da Hotmart.
     */
    const baseSlug = slugify(
      hotmartProduct.name
    );

    let slug =
      baseSlug ||
      `produto-hotmart-${hotmartProduct.id}`;

    /*
     * Evita conflito caso já exista outro
     * produto usando o mesmo slug.
     */
    const { data: slugExists } = await db
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugExists) {
      slug = `${slug}-${hotmartProduct.id}`;
    }

    /*
     * O produto entra diretamente como PUBLICADO.
     */
    const insertData = {
      title: hotmartProduct.name,
      slug,
      description,
      short_description:
        shortDescription,
      regular_price_cents: priceCents,
      sale_price_cents: priceCents,
      product_kind: "individual",
      status: "published",
      grade_level: null,
      material_type: null,
      tags: [],
      published_at:
        new Date().toISOString(),

      hotmart_product_id:
        hotmartProduct.id,

      hotmart_ucode:
        hotmartProduct.ucode,

      hotmart_offer_code:
        offerCode,

      hotmart_checkout_url: null,
    };

    const result = await db
      .from("products")
      .insert(insertData)
      .select("id")
      .single();

    if (result.error || !result.data) {
      /*
       * Se um produto falhar, não interrompemos
       * toda a importação.
       */
      console.error(
        "Erro ao importar produto Hotmart:",
        hotmartProduct.id,
        result.error
      );

      skipped++;
      continue;
    }

    imported++;
  }

  revalidatePath("/admin/hotmart");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");

  redirect(
    `/admin/hotmart?imported=${imported}&skipped=${skipped}`
  );
}

export async function archiveProduct(
  formData: FormData
) {
  await requireAdmin();

  const id = String(
    formData.get("id")
  );

  await createAdminSupabaseClient()
    .from("products")
    .update({
      status: "archived",
    })
    .eq("id", id);

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

export async function unarchiveProduct(
  formData: FormData
) {
  await requireAdmin();

  const id = String(
    formData.get("id") || ""
  ).trim();

  if (!id) {
    throw new Error(
      "ID do produto não informado."
    );
  }

  const result = await createAdminSupabaseClient()
    .from("products")
    .update({
      status: "draft",
    })
    .eq("id", id);

  if (result.error) {
    throw new Error(
      result.error.message ||
        "Não foi possível desarquivar o produto."
    );
  }

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/produtos");
}