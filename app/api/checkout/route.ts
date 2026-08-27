import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createMercadoPagoPreference } from "@/lib/mercadopago";
import { env } from "@/lib/env";
import { assertCheckoutItems } from "@/lib/security-rules";

const bodySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(50),
  couponCode: z.string().trim().max(48).optional(),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    assertCheckoutItems(payload.productIds);

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: rawOrder, error: orderError } = await supabase
      .rpc("create_checkout_order", {
        p_product_ids: payload.productIds,
        p_coupon_code: payload.couponCode || null,
        p_customer_name: payload.customerName,
        p_customer_email: payload.customerEmail,
      })
      .single();

    if (orderError || !rawOrder) {
      return NextResponse.json(
        {
          error:
            orderError?.message ??
            "Não foi possível criar o pedido.",
        },
        { status: 400 }
      );
    }

    const order = rawOrder as unknown as {
      order_id: string;
      order_number: string;
      external_reference: string;
      total_cents: number;
      line_titles: string[];
    };

    const siteUrl = env.siteUrl();

    const preference = await createMercadoPagoPreference({
      externalReference: order.external_reference,
      title:
        order.line_titles.length === 1
          ? order.line_titles[0]
          : `${order.line_titles.length} materiais digitais — Teacher Luana Marcondes`,
      totalCents: order.total_cents,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago`,
      successUrl: `${siteUrl}/pagamento/sucesso`,
      pendingUrl: `${siteUrl}/pagamento/pendente`,
      failureUrl: `${siteUrl}/pagamento/recusado`,
    });

    const admin = createAdminSupabaseClient();

    await admin
      .from("payments")
      .update({
        provider_preference_id: preference.preferenceId,
      })
      .eq("order_id", order.order_id);

    return NextResponse.json({
      checkoutUrl: preference.checkoutUrl,
      orderNumber: order.order_number,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado no checkout.",
      },
      { status: 400 }
    );
  }
}