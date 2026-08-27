# Luana Sucesso — plataforma independente

Vitrine de materiais digitais para ensino de inglês nos anos iniciais, construída com **Next.js App Router**, **Supabase**, **Mercado Pago** e **Resend**. O projeto é independente: pode ser aberto no VS Code, enviado a um repositório GitHub e publicado na Vercel sem serviços internos de terceiros.

## Requisitos

Use Node.js 20.11 ou superior, npm 10 ou superior, uma conta Supabase, credenciais do Mercado Pago e, para e-mails transacionais, uma conta Resend. A aplicação usa PostgreSQL, Auth e Storage privados do Supabase.

## Instalação local

```bash
git clone https://github.com/SEU-USUARIO/luana-sucesso.git
cd luana-sucesso
npm install
```

Crie `.env.local` com base em [`ENVIRONMENT.example.md`](ENVIRONMENT.example.md), preencha as suas credenciais e execute:

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Supabase: banco, Auth e RLS

Crie um projeto Supabase, abra o SQL Editor e aplique o conteúdo de `supabase/migrations/20260825121000_initial_schema.sql`. Essa migration cria perfis, categorias, produtos, relacionamentos de kits, carrinhos, cupons, pedidos, pagamentos, compras, eventos de webhook, e-mails e mensagens de contato.

Ela também habilita **Row Level Security**. Usuários comuns só leem o próprio perfil, seus pedidos e compras. Os produtos publicados podem ser consultados publicamente, enquanto operações administrativas exigem o papel `admin`. A chave de serviço é usada apenas pelas rotas de servidor e nunca é enviada ao navegador.

Após criar sua primeira conta, promova-a a administradora pelo SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'seu-email@exemplo.com';
```

## Storage privado e uploads

A migration cria o bucket privado `materials`. PDFs, capas e prévias são enviados pelo painel administrativo usando uma autorização temporária de upload. O registro do arquivo é gravado no banco após o upload. PDFs não recebem URL pública: o endpoint `POST /api/download/[productId]` confirma sessão, compra `active` e pedido `approved` antes de criar uma URL assinada de 60 segundos.

## Mercado Pago

Defina `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e `NEXT_PUBLIC_SITE_URL`. O checkout envia apenas IDs dos produtos; a função PostgreSQL `create_checkout_order` relê preços, aplica cupom e cria pedido e pagamento no servidor. A URL de notificação é:

```text
https://SEU-DOMINIO.com/api/webhooks/mercadopago
```

O webhook valida a assinatura, registra o evento de maneira única, consulta o pagamento no Mercado Pago, compara moeda e valor, e executa a aprovação em uma função transacional. A mesma função concede o produto, expande kits e protege contra duplicação. Eventos de cancelamento ou reembolso revogam os acessos da respectiva compra.

Teste primeiro com credenciais sandbox e uma URL HTTPS. O retorno do navegador para `/pagamento/*` é meramente informativo; somente o webhook aprovado libera os arquivos.

## Resend e e-mails

Configure `RESEND_API_KEY` e `RESEND_FROM_EMAIL` com um domínio/remetente verificado. A estrutura envia e registra e-mails de compra aprovada e mantém pontos de extensão para pagamento pendente, recusado e recuperação de conta. A recuperação de senha é enviada pelo Supabase Auth e deve ter as URLs de redirecionamento configuradas no painel Supabase.

## Administração

Depois de promover uma conta para `admin`, acesse `/admin`. A área permite gerenciar produtos e kits, selecionar itens do kit, publicar ou arquivar materiais, cadastrar categorias e cupons, carregar capa, prévias e PDF, além de visualizar pedidos, clientes e o resumo de vendas. O acesso não depende de links ocultos: as páginas e ações verificam o papel no servidor.

## Dados DEMO e importação CSV

O seed opcional é isolado e marca registros com `is_demo = true` para que não se confundam com o catálogo comercial:

```bash
npm run seed
```

Para importar um catálogo, use CSV separado por ponto e vírgula com as colunas `title;slug;description;regular_price;category_slug`. Colunas opcionais incluem `sale_price`, `short_description`, `product_kind`, `status`, `grade_level`, `material_type` e `tags`.

```bash
npm run import:catalog -- ./catalogo.csv
```

## Qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Os testes verificam preço efetivo, desconto de cupom, coerência de valor/moeda de pagamento e decisão idempotente para webhooks. Testes completos de Supabase e Mercado Pago exigem credenciais de um ambiente de teste configurado e devem ser executados como integração antes da publicação.

## GitHub e Vercel

Faça commit somente depois de conferir o `.gitignore`. Arquivos `.env*`, `node_modules` e `.next` não devem ser enviados ao repositório.

```bash
git init
git add .
git commit -m "feat: plataforma Luana Sucesso independente"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/luana-sucesso.git
git push -u origin main
```

Na Vercel, importe o repositório, mantenha o framework detectado como Next.js e cadastre todas as variáveis descritas em `ENVIRONMENT.example.md`. O build é `npm run build`; não é necessário `vercel.json`. Configure `NEXT_PUBLIC_SITE_URL` para o domínio final e atualize o webhook Mercado Pago e os redirects do Supabase depois do primeiro deploy.

## Produção

Antes de abrir vendas, troque dados DEMO pelo catálogo real, confirme que o bucket continua privado, faça upload de PDFs reais pelo painel, teste PIX/cartão no sandbox, valide a chegada do webhook e confirme que uma compra reembolsada não recebe download. Nenhuma credencial deve ser incluída no código ou no repositório.
