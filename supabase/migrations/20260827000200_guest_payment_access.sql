-- =========================================================
-- TEACHER LUANA MARCONDES
-- ACESSO AUTOMÁTICO APÓS PAGAMENTO DE CONVIDADO
-- =========================================================

-- Esta função vincula um pedido a um usuário e libera
-- os materiais após o pagamento aprovado.

create or replace function public.grant_order_access(
  p_order_id uuid,
  p_user_id uuid
)

returns table(
  order_id uuid,
  user_id uuid,
  granted boolean
)

language plpgsql
security definer
set search_path = public
as $$

declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_kit_item public.kit_items%rowtype;

begin

  -- Busca e bloqueia o pedido durante o processamento.
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  -- Segurança: somente pedidos aprovados podem liberar acesso.
  if v_order.status <> 'approved' then
    raise exception 'O pedido ainda não foi aprovado';
  end if;

  -- Vincula o pedido ao usuário.
  update public.orders
  set
    user_id = p_user_id,
    updated_at = now()
  where id = v_order.id;

  -- Libera cada produto comprado.
  for v_item in
    select *
    from public.order_items
    where order_id = v_order.id
  loop

    insert into public.purchases (
      user_id,
      product_id,
      order_item_id,
      status,
      granted_by
    )
    values (
      p_user_id,
      v_item.product_id,
      v_item.id,
      'active',
      'purchase'
    )
    on conflict (user_id, product_id, order_item_id)
    do update
    set
      status = 'active',
      revoked_at = null,
      revoke_reason = null;

    -- Se for um kit, libera também os materiais internos.
    if v_item.product_kind_snapshot = 'kit' then

      for v_kit_item in
        select *
        from public.kit_items
        where kit_product_id = v_item.product_id
      loop

        insert into public.purchases (
          user_id,
          product_id,
          order_item_id,
          status,
          granted_by
        )
        values (
          p_user_id,
          v_kit_item.included_product_id,
          v_item.id,
          'active',
          'kit'
        )
        on conflict (user_id, product_id, order_item_id)
        do update
        set
          status = 'active',
          revoked_at = null,
          revoke_reason = null;

      end loop;

    end if;

  end loop;

  return query
  select
    v_order.id,
    p_user_id,
    true;

end;
$$;


-- Esta função não deve ficar acessível ao público.
revoke all on function public.grant_order_access(uuid, uuid) from public;