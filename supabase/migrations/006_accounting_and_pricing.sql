-- WOMAN 656: control interno de compras, facturas y precios.
-- No sustituye CFDI, declaraciones ni la contabilidad de un profesional.

create table if not exists public.pricing_settings (
  id smallint primary key default 1 check (id = 1),
  default_tax_rate numeric(6,3) not null default 16 check (default_tax_rate between 0 and 100),
  default_margin_percent numeric(7,2) not null default 50 check (default_margin_percent between 0 and 1000),
  price_rounding numeric(8,2) not null default 1 check (price_rounding > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.pricing_settings(id) values (1) on conflict (id) do nothing;

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  invoice_number text,
  invoice_date date,
  currency text not null default 'MXN' check (currency in ('MXN','USD')),
  exchange_rate numeric(12,6) not null default 1 check (exchange_rate > 0),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax_total numeric(14,2) not null default 0 check (tax_total >= 0),
  shipping_total numeric(14,2) not null default 0 check (shipping_total >= 0),
  duties_total numeric(14,2) not null default 0 check (duties_total >= 0),
  other_total numeric(14,2) not null default 0 check (other_total >= 0),
  grand_total numeric(14,2) not null default 0 check (grand_total >= 0),
  pdf_path text unique,
  original_filename text,
  status text not null default 'draft' check (status in ('draft','reviewed','imported','archived')),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  shop_product_id bigint references public.shop_products(id) on delete set null,
  source_line integer,
  source_reference text,
  sku text,
  description text not null,
  category text not null default 'NOVEDADES',
  size text,
  color text,
  quantity integer not null default 1 check (quantity > 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  tax_rate numeric(6,3) not null default 16 check (tax_rate between 0 and 100),
  tax_included boolean not null default true,
  tax_creditable boolean not null default false,
  shipping_allocated numeric(14,2) not null default 0 check (shipping_allocated >= 0),
  duties_allocated numeric(14,2) not null default 0 check (duties_allocated >= 0),
  other_allocated numeric(14,2) not null default 0 check (other_allocated >= 0),
  image_path text,
  margin_percent numeric(7,2) not null default 50 check (margin_percent between 0 and 1000),
  real_unit_cost numeric(14,2),
  suggested_price numeric(14,2),
  final_price numeric(14,2),
  import_status text not null default 'pending' check (import_status in ('pending','ready','imported','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pricing_settings enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_items enable row level security;
grant select, insert, update, delete on public.pricing_settings, public.purchase_invoices, public.purchase_items to authenticated;

drop policy if exists pricing_settings_admin_all on public.pricing_settings;
create policy pricing_settings_admin_all on public.pricing_settings for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists purchase_invoices_admin_all on public.purchase_invoices;
create policy purchase_invoices_admin_all on public.purchase_invoices for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists purchase_items_admin_all on public.purchase_items;
create policy purchase_items_admin_all on public.purchase_items for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('accounting-documents','accounting-documents',false,20971520,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists accounting_documents_admin_select on storage.objects;
create policy accounting_documents_admin_select on storage.objects for select to authenticated
using (bucket_id='accounting-documents' and (select public.is_admin()));
drop policy if exists accounting_documents_admin_insert on storage.objects;
create policy accounting_documents_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='accounting-documents' and (select public.is_admin()));
drop policy if exists accounting_documents_admin_update on storage.objects;
create policy accounting_documents_admin_update on storage.objects for update to authenticated
using (bucket_id='accounting-documents' and (select public.is_admin()))
with check (bucket_id='accounting-documents' and (select public.is_admin()));
drop policy if exists accounting_documents_admin_delete on storage.objects;
create policy accounting_documents_admin_delete on storage.objects for delete to authenticated
using (bucket_id='accounting-documents' and (select public.is_admin()));
