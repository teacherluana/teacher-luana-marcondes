-- =========================================================
-- TEACHER LUANA MARCONDES
-- CHECKOUT COMO CONVIDADO
-- =========================================================

-- 1. Permitir pedidos sem usuário autenticado.
alter table public.orders
  alter column user_id drop not null;

-- 2. Dados do cliente convidado.
alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_email text;

-- 3. Pelo menos uma forma de identificar o comprador deve existir.
alter table public.orders
  add constraint orders_customer_identity_check
  check (
    user_id is not null
    or (
      customer_name is not null
      and customer_email is not null
    )
  );

-- 4. Índice para localizar compras pelo e-mail do cliente.
create index if not exists orders_customer_email_idx
  on public.orders (lower(customer_email));

-- 5. Substituir a função de criação do checkout.
create or replace function public.create_checkout_order(
  p_product_ids uuid[],
  p_coupon_code text default null,
  p_customer_name text default null,
  p_customer_email text default null
)

returns table(
  order_id uuid,
  order_number text,
  external_reference uuid,
  total_cents integer,
  line_titles text[]
)

language plpgsql
security definer
set search_path = public
as $$

declare
  v_user uuid := auth.uid();
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_coupon public.coupons%rowtype;
  v_order_id uuid;
  v_number text;
  v_product public.products%rowtype;
  v_customer_name text := nullif(trim(coalesce(p_customer_name, '')), '');
  v_customer_email text := lower(nullif(trim(coalesce(p_customer_email, '')), ''));

begin

  -- Deve existir usuário autenticado OU nome e e-mail do cliente.
  if v_user is null and (v_customer_name is null or v_customer_email is null) then
    raise exception 'Informe nome e e-mail para continuar';
  end if;

  if v_customer_email is not null
     and v_customer_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'E-mail inválido';
  end if;

  if coalesce(array_length(p_product_ids, 1), 0) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  if (
    select count(distinct x)
    from unnest(p_product_ids) x
  ) <> array_length(p_product_ids, 1) then
    raise exception 'Produtos duplicados';
  end if;

  for v_product in
    select *
    from public.products
    where id = any(p_product_ids)
      and status = 'published'
      and is_demo = false
  loop
    v_subtotal := v_subtotal
      + coalesce(v_product.sale_price_cents, v_product.regular_price_cents);
  end loop;

  if (
    select count(*)
    from public.products
    where id = any(p_product_ids)
      and status = 'published'
      and is_demo = false
  ) <> array_length(p_product_ids, 1) then
    raise exception 'Produto indisponível';
  end if;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then

    select *
    into v_coupon
    from public.coupons
    where code = upper(trim(p_coupon_code))
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
    for update;

    if not found then
      raise exception 'Cupom inválido';
    end if;

    if v_coupon.max_uses is not null
       and v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'Cupom esgotado';
    end if;

    if v_subtotal < v_coupon.min_order_cents then
      raise exception 'Pedido não atingiu o mínimo do cupom';
    end if;

    v_discount := least(
      v_subtotal,
      case
        when v_coupon.discount_type = 'percentage'
          then floor(
            v_subtotal * v_coupon.discount_value / 100.0
          )::integer
        else v_coupon.discount_value
      end
    );

  end if;

  v_total := v_subtotal - v_discount;

  v_number :=
    'TLM-'
    || to_char(now(), 'YYYYMMDD')
    || '-'
    || upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        6
      )
    );

  insert into public.orders (
    order_number,
    user_id,
    customer_name,
    customer_email,
    subtotal_cents,
    discount_cents,
    total_cents,
    coupon_id
  )
  values (
    v_number,
    v_user,
    v_customer_name,
    v_customer_email,
    v_subtotal,
    v_discount,
    v_total,
    v_coupon.id
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    title_snapshot,
    product_kind_snapshot,
    unit_price_cents
  )
  select
    v_order_id,
    p.id,
    p.title,
    p.product_kind,
    coalesce(p.sale_price_cents, p.regular_price_cents)
  from public.products p
  where p.id = any(p_product_ids);

  insert into public.payments (
    order_id,
    amount_cents
  )
  values (
    v_order_id,
    v_total
  );

  return query
  select
    o.id,
    o.order_number,
    o.external_reference,
    o.total_cents,
    array_agg(
      oi.title_snapshot
      order by oi.created_at
    )
  from public.orders o
  join public.order_items oi
    on oi.order_id = o.id
  where o.id = v_order_id
  group by o.id;

end;
$$;

-- Permitir que usuários autenticados continuem usando a função.
grant execute on function public.create_checkout_order(
  uuid[],
  text,
  text,
  text
) to authenticated;

-- Também permitir checkout de convidados.
grant execute on function public.create_checkout_order(
  uuid[],
  text,
  text,
  text
) to anon;