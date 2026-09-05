-- WOMAN 656: todo producto creado en ADMIN debe existir también en Contabilidad.
-- Los productos creados sin factura se registran como partidas pendientes, sin inventar costos.

alter table public.purchase_items
  alter column invoice_id drop not null;

create or replace function public.sync_shop_product_to_accounting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tax numeric(6,3) := 16;
  v_margin numeric(7,2) := 50;
begin
  if tg_op = 'DELETE' then
    delete from public.purchase_items
    where shop_product_id = old.id
      and source_reference = 'CATALOG_AUTO';
    return old;
  end if;

  select
    coalesce(sales_tax_rate, default_tax_rate, 16),
    coalesce(default_margin_percent, 50)
  into v_tax, v_margin
  from public.pricing_settings
  where id = 1;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.purchase_items
      where shop_product_id = new.id
    ) then
      insert into public.purchase_items (
        invoice_id,
        shop_product_id,
        source_reference,
        sku,
        description,
        category,
        quantity,
        unit_cost,
        tax_rate,
        tax_included,
        tax_creditable,
        shipping_allocated,
        duties_allocated,
        other_allocated,
        margin_percent,
        real_unit_cost,
        suggested_price,
        final_price,
        import_status
      ) values (
        null,
        new.id,
        'CATALOG_AUTO',
        new.sku,
        new.name,
        coalesce(nullif(new.category,''), 'NOVEDADES'),
        1,
        0,
        v_tax,
        false,
        false,
        0,
        0,
        0,
        v_margin,
        0,
        0,
        new.price,
        'pending'
      );
    end if;
    return new;
  end if;

  update public.purchase_items
  set sku = new.sku,
      description = new.name,
      category = coalesce(nullif(new.category,''), category),
      final_price = new.price,
      updated_at = now()
  where shop_product_id = new.id
    and source_reference = 'CATALOG_AUTO';

  return new;
end;
$$;

drop trigger if exists trg_sync_shop_product_to_accounting on public.shop_products;
create trigger trg_sync_shop_product_to_accounting
after insert or update on public.shop_products
for each row execute function public.sync_shop_product_to_accounting();

drop trigger if exists trg_remove_catalog_auto_accounting_before_product_delete on public.shop_products;
create trigger trg_remove_catalog_auto_accounting_before_product_delete
before delete on public.shop_products
for each row execute function public.sync_shop_product_to_accounting();

insert into public.purchase_items (
  invoice_id,
  shop_product_id,
  source_reference,
  sku,
  description,
  category,
  quantity,
  unit_cost,
  tax_rate,
  tax_included,
  tax_creditable,
  shipping_allocated,
  duties_allocated,
  other_allocated,
  margin_percent,
  real_unit_cost,
  suggested_price,
  final_price,
  import_status
)
select
  null,
  sp.id,
  'CATALOG_AUTO',
  sp.sku,
  sp.name,
  coalesce(nullif(sp.category,''), 'NOVEDADES'),
  1,
  0,
  coalesce(ps.sales_tax_rate, ps.default_tax_rate, 16),
  false,
  false,
  0,
  0,
  0,
  coalesce(ps.default_margin_percent, 50),
  0,
  0,
  sp.price,
  'pending'
from public.shop_products sp
left join public.pricing_settings ps on ps.id = 1
where not exists (
  select 1
  from public.purchase_items pi
  where pi.shop_product_id = sp.id
);
