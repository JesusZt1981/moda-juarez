(() => {
  'use strict';
  if(window.__W656_UNIFIED_ANALYTICS__) return;
  window.__W656_UNIFIED_ANALYTICS__=true;

  const SUPABASE_URL='https://snkuvxpddxcmbfhgabbx.supabase.co';
  const SUPABASE_KEY='sb_publishable_z2Z7BluzsEpaqPxyYWTxjg_kkcme7xK';
  const VISITOR_KEY='woman656_visitor_id';
  const SESSION_KEY='woman656_session_id';
  const ATTR_KEY='woman656_attribution_v1';
  const META_CONSENT_KEY='woman656_meta_consent';
  const OWNER_EMAIL='jzutenorio@gmail.com';
  const CUSTOMER_STORAGE_KEY='woman656-customer-auth-token-v1';
  const ADMIN_STORAGE_KEY='woman656-auth-token-v1';
  const META_PIXEL_ID=String(window.WOMAN656_META_PIXEL_ID||'1087645153771143').trim();
  const uuid=()=>globalThis.crypto?.randomUUID?.()||`w656-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let sbCustomer=null,sbAdmin=null,trackingDisabled=false,metaReady=false;

  function getVisitorId(){let id=localStorage.getItem(VISITOR_KEY);if(!id){id=uuid();localStorage.setItem(VISITOR_KEY,id)}return id}
  function getSessionId(){let id=sessionStorage.getItem(SESSION_KEY);if(!id){id=uuid();sessionStorage.setItem(SESSION_KEY,id)}return id}
  function customerClient(){if(sbCustomer)return sbCustomer;if(!window.supabase?.createClient)return null;sbCustomer=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:CUSTOMER_STORAGE_KEY}});return sbCustomer}
  function adminClient(){if(sbAdmin)return sbAdmin;if(!window.supabase?.createClient)return null;sbAdmin=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:ADMIN_STORAGE_KEY}});return sbAdmin}

  async function isOwnerLoggedIn(){for(const c of [adminClient(),customerClient()]){if(!c)continue;try{const {data:{session}}=await c.auth.getSession();if(String(session?.user?.email||'').toLowerCase()===OWNER_EMAIL)return true}catch(_){}}return false}
  function inferSource(){const ref=(document.referrer||'').toLowerCase();if(ref.includes('instagram.com'))return 'instagram';if(ref.includes('facebook.com')||ref.includes('fb.com'))return 'facebook';if(ref.includes('google.'))return 'google';return ref?'referral':'direct'}

  function captureAttribution(){
    const q=new URLSearchParams(location.search);
    const current={source:q.get('utm_source')||inferSource(),medium:q.get('utm_medium')||'',campaign:q.get('utm_campaign')||'',content:q.get('utm_content')||q.get('product')||'',term:q.get('utm_term')||'',campaign_id:q.get('campaign_id')||q.get('utm_campaign_id')||q.get('utm_id')||'',adset_id:q.get('adset_id')||q.get('utm_term')||'',ad_id:q.get('ad_id')||'',fbclid:q.get('fbclid')||'',landing_url:location.href,referrer:document.referrer||'',captured_at:new Date().toISOString()};
    let saved={};try{saved=JSON.parse(localStorage.getItem(ATTR_KEY)||'{}')||{}}catch(_){}
    const hasCampaign=current.fbclid||current.campaign||current.ad_id||q.get('utm_source');
    const result={first_touch:saved.first_touch||current,last_touch:hasCampaign?current:(saved.last_touch||current)};
    localStorage.setItem(ATTR_KEY,JSON.stringify(result));return result;
  }
  function attribution(){try{return JSON.parse(localStorage.getItem(ATTR_KEY)||'{}')||{}}catch(_){return {}}}
  function lastTouch(){const a=attribution();return a.last_touch||a.first_touch||a||{}}

  function metaConsentGranted(){return localStorage.getItem(META_CONSENT_KEY)==='granted'}
  function initMeta(){if(metaReady)return true;if(!META_PIXEL_ID||!metaConsentGranted()||trackingDisabled)return false;if(!window.fbq){const f=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments)};f.push=f;f.loaded=true;f.version='2.0';f.queue=[];window.fbq=f;const s=document.createElement('script');s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(s)}window.fbq('set','autoConfig',false,META_PIXEL_ID);window.fbq('init',META_PIXEL_ID);metaReady=true;return true}
  function sendMeta(eventName,sku,metadata={}){const map={store_visit:'PageView',product_view:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase',lead:'Lead'};const metaName=map[eventName];if(!metaName||!initMeta())return;const payload={currency:'MXN'};if(sku)payload.content_ids=[sku];if(metadata?.value!=null)payload.value=Number(metadata.value)||0;if(sku)payload.content_type='product';window.fbq('track',metaName,payload,{eventID:metadata.event_id})}

  async function record(eventName,sku=null,metadata={}){
    if(trackingDisabled)return false;const c=customerClient();if(!c)return false;const eventId=metadata.event_id||uuid();const enriched={...metadata,event_id:eventId,attribution:attribution(),path:location.pathname};
    try{const {data,error}=await c.rpc('record_store_event',{p_event_name:eventName,p_visitor_id:getVisitorId(),p_session_id:getSessionId(),p_product_sku:sku,p_metadata:enriched});if(error)throw error;sendMeta(eventName,sku,enriched);return data!==false}catch(err){console.warn('WOMAN 656 analytics:',err?.message||err);return false}
  }

  function card(target){return target?.closest?.('.product-card')||null}
  function sku(target){return card(target)?.querySelector?.('.sku')?.textContent?.trim()||null}
  function size(target){return card(target)?.querySelector?.('.size-select')?.value?.trim()||''}
  function parseMoneyText(value){const cleaned=String(value||'').replace(/[^0-9.,-]/g,'').replace(/,/g,'');const number=Number(cleaned);return Number.isFinite(number)?number:0}
  function productValue(target){return parseMoneyText(card(target)?.querySelector?.('.product-price')?.textContent||'0')}
  function cartValue(){return parseMoneyText(document.getElementById('cartTotal')?.textContent||'0')}

  function bindUnifiedCookieConsent(){const button=document.getElementById('cookieAccept');if(!button||button.dataset.w656MetaBound==='1')return;button.dataset.w656MetaBound='1';button.addEventListener('click',()=>{window.setTimeout(()=>{if(!trackingDisabled&&metaConsentGranted())sendMeta('store_visit',null,{event_id:uuid(),value:0})},0)})}

  document.addEventListener('click',e=>{
    const t=e.target;
    if(t?.matches?.('.product-image,.product-name')){const s=sku(t);if(s)record('product_view',s,{size:size(t)||null,source:'catalog',value:productValue(t)})}
    if(t?.matches?.('.add-btn')){const s=sku(t),z=size(t);if(s&&z)record('add_to_cart',s,{size:z,source:'catalog',value:productValue(t)})}
    if(t?.id==='whatsappBtn')record('begin_checkout',null,{channel:'whatsapp',value:cartValue()});
  },true);
  document.addEventListener('change',e=>{const t=e.target;if(t?.matches?.('.size-select')){const s=sku(t),z=t.value?.trim()||'';if(s&&z)record('size_select',s,{size:z,source:'catalog',value:productValue(t)})}},true);

  window.W656Analytics={visitorId:getVisitorId,sessionId:getSessionId,attribution,record,purchase:({sku=null,value=0,order_id=''}={})=>record('purchase',sku,{value:Number(value)||0,order_id}),lead:(data={})=>record('lead',null,data),metaEnabled:()=>Boolean(META_PIXEL_ID&&metaConsentGranted()),metaPixelId:()=>META_PIXEL_ID||null};

  async function recordLandingProduct(){
    const touch=lastTouch();
    const source=String(touch.source||'').toLowerCase();
    const landingSku=String(touch.content||'').trim();
    if(!landingSku||!['meta','facebook','instagram'].includes(source))return;
    const key=`woman656_meta_landing_view:${getSessionId()}:${landingSku}`;
    if(sessionStorage.getItem(key)==='1')return;
    sessionStorage.setItem(key,'1');
    await record('product_view',landingSku,{source:'meta_catalog_landing',landing:true,value:0});
  }

  async function start(){
    captureAttribution();
    trackingDisabled=await isOwnerLoggedIn();
    if(trackingDisabled){console.info('WOMAN 656 analytics: propietario excluido');return}
    bindUnifiedCookieConsent();
    await record('store_visit',null,{source:'storefront',value:0});
    await recordLandingProduct();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
