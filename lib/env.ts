const required = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`A variável de ambiente ${name} não está configurada.`);
  }

  return value;
};

export const env = {
  siteUrl: () =>
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",

  supabaseUrl: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),

  supabaseAnonKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),

  supabaseServiceRoleKey: () =>
    required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),

  mercadoPagoToken: () =>
    required(
      "MERCADOPAGO_ACCESS_TOKEN",
      process.env.MERCADOPAGO_ACCESS_TOKEN
    ),

  mercadoPagoWebhookSecret: () =>
    required(
      "MERCADOPAGO_WEBHOOK_SECRET",
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    ),
};