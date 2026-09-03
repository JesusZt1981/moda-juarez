(() => {
  const VISITOR_KEY = 'woman656_visitor_id';
  const SESSION_KEY = 'woman656_session_id';
  const ACCOUNT_URL = 'cuenta.html';
  const STATS_URL = 'estadisticas.html';
  const SUPABASE_URL = 'https://snkuvxpddxcmbfhgabbx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_z2Z7BluzsEpaqPxyYWTxjg_kkcme7xK';
  const CUSTOMER_STORAGE_KEY = 'woman656-customer-auth-token-v1';
  const uuid = () => globalThis.crypto?.randomUUID?.() || `w656-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let customerSupabase = null;

  function getVisitorId(){
    let id = localStorage.getItem(VISITOR_KEY);
    if(!id){ id = uuid(); localStorage.setItem(VISITOR_KEY,id); }
    return id;
  }
  function getSessionId(){
    let id = sessionStorage.getItem(SESSION_KEY);
    if(!id){ id = uuid(); sessionStorage.setItem(SESSION_KEY,id); }
    return id;
  }
  function client(){
    try{
      if(customerSupabase) return customerSupabase;
      if(!window.supabase?.createClient) return null;
      customerSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:CUSTOMER_STORAGE_KEY}}
      );
      return customerSupabase;
    }catch(_){ return null; }
  }
  async function record(eventName, sku=null, metadata={}){
    const c = client(); if(!c) return;
    try{
      await c.rpc('record_store_event',{
        p_event_name:eventName,
        p_visitor_id:getVisitorId(),
        p_session_id:getSessionId(),
        p_product_sku:sku,
        p_metadata:metadata
      });
    }catch(err){ console.warn('WOMAN 656 analytics:',err?.message || err); }
  }

  function skuFromCard(target){
    const card = target?.closest?.('.product-card');
    return card?.querySelector?.('.sku')?.textContent?.trim() || null;
  }

  function injectAccountButton(){
    const actions = document.querySelector('.header-actions');
    if(!actions || document.getElementById('customerAccountBtn')) return;
    const btn = document.createElement('button');
    btn.type='button'; btn.id='customerAccountBtn'; btn.className='icon-btn';
    btn.title='Mi cuenta WOMAN 656'; btn.setAttribute('aria-label','Mi cuenta'); btn.textContent='👤';
    btn.addEventListener('click',()=>location.href=ACCOUNT_URL);
    actions.insertBefore(btn,actions.firstChild);
  }

  function injectStatsButton(){
    const host = document.getElementById('adminTopActions');
    if(!host || document.getElementById('openStatisticsBtn')) return;
    const btn = document.createElement('button');
    btn.type='button'; btn.id='openStatisticsBtn'; btn.className='secondary-btn'; btn.textContent='📊 Estadísticas';
    btn.addEventListener('click',async()=>{
      try{
        if(typeof requireShopAdmin === 'function') await requireShopAdmin();
        location.href=STATS_URL;
      }catch(err){ alert(err?.message || 'Inicia sesión como ADMIN.'); }
    });
    host.appendChild(btn);
  }

  async function syncExistingFavorites(){
    const c=client(); if(!c) return;
    const {data:{session}} = await c.auth.getSession();
    if(!session?.user) return;
    const local = new Set(JSON.parse(localStorage.getItem('woman656_favorites')||'[]').map(String));
    for(const sku of local){
      await c.rpc('toggle_product_like',{p_product_sku:sku,p_like:true}).catch(()=>{});
    }
  }

  function enhanceNewsletter(){
    const form=document.getElementById('newsletterForm');
    if(!form || document.getElementById('newsletterAdult')) return;
    const label=document.createElement('label');
    label.style.cssText='display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.35;margin-top:8px';
    label.innerHTML='<input id="newsletterAdult" type="checkbox" required style="margin-top:2px"> <span>Confirmo que tengo 18 años o más y acepto recibir promociones y ofertas de WOMAN 656 por correo.</span>';
    form.appendChild(label);
    form.addEventListener('submit',async()=>{
      const email=document.getElementById('newsletterEmail')?.value?.trim();
      const adult=document.getElementById('newsletterAdult')?.checked === true;
      if(!email || !adult) return;
      const c=client(); if(!c) return;
      const {error}=await c.rpc('subscribe_marketing',{p_email:email,p_adult_confirmed:true,p_source:'newsletter'});
      const status=document.getElementById('newsletterStatus');
      if(status) status.textContent = error ? `No se pudo guardar: ${error.message}` : '✓ Preferencia guardada.';
    },true);
  }

  document.addEventListener('click',event=>{
    const target=event.target;
    if(target?.matches?.('.product-image,.product-name')){
      const sku=skuFromCard(target); if(sku) record('product_view',sku,{source:'catalog'});
    }
    if(target?.matches?.('.add-btn')){
      const sku=skuFromCard(target); if(sku) record('add_to_cart',sku,{source:'catalog'});
    }
    if(target?.matches?.('.favorite-btn')){
      const sku=skuFromCard(target); if(!sku) return;
      setTimeout(async()=>{
        const c=client(); if(!c) return;
        const {data:{session}}=await c.auth.getSession();
        if(!session?.user) return;
        const liked = JSON.parse(localStorage.getItem('woman656_favorites')||'[]').map(String).includes(String(sku));
        await c.rpc('toggle_product_like',{p_product_sku:sku,p_like:liked}).catch(()=>{});
      },25);
    }
    if(target?.id === 'whatsappBtn') record('begin_checkout',null,{channel:'whatsapp'});
  },true);

  async function start(){
    injectAccountButton(); injectStatsButton(); enhanceNewsletter();
    await record('store_visit',null,{path:location.pathname});
    await syncExistingFavorites();
    const c=client();
    if(c){ c.auth.onAuthStateChange(()=>setTimeout(()=>{record('store_visit',null,{path:location.pathname});syncExistingFavorites();},50)); }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
