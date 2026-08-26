-- Verificación de instalación. Solo consulta; no modifica datos.

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'profiles','shop_products','shop_product_variants','shop_inventory',
    'shop_inventory_movements','bot_products','bot_posts','bot_leads',
    'bot_sales','bot_settings','bot_marketing_events'
  )
order by table_name;

select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets
where id='productos';

select schemaname,tablename,policyname
from pg_policies
where schemaname in ('public','storage')
  and (
    tablename like 'shop_%'
    or tablename='profiles'
    or (schemaname='storage' and tablename='objects')
  )
order by schemaname,tablename,policyname;

