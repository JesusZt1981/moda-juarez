-- WOMAN 656: campañas y biblioteca privada de contenido.
-- Ejecutar después de 001, 002 y 003 en el proyecto Supabase de WOMAN 656.

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null default 'promotion',
  title text not null default '',
  offer text not null default '',
  cta text not null default '',
  landing_url text not null,
  platform text not null default 'manual',
  status text not null default 'draft'
    check (status in ('draft','approved','scheduled','published','archived')),
  product_skus text[] not null default '{}',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  asset_type text not null check (asset_type in ('image','carousel','reel','story','cover')),
  generator_mode text not null default 'template'
    check (generator_mode in ('template','ai-local','ai-provider')),
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  width integer,
  height integer,
  duration_seconds numeric(8,2),
  version integer not null default 1 check (version > 0),
  prompt text not null default '',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_created
  on public.marketing_campaigns(created_at desc);
create index if not exists idx_marketing_assets_campaign_created
  on public.marketing_assets(campaign_id,created_at desc);

alter table public.marketing_campaigns enable row level security;
alter table public.marketing_assets enable row level security;

drop policy if exists marketing_campaigns_admin_all on public.marketing_campaigns;
create policy marketing_campaigns_admin_all on public.marketing_campaigns
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists marketing_assets_admin_all on public.marketing_assets;
create policy marketing_assets_admin_all on public.marketing_assets
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'campaign-media',
  'campaign-media',
  false,
  52428800,
  array['image/png','image/jpeg','image/webp','video/webm','video/mp4','application/zip']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists campaign_media_admin_select on storage.objects;
create policy campaign_media_admin_select on storage.objects
for select to authenticated
using (bucket_id='campaign-media' and (select public.is_admin()));

drop policy if exists campaign_media_admin_insert on storage.objects;
create policy campaign_media_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id='campaign-media' and (select public.is_admin()));

drop policy if exists campaign_media_admin_update on storage.objects;
create policy campaign_media_admin_update on storage.objects
for update to authenticated
using (bucket_id='campaign-media' and (select public.is_admin()))
with check (bucket_id='campaign-media' and (select public.is_admin()));

drop policy if exists campaign_media_admin_delete on storage.objects;
create policy campaign_media_admin_delete on storage.objects
for delete to authenticated
using (bucket_id='campaign-media' and (select public.is_admin()));

grant select,insert,update,delete on public.marketing_campaigns to authenticated;
grant select,insert,update,delete on public.marketing_assets to authenticated;

