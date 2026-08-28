import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function sendTransactionalEmail(input: { userId: string; orderId?: string; template: "payment_approved" | "payment_pending" | "payment_rejected" | "account_recovery" }) {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("profiles").select("email,name").eq("id", input.userId).single();
  if (!profile?.email) return;
  const siteUrl = env.siteUrl();
  const subjects = { payment_approved: "Sua compra está liberada", payment_pending: "Seu pagamento está pendente", payment_rejected: "Não foi possível aprovar seu pagamento", account_recovery: "Recupere o acesso à sua conta" };
  const event = await admin.from("email_events").insert({ user_id: input.userId, order_id: input.orderId, template: input.template, status: "queued" }).select("id").single();
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const messages = { payment_approved: `Sua compra foi aprovada. <a href="${siteUrl}/minhas-compras">Acesse Minhas Compras</a>.`, payment_pending: `Seu pagamento está pendente. Assim que houver confirmação, seus materiais aparecerão em <a href="${siteUrl}/minhas-compras">Minhas Compras</a>.`, payment_rejected: `Não foi possível aprovar o pagamento. Você pode tentar novamente pelo catálogo.`, account_recovery: `Use o link seguro enviado pelo Supabase para criar uma nova senha e voltar a acessar sua conta.` };
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "Luana Marcondes <onboarding@resend.dev>", to: profile.email, subject: subjects[input.template], html: `<p>Olá, ${profile.name || "professora"}.</p><p>${messages[input.template]}</p>` });
    await admin.from("email_events").update({ status: "sent", provider_message_id: result.data?.id, sent_at: new Date().toISOString() }).eq("id", event.data?.id ?? "");
  } catch (error) {
    await admin.from("email_events").update({ status: "failed", payload: { message: error instanceof Error ? error.message : "Erro desconhecido" } }).eq("id", event.data?.id ?? "");
  }
}
