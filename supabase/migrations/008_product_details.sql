-- WOMAN 656: datos técnicos visibles en la ficha del producto.
-- Migración aditiva: no elimina ni modifica los productos existentes.

alter table public.shop_products
  add column if not exists fabric_type text,
  add column if not exists care_instructions text,
  add column if not exists country_of_origin text;

comment on column public.shop_products.fabric_type is
  'Composición o tipo de tejido, por ejemplo 97% poliéster; 3% elastano.';
comment on column public.shop_products.care_instructions is
  'Instrucciones de cuidado del producto.';
comment on column public.shop_products.country_of_origin is
  'País de origen declarado para el producto.';
