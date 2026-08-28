select
  to_regclass('public.pricing_settings') is not null as pricing_settings_ok,
  to_regclass('public.purchase_invoices') is not null as purchase_invoices_ok,
  to_regclass('public.purchase_items') is not null as purchase_items_ok,
  exists(select 1 from storage.buckets where id='accounting-documents' and public=false) as private_bucket_ok,
  (select count(*) from pg_policies where schemaname='public' and tablename in ('pricing_settings','purchase_invoices','purchase_items')) as table_policies,
  (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'accounting_documents_%') as storage_policies;
