import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getHotmartProductOffers,
  getHotmartProducts,
} from "@/lib/hotmart";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const productId = request.nextUrl.searchParams.get("id");

    const productsResult = await getHotmartProducts();

    if (productId) {
      const product = productsResult.items.find(
        (item) => String(item.id) === productId
      );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Produto Hotmart com ID ${productId} não foi encontrado.`,
          },
          { status: 404 }
        );
      }

      const offersResult = await getHotmartProductOffers(product.ucode);

      return NextResponse.json({
        success: true,
        type: "offers",
        product: {
          id: product.id,
          name: product.name,
          ucode: product.ucode,
          status: product.status,
          format: product.format,
        },
        totalOffers: offersResult.items.length,
        offers: offersResult.items,
      });
    }

    return NextResponse.json({
      success: true,
      type: "products",
      total: productsResult.items.length,
      products: productsResult.items.map((product) => ({
        id: product.id,
        name: product.name,
        ucode: product.ucode,
        status: product.status,
        format: product.format,
        is_subscription: product.is_subscription,
        warranty_period: product.warranty_period,
        created_at: product.created_at,
      })),
    });
  } catch (error) {
    console.error("Hotmart test error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível consultar a Hotmart.",
      },
      { status: 500 }
    );
  }
}