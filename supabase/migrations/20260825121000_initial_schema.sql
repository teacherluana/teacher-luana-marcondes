create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin');
create type public.product_kind as enum ('individual', 'kit');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded');
create type public.purchase_status as enum ('active', 'revoked');
create type public.coupon_discount_type as enum ('percentage', 'fixed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email)
  on conflict (id) do update set email = excluded.email, name = coalesce(nullif(excluded.name, ''), public.profiles.name), updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null,
  short_description text,
  regular_price_cents integer not null check (regular_price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or (sale_price_cents >= 0 and sale_price_cents <= regular_price_cents)),
  product_kind public.product_kind not null default 'individual',
  status public.product_status not null default 'draft',
  grade_level text,
  material_type text,
  page_count integer check (page_count is null or page_count > 0),
  tags text[] not null default '{}',
  cover_path text,
  is_demo boolean not null default false,
  is_featured boolean not null default false,
  sales_count integer not null default 0 check (sales_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_catalog_idx on public.products (status, is_demo, published_at desc);
create index products_effective_price_idx on public.products ((coalesce(sale_price_cents, regular_price_cents)));

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  checksum_sha256 text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (product_id, is_primary)
);

create table public.product_previews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.kit_items (
  kit_product_id uuid not null references public.products(id) on delete cascade,
  included_product_id uuid not null references public.products(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (kit_product_id, included_product_id),
  check (kit_product_id <> included_product_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type public.coupon_discount_type not null,
  discount_value integer not null check (discount_value >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((discount_type = 'percentage' and discount_value <= 100) or discount_type = 'fixed')
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  external_reference uuid not null unique default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0 and discount_cents <= subtotal_cents),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  coupon_id uuid references public.coupons(id) on delete set null,
  payment_provider text not null default 'mercadopago',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  title_snapshot text not null,
  product_kind_snapshot public.product_kind not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity = 1),
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_preference_id text,
  provider_payment_id text unique,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  payment_method text,
  raw_payload jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  status public.purchase_status not null default 'active',
  granted_by text not null check (granted_by in ('purchase', 'kit')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  unique (user_id, product_id, order_item_id)
);
create index purchases_access_idx on public.purchases (user_id, product_id, status);

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  used_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  external_resource_id text,
  topic text,
  signature_valid boolean not null default false,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  template text not null,
  provider_message_id text,
  status text not null default 'queued',
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.create_checkout_order(p_product_ids uuid[], p_coupon_code text default null)
returns table(order_id uuid, order_number text, external_reference uuid, total_cents integer, line_titles text[])
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_subtotal integer := 0; v_discount integer := 0; v_total integer; v_coupon public.coupons%rowtype; v_order_id uuid; v_number text;
  v_product public.products%rowtype;
begin
  if v_user is null then raise exception 'Usuário não autenticado'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then raise exception 'Carrinho vazio'; end if;
  if (select count(distinct x) from unnest(p_product_ids) x) <> array_length(p_product_ids, 1) then raise exception 'Produtos duplicados'; end if;
  for v_product in select * from public.products where id = any(p_product_ids) and status = 'published' and is_demo = false loop
    v_subtotal := v_subtotal + coalesce(v_product.sale_price_cents, v_product.regular_price_cents);
  end loop;
  if (select count(*) from public.products where id = any(p_product_ids) and status = 'published' and is_demo = false) <> array_length(p_product_ids, 1) then raise exception 'Produto indisponível'; end if;
  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code)) and is_active = true and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now()) for update;
    if not found then raise exception 'Cupom inválido'; end if;
    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then raise exception 'Cupom esgotado'; end if;
    if v_subtotal < v_coupon.min_order_cents then raise exception 'Pedido não atingiu o mínimo do cupom'; end if;
    v_discount := least(v_subtotal, case when v_coupon.discount_type = 'percentage' then floor(v_subtotal * v_coupon.discount_value / 100.0)::integer else v_coupon.discount_value end);
  end if;
  v_total := v_subtotal - v_discount;
  v_number := 'LS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders(order_number, user_id, subtotal_cents, discount_cents, total_cents, coupon_id) values(v_number, v_user, v_subtotal, v_discount, v_total, v_coupon.id) returning id into v_order_id;
  insert into public.order_items(order_id, product_id, title_snapshot, product_kind_snapshot, unit_price_cents)
    select v_order_id, p.id, p.title, p.product_kind, coalesce(p.sale_price_cents, p.regular_price_cents) from public.products p where p.id = any(p_product_ids);
  insert into public.payments(order_id, amount_cents) values(v_order_id, v_total);
  return query select o.id, o.order_number, o.external_reference, o.total_cents, array_agg(oi.title_snapshot order by oi.created_at) from public.orders o join public.order_items oi on oi.order_id=o.id where o.id=v_order_id group by o.id;
end; $$;

create or replace function public.approve_payment_and_grant(p_external_reference uuid, p_payment_id text, p_amount_cents integer, p_currency text, p_status public.payment_status, p_payload jsonb)
returns table(order_id uuid, user_id uuid, approved_now boolean)
language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_coupon public.coupons%rowtype; v_item public.order_items%rowtype; v_kit_item public.kit_items%rowtype;
begin
  select * into v_order from public.orders where external_reference = p_external_reference for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_order.total_cents <> p_amount_cents or p_currency <> 'BRL' then raise exception 'Pagamento incompatível com pedido'; end if;
  update public.payments set provider_payment_id=p_payment_id,status=p_status,amount_cents=p_amount_cents,currency=p_currency,raw_payload=p_payload,approved_at=case when p_status='approved' then now() else null end,updated_at=now() where order_id=v_order.id;
  if p_status <> 'approved' or v_order.status = 'approved' then return query select v_order.id, v_order.user_id, false; return; end if;
  if v_order.coupon_id is not null then
    select * into v_coupon from public.coupons where id=v_order.coupon_id for update;
    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then raise exception 'Cupom esgotado na confirmação'; end if;
    update public.coupons set used_count=used_count+1,updated_at=now() where id=v_coupon.id;
    insert into public.coupon_usages(coupon_id,user_id,order_id) values(v_coupon.id,v_order.user_id,v_order.id) on conflict(order_id) do nothing;
  end if;
  update public.orders set status='approved',approved_at=now(),updated_at=now() where id=v_order.id;
  for v_item in select * from public.order_items where order_id=v_order.id loop
    insert into public.purchases(user_id,product_id,order_item_id,status,granted_by) values(v_order.user_id,v_item.product_id,v_item.id,'active','purchase') on conflict(user_id,product_id,order_item_id) do update set status='active',revoked_at=null,revoke_reason=null;
    if v_item.product_kind_snapshot='kit' then for v_kit_item in select * from public.kit_items where kit_product_id=v_item.product_id loop
      insert into public.purchases(user_id,product_id,order_item_id,status,granted_by) values(v_order.user_id,v_kit_item.included_product_id,v_item.id,'active','kit') on conflict(user_id,product_id,order_item_id) do update set status='active',revoked_at=null,revoke_reason=null;
    end loop; end if;
    update public.products set sales_count=sales_count+1,updated_at=now() where id=v_item.product_id;
  end loop;
  return query select v_order.id, v_order.user_id, true;
end; $$;

create or replace function public.revoke_order_purchases(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.purchases p set status='revoked',revoked_at=now(),revoke_reason=p_reason from public.order_items oi where oi.order_id=p_order_id and p.order_item_id=oi.id and p.status='active';
end; $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_files enable row level security;
alter table public.product_previews enable row level security;
alter table public.kit_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.purchases enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.webhook_events enable row level security;
alter table public.email_events enable row level security;
alter table public.contact_messages enable row level security;

create policy "profile own read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "profile own update" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check ((id=auth.uid() and role='user') or public.is_admin());
create policy "public published products" on public.products for select using (status='published' and is_demo=false or public.is_admin());
create policy "public active categories" on public.categories for select using (is_active=true or public.is_admin());
create policy "public product categories" on public.product_categories for select using (true);
create policy "public previews" on public.product_previews for select using (true);
create policy "public kit items" on public.kit_items for select using (true);
create policy "admin product manage" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin category manage" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin relation manage" on public.product_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin file manage" on public.product_files for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin preview manage" on public.product_previews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kit manage" on public.kit_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin coupon manage" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cart own manage" on public.carts for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "cart item own manage" on public.cart_items for all to authenticated using (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid())) with check (exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy "orders own read" on public.orders for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "order items own read" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy "payments own read" on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy "purchases own read" on public.purchases for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "admin operations read" on public.webhook_events for select to authenticated using (public.is_admin());
create policy "admin email read" on public.email_events for select to authenticated using (public.is_admin());
create policy "contact insert" on public.contact_messages for insert with check (true);
create policy "admin contact manage" on public.contact_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin private storage" on storage.objects for all to authenticated using (bucket_id='materials' and public.is_admin()) with check (bucket_id='materials' and public.is_admin());

grant execute on function public.create_checkout_order(uuid[], text) to authenticated;
revoke all on function public.approve_payment_and_grant(uuid, text, integer, text, public.payment_status, jsonb) from public;
revoke all on function public.revoke_order_purchases(uuid, text) from public;

create trigger categories_touch before update on public.categories for each row execute procedure public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute procedure public.touch_updated_at();
create trigger coupons_touch before update on public.coupons for each row execute procedure public.touch_updated_at();
