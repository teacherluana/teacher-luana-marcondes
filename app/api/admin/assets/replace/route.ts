import { NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  productId: z.string().uuid(),

  kind: z.enum([
    "pdf",
    "cover",
    "preview",
  ]),

  oldPath: z.string().min(1),

  path: z.string().min(1),

  filename: z.string().min(1),

  mimeType: z.string().min(1),

  byteSize: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),

  checksum: z.string().min(16),
});

export async function POST(
  request: Request
) {
  try {
    await requireAdmin();

    const input = schema.parse(
      await request.json()
    );

    const db =
      createAdminSupabaseClient();

    /*
     * PDF
     */
    if (input.kind === "pdf") {
      /*
       * Garante que o PDF antigo pertence
       * realmente ao produto informado.
       */
      const { data: oldFile, error: oldError } =
        await db
          .from("product_files")
          .select("id, storage_path")
          .eq("product_id", input.productId)
          .eq("storage_path", input.oldPath)
          .eq("is_primary", true)
          .maybeSingle();

      if (oldError) {
        throw oldError;
      }

      /*
       * Primeiro registra o novo PDF.
       */
      const { error: saveError } =
        await db
          .from("product_files")
          .upsert(
            {
              product_id: input.productId,
              storage_path: input.path,
              original_filename:
                input.filename,
              mime_type: input.mimeType,
              byte_size: input.byteSize,
              checksum_sha256:
                input.checksum,
              is_primary: true,
            },
            {
              onConflict:
                "product_id,is_primary",
            }
          );

      if (saveError) {
        throw saveError;
      }

      /*
       * Depois remove o arquivo antigo
       * do Storage.
       */
      if (
        oldFile?.storage_path &&
        oldFile.storage_path !== input.path
      ) {
        const { error: storageError } =
          await db.storage
            .from("materials")
            .remove([
              oldFile.storage_path,
            ]);

        if (storageError) {
          console.error(
            "Não foi possível remover o PDF antigo:",
            storageError
          );
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * CAPA
     */
    if (input.kind === "cover") {
      const { data: product, error } =
        await db
          .from("products")
          .select("cover_path")
          .eq("id", input.productId)
          .single();

      if (error) {
        throw error;
      }

      const oldPath =
        product?.cover_path;

      const { error: updateError } =
        await db
          .from("products")
          .update({
            cover_path: input.path,
          })
          .eq("id", input.productId);

      if (updateError) {
        throw updateError;
      }

      if (
        oldPath &&
        oldPath !== input.path
      ) {
        const { error: storageError } =
          await db.storage
            .from("materials")
            .remove([oldPath]);

        if (storageError) {
          console.error(
            "Não foi possível remover a capa antiga:",
            storageError
          );
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * PRÉVIA
     *
     * Para prévias, normalmente usamos
     * adicionar/excluir, mas deixamos o
     * endpoint preparado para substituição.
     */
    if (input.kind === "preview") {
      const { data: oldPreview, error } =
        await db
          .from("product_previews")
          .select("id, storage_path")
          .eq(
            "product_id",
            input.productId
          )
          .eq(
            "storage_path",
            input.oldPath
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      const { error: insertError } =
        await db
          .from("product_previews")
          .insert({
            product_id: input.productId,
            storage_path: input.path,
            alt_text: input.filename,
          });

      if (insertError) {
        throw insertError;
      }

      if (oldPreview) {
        await db
          .from("product_previews")
          .delete()
          .eq(
            "id",
            oldPreview.id
          );

        const { error: storageError } =
          await db.storage
            .from("materials")
            .remove([
              oldPreview.storage_path,
            ]);

        if (storageError) {
          console.error(
            "Não foi possível remover a prévia antiga:",
            storageError
          );
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "Tipo de arquivo não suportado.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao substituir arquivo:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível substituir o arquivo.",
      },
      {
        status: 400,
      }
    );
  }
}