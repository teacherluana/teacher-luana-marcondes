# Modelo de ambiente

Copie o bloco abaixo para um arquivo `.env.local` durante o desenvolvimento e cadastre os mesmos valores na Vercel. O arquivo de ambiente não deve ser versionado.

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

> `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e `RESEND_API_KEY` só podem existir no ambiente do servidor. Nunca adicione essas chaves ao navegador.
