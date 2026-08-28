select
  to_regclass('public.accounting_transactions') is not null transactions_ok,
  to_regclass('public.accounting_entries') is not null entries_ok,
  to_regclass('public.accounting_entry_lines') is not null lines_ok,
  to_regclass('public.accounting_trial_balance') is not null trial_balance_ok,
  to_regprocedure('public.post_accounting_transaction(uuid)') is not null posting_function_ok,
  (select sales_tax_rate from public.pricing_settings where id=1) sales_tax_rate,
  (select fiscal_regime from public.pricing_settings where id=1) fiscal_regime,
  (select count(*) from public.accounting_accounts) account_count,
  (select count(*) from pg_policies where schemaname='public' and tablename like 'accounting_%') policy_count;
