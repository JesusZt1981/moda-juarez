select
  to_regclass('public.marketing_campaigns') is not null as campaigns_table_ok,
  to_regclass('public.marketing_assets') is not null as assets_table_ok,
  exists(select 1 from storage.buckets where id='campaign-media' and public=false) as private_bucket_ok,
  (select count(*) from pg_policies
    where (schemaname='public' and tablename in ('marketing_campaigns','marketing_assets'))
       or (schemaname='storage' and tablename='objects' and policyname like 'campaign_media_%')) as policies_found;
