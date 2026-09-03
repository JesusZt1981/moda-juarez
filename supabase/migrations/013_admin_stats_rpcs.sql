-- WOMAN 656 · RPC privados del panel ADMIN de estadísticas

create or replace function public.admin_store_stats(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_days integer:=greatest(1,least(coalesce(p_days,30),365));
  v_start date:=(timezone('America/Ciudad_Juarez',now()))::date-(greatest(1,least(coalesce(p_days,30),365))-1);
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  with period_events as (
    select * from public.store_analytics_events where event_date>=v_start
  ), daily as (
    select event_date day,count(*) filter(where event_name='store_visit') visitors
    from period_events group by event_date order by event_date
  ), view_counts as (
    select product_sku,count(*) views from period_events where event_name='product_view' and product_sku is not null group by product_sku
  ), cart_counts as (
    select product_sku,count(*) carts from period_events where event_name='add_to_cart' and product_sku is not null group by product_sku
  ), like_counts as (
    select p.sku,count(pl.*) likes from public.shop_products p left join public.product_likes pl on pl.product_id=p.id group by p.sku
  ), product_rank as (
    select p.sku,p.name,coalesce(v.views,0) views,coalesce(c.carts,0) carts,coalesce(l.likes,0) likes
    from public.shop_products p left join view_counts v on v.product_sku=p.sku left join cart_counts c on c.product_sku=p.sku left join like_counts l on l.sku=p.sku
    where coalesce(v.views,0)+coalesce(c.carts,0)+coalesce(l.likes,0)>0
    order by coalesce(v.views,0) desc,coalesce(l.likes,0) desc,coalesce(c.carts,0) desc limit 20
  ), ages as (
    select case when age between 13 and 17 then '13-17' when age between 18 and 24 then '18-24' when age between 25 and 34 then '25-34' when age between 35 and 44 then '35-44' when age between 45 and 54 then '45-54' when age between 55 and 64 then '55-64' when age between 65 and 80 then '65-80' else 'Sin dato' end age_range,count(*) users
    from public.profiles where role='customer' group by 1
  )
  select jsonb_build_object(
    'days',v_days,'start_date',v_start,
    'unique_visitors',(select count(distinct case when user_id is not null then 'u:'||user_id::text else 'v:'||visitor_id end) from period_events where event_name='store_visit'),
    'registered_visitors',(select count(distinct user_id) from period_events where event_name='store_visit' and user_id is not null),
    'sessions',(select count(distinct session_id) from period_events where session_id is not null),
    'product_views',(select count(*) from period_events where event_name='product_view'),
    'add_to_cart',(select count(*) from period_events where event_name='add_to_cart'),
    'begin_checkout',(select count(*) from period_events where event_name='begin_checkout'),
    'new_users',(select count(*) from public.profiles where role='customer' and created_at::date>=v_start),
    'likes_total',(select count(*) from public.product_likes),
    'marketing_opt_in',(select count(*) from public.profiles where role='customer' and marketing_consent=true),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('date',day,'visitors',visitors) order by day) from daily),'[]'::jsonb),
    'age_ranges',coalesce((select jsonb_agg(jsonb_build_object('range',age_range,'users',users) order by age_range) from ages),'[]'::jsonb),
    'top_products',coalesce((select jsonb_agg(jsonb_build_object('sku',sku,'name',name,'views',views,'likes',likes,'carts',carts)) from product_rank),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;$$;

create or replace function public.admin_customer_list(p_limit integer default 100,p_offset integer default 0)
returns table(user_id uuid,first_name text,last_name text,email text,phone text,age smallint,auth_provider text,marketing_consent boolean,created_at timestamptz,last_seen timestamptz,visit_days bigint,product_views bigint,likes_count bigint)
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  return query select p.id,p.first_name,p.last_name,coalesce(p.contact_email,p.email),p.phone,p.age,p.auth_provider,p.marketing_consent,p.created_at,p.last_seen,
    (select count(*) from public.store_analytics_events e where e.user_id=p.id and e.event_name='store_visit'),
    (select count(*) from public.store_analytics_events e where e.user_id=p.id and e.event_name='product_view'),
    (select count(*) from public.product_likes l where l.user_id=p.id)
  from public.profiles p where p.role='customer' order by p.last_seen desc nulls last,p.created_at desc
  limit greatest(1,least(coalesce(p_limit,100),500)) offset greatest(coalesce(p_offset,0),0);
end;$$;

create or replace function public.admin_customer_activity(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'No autorizado'; end if;
  select jsonb_build_object(
    'views',coalesce((select jsonb_agg(jsonb_build_object('sku',x.product_sku,'name',x.name,'last_viewed',x.last_viewed,'days_viewed',x.days_viewed) order by x.last_viewed desc) from (
      select e.product_sku,coalesce(p.name,e.product_sku) name,max(e.occurred_at) last_viewed,count(*) days_viewed
      from public.store_analytics_events e left join public.shop_products p on p.id=e.product_id
      where e.user_id=p_user_id and e.event_name='product_view' group by e.product_sku,p.name order by max(e.occurred_at) desc limit 50
    ) x),'[]'::jsonb),
    'likes',coalesce((select jsonb_agg(jsonb_build_object('sku',p.sku,'name',p.name,'liked_at',l.created_at) order by l.created_at desc)
      from public.product_likes l join public.shop_products p on p.id=l.product_id where l.user_id=p_user_id),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;$$;

revoke all on function public.admin_store_stats(integer) from public;
grant execute on function public.admin_store_stats(integer) to authenticated;
revoke all on function public.admin_customer_list(integer,integer) from public;
grant execute on function public.admin_customer_list(integer,integer) to authenticated;
revoke all on function public.admin_customer_activity(uuid) from public;
grant execute on function public.admin_customer_activity(uuid) to authenticated;
