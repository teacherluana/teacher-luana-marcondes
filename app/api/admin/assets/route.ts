import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const getSchema = z.object({
  productId: z.string().uuid(),
});

const deleteSchema = z.object({
  productId: z.string().uuid(),
  kind: z.enum(["pdf", "cover", "preview"]),
  path: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);

    const { productId } = getSchema.parse({
      productId: searchParams.get("productId"),
    });

    const db = createAdminSupabaseClient();

    const [
      { data: product },
      { data: pdf },
      { data: previews },
    ] = await Promise.all([
      db
        .from("products")
        .select("id, cover_path")
        .eq("id", productId)
        .single(),

      db
        .from("product_files")
        .select(
          "id, storage_path, original_filename, mime_type, byte_size, created_at"
        )
        .eq("product_id", productId)
        .eq("is_primary", true)
        .maybeSingle(),

      db
        .from("product_previews")
        .select(
          "id, storage_path, alt_text, created_at"
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cover: product.cover_path
        ? {
            path: product.cover_path,
          }
        : null,

      pdf: pdf
        ? {
            id: pdf.id,
            path: pdf.storage_path,
            filename: pdf.original_filename,
            mimeType: pdf.mime_type,
            byteSize: pdf.byte_size,
            createdAt: pdf.created_at,
          }
        : null,

      previews: (previews ?? []).map((preview) => ({
        id: preview.id,
        path: preview.storage_path,
        filename: preview.alt_text,
        createdAt: preview.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os arquivos.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const input = deleteSchema.parse(await request.json());

    const db = createAdminSupabaseClient();

    if (input.kind === "pdf") {
      const { data: file, error: findError } = await db
        .from("product_files")
        .select("id, storage_path")
        .eq("product_id", input.productId)
        .eq("is_primary", true)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (file?.storage_path) {
        const { error: storageError } = await db.storage
          .from("materials")
          .remove([file.storage_path]);

        if (storageError) {
          throw storageError;
        }
      }

      if (file?.id) {
        const { error } = await db
          .from("product_files")
          .delete()
          .eq("id", file.id);

        if (error) {
          throw error;
        }
      }
    }

    if (input.kind === "cover") {
      const { data: product, error: findError } = await db
        .from("products")
        .select("cover_path")
        .eq("id", input.productId)
        .single();

      if (findError) {
        throw findError;
      }

      if (product?.cover_path) {
        const { error: storageError } = await db.storage
          .from("materials")
          .remove([product.cover_path]);

        if (storageError) {
          throw storageError;
        }
      }

      const { error } = await db
        .from("products")
        .update({ cover_path: null })
        .eq("id", input.productId);

      if (error) {
        throw error;
      }
    }

    if (input.kind === "preview") {
      if (!input.path) {
        throw new Error("Caminho da prévia não informado.");
      }

      const { error: storageError } = await db.storage
        .from("materials")
        .remove([input.path]);

      if (storageError) {
        throw storageError;
      }

      const { error } = await db
        .from("product_previews")
        .delete()
        .eq("product_id", input.productId)
        .eq("storage_path", input.path);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o arquivo.",
      },
      { status: 400 }
    );
  }
}