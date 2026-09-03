(() => {
  const VISITOR_KEY='woman656_visitor_id';
  const SESSION_KEY='woman656_session_id';
  const ACCOUNT_URL='cuenta.html';
  const STATS_URL='estadisticas.html';
  const SUPPORT_ADMIN_URL='soporte-admin.html';
  const PRIVACY_URL='privacidad.html';
  const CUSTOMER_STORAGE_KEY='woman656-customer-auth-token-v1';
  const PENDING_RETURN_KEY='woman656-customer-return';
  const SOFT_PROMPT_KEY='woman656-account-prompt-dismissed-at';
  const SUPABASE_URL='https://snkuvxpddxcmbfhgabbx.supabase.co';
  const SUPABASE_KEY='sb_publishable_z2Z7BluzsEpaqPxyYWTxjg_kkcme7xK';
  const CONTACT_WHATSAPP='5216567770986';
  const CONTACT_EMAIL='ventas@woman656.com';
  const uuid=()=>globalThis.crypto?.randomUUID?.()||`w656-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let customerSupabase=null;
  let customerSession=null;
  let productViewsThisSession=0;
  let promptOpen=false;

  function getVisitorId(){let id=localStorage.getItem(VISITOR_KEY);if(!id){id=uuid();localStorage.setItem(VISITOR_KEY,id)}return id}
  function getSessionId(){let id=sessionStorage.getItem(SESSION_KEY);if(!id){id=uuid();sessionStorage.setItem(SESSION_KEY,id)}return id}
  function client(){try{if(customerSupabase)return customerSupabase;if(!window.supabase?.createClient)return null;customerSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:CUSTOMER_STORAGE_KEY}});return customerSupabase}catch(_){return null}}
  async function record(eventName,sku=null,metadata={}){const c=client();if(!c)return;try{await c.rpc('record_store_event',{p_event_name:eventName,p_visitor_id:getVisitorId(),p_session_id:getSessionId(),p_product_sku:sku,p_metadata:metadata})}catch(err){console.warn('WOMAN 656 analytics:',err?.message||err)}}
  function cardFrom(target){return target?.closest?.('.product-card')||null}
  function skuFromCard(target){return cardFrom(target)?.querySelector?.('.sku')?.textContent?.trim()||null}
  function sizeFromCard(target){return cardFrom(target)?.querySelector?.('.size-select')?.value?.trim()||''}

  function ensureStyles(){if(document.getElementById('w656CustomerStyles'))return;const s=document.createElement('style');s.id='w656CustomerStyles';s.textContent=`
    .w656-account-btn{border:1px solid var(--border,#d9dfdc);background:var(--surface,#fff);color:var(--text,#303638);height:42px;border-radius:999px;padding:0 13px;font-size:11px;font-weight:800;white-space:nowrap}
    .w656-contact{max-width:1500px;margin:24px auto;padding:0 28px}.w656-contact-card{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;padding:20px;border:1px solid var(--border,#d9dfdc);border-radius:14px;background:var(--surface,#fff);box-shadow:var(--shadow,0 8px 24px rgba(44,52,52,.08))}.w656-contact h2{margin:0 0 6px}.w656-contact p{margin:0;color:var(--muted,#6d7474);font-size:13px}.w656-contact-actions{display:flex;gap:9px;flex-wrap:wrap}.w656-contact-actions a{display:inline-flex;text-decoration:none;border-radius:10px;padding:11px 14px;font-weight:800;font-size:12px;background:var(--surface-soft,#eef2ef);color:var(--text,#303638)}
    .w656-modal{position:fixed;inset:0;z-index:9998;background:rgba(25,31,30,.52);display:flex;align-items:center;justify-content:center;padding:18px}.w656-modal-card{width:min(470px,94vw);background:#fff;border-radius:18px;padding:24px;box-shadow:0 25px 70px rgba(0,0,0,.28)}.w656-modal-card h3{margin:0 0 8px;font-size:22px}.w656-modal-card p{margin:0;color:#5f6866;line-height:1.5}.w656-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.w656-modal-actions button{border:0;border-radius:10px;padding:11px 14px;font-weight:800;cursor:pointer}.w656-modal-primary{background:#73877a;color:#fff}.w656-modal-secondary{background:#eef2ef;color:#303638}.w656-modal-link{background:transparent!important;color:#6d7474!important}.w656-modal-benefits{margin:14px 0 0;padding-left:20px;color:#4d5754;font-size:13px;line-height:1.55}.w656-legal-mini{font-size:10px!important;line-height:1.4!important;color:#7b8381!important;margin-top:10px!important}.w656-legal-mini a{color:inherit}
    @media(max-width:720px){.w656-account-btn{max-width:130px;overflow:hidden;text-overflow:ellipsis}.w656-contact-card{grid-template-columns:1fr}.w656-contact{padding:0 14px}}
  `;document.head.appendChild(s)}

  function closePrompt(){document.getElementById('w656AccountPrompt')?.remove();promptOpen=false}
  function goAccount(mode='login',returnTo=''){if(returnTo)localStorage.setItem(PENDING_RETURN_KEY,returnTo);const q=new URLSearchParams();q.set('mode',mode);if(returnTo)q.set('return',returnTo);location.href=`${ACCOUNT_URL}?${q.toString()}`}
  function showAccountPrompt(kind='soft'){
    if(promptOpen)return;promptOpen=true;
    const checkout=kind==='checkout';
    const like=kind==='favorite';
    const wrap=document.createElement('div');wrap.id='w656AccountPrompt';wrap.className='w656-modal';
    const title=checkout?'Antes de finalizar tu compra':like?'Guarda tus favoritos':'Únete a WOMAN 656';
    const text=checkout?'Para realizar el pedido necesitamos que inicies sesión o crees tu cuenta. Así podremos enviarte confirmación, seguimiento y conservar tu historial.':like?'Inicia sesión o crea una cuenta para conservar los productos que te encantan.':'Crea tu cuenta para guardar favoritos, consultar tus pedidos y comprar más rápido.';
    wrap.innerHTML=`<div class="w656-modal-card"><h3>${title}</h3><p>${text}</p><ul class="w656-modal-benefits"><li>Favoritos guardados</li><li>Historial y seguimiento de pedidos</li><li>Compra más rápida</li></ul><div class="w656-modal-actions"><button class="w656-modal-primary" data-action="signup">Crear cuenta</button><button class="w656-modal-secondary" data-action="login">Ingresar</button><button class="w656-modal-link" data-action="close">${checkout?'Seguir comprando':'Ahora no'}</button></div><p class="w656-legal-mini">Al crear una cuenta podrás consultar nuestro <a href="${PRIVACY_URL}">Aviso de Privacidad</a>.</p></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{const action=e.target?.dataset?.action;if(!action){if(e.target===wrap&&!checkout)closePrompt();return}if(action==='close'){if(!checkout)localStorage.setItem(SOFT_PROMPT_KEY,String(Date.now()));closePrompt();return}goAccount(action,checkout?location.pathname+location.search:'')});
  }

  async function refreshCustomerSession(){const c=client();if(!c)return null;const {data:{session}}=await c.auth.getSession();customerSession=session||null;updateAccountButton();return customerSession}
  function injectAccountButton(){const actions=document.querySelector('.header-actions');if(!actions||document.getElementById('customerAccountBtn'))return;const btn=document.createElement('button');btn.type='button';btn.id='customerAccountBtn';btn.className='w656-account-btn';btn.addEventListener('click',()=>goAccount(customerSession?.user?'login':'signup'));actions.insertBefore(btn,actions.firstChild);updateAccountButton()}
  function updateAccountButton(){const btn=document.getElementById('customerAccountBtn');if(!btn)return;if(customerSession?.user){const first=customerSession.user.user_metadata?.first_name||customerSession.user.user_metadata?.given_name||'';btn.textContent=first?`👤 Hola, ${first}`:'👤 Mi cuenta';btn.title='Mi cuenta WOMAN 656'}else{btn.textContent='👤 Ingresar / Registrarse';btn.title='Ingresar o crear cuenta'}}

  function injectStatsButton(){const host=document.getElementById('adminTopActions');if(!host)return;if(!document.getElementById('openStatisticsBtn')){const btn=document.createElement('button');btn.type='button';btn.id='openStatisticsBtn';btn.className='secondary-btn';btn.textContent='📊 Estadísticas';btn.addEventListener('click',async()=>{try{if(typeof requireShopAdmin==='function')await requireShopAdmin();location.href=STATS_URL}catch(err){alert(err?.message||'Inicia sesión como ADMIN.')}});host.appendChild(btn)}if(!document.getElementById('openSupportAdminBtn')){const btn=document.createElement('button');btn.type='button';btn.id='openSupportAdminBtn';btn.className='secondary-btn';btn.textContent='🛠 Soporte cuentas';btn.addEventListener('click',async()=>{try{if(typeof requireShopAdmin==='function')await requireShopAdmin();location.href=SUPPORT_ADMIN_URL}catch(err){alert(err?.message||'Inicia sesión como ADMIN.')}});host.appendChild(btn)}}

  function injectContact(){if(document.getElementById('contacto'))return;const footer=document.querySelector('.site-footer');if(!footer)return;const section=document.createElement('section');section.id='contacto';section.className='w656-contact';section.innerHTML=`<div class="w656-contact-card"><div><h2>Contacto</h2><p>¿Tienes dudas sobre una prenda, talla, pedido o entrega? Escríbenos.</p></div><div class="w656-contact-actions"><a href="https://wa.me/${CONTACT_WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></div></div>`;footer.parentNode.insertBefore(section,footer);const nav=footer.querySelector('nav');if(nav){const privacy=nav.querySelector('#privacyLink');if(privacy){privacy.href=PRIVACY_URL;privacy.id='';privacy.textContent='Aviso de Privacidad'}if(![...nav.querySelectorAll('a')].some(a=>a.getAttribute('href')==='#contacto')){const a=document.createElement('a');a.href='#contacto';a.textContent='Contacto';nav.appendChild(a)}}}

  function enhanceNewsletter(){const form=document.getElementById('newsletterForm');if(!form||document.getElementById('newsletterAdult'))return;const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;align-items:flex-start;font-size:11px;line-height:1.35;margin-top:8px';label.innerHTML=`<input id="newsletterAdult" type="checkbox" required style="margin-top:2px"><span>Confirmo que tengo 18 años o más y acepto recibir promociones y ofertas. Consulta el <a href="${PRIVACY_URL}">Aviso de Privacidad</a>.</span>`;form.appendChild(label);form.addEventListener('submit',async()=>{const email=document.getElementById('newsletterEmail')?.value?.trim();const adult=document.getElementById('newsletterAdult')?.checked===true;if(!email||!adult)return;const c=client();if(!c)return;const {error}=await c.rpc('subscribe_marketing',{p_email:email,p_adult_confirmed:true,p_source:'newsletter'});const status=document.getElementById('newsletterStatus');if(status)status.textContent=error?`No se pudo guardar: ${error.message}`:'✓ Preferencia guardada.'},true)}

  async function syncExistingFavorites(){const c=client();if(!c||!customerSession?.user)return;const local=new Set(JSON.parse(localStorage.getItem('woman656_favorites')||'[]').map(String));for(const sku of local){await c.rpc('toggle_product_like',{p_product_sku:sku,p_like:true}).catch(()=>{})}}

  function maybeSoftPrompt(){if(customerSession?.user||promptOpen)return;const last=Number(localStorage.getItem(SOFT_PROMPT_KEY)||0);if(last&&Date.now()-last<7*24*60*60*1000)return;showAccountPrompt('soft')}

  document.addEventListener('change',event=>{const target=event.target;if(target?.matches?.('.size-select')){const sku=skuFromCard(target);const size=target.value?.trim()||'';if(sku&&size)record('size_select',sku,{source:'catalog',size})}},true);

  document.addEventListener('click',event=>{
    const target=event.target;
    if(target?.matches?.('.product-image,.product-name')){const sku=skuFromCard(target);if(sku){const size=sizeFromCard(target);record('product_view',sku,{source:'catalog',size:size||null});productViewsThisSession++;if(productViewsThisSession>=3)setTimeout(maybeSoftPrompt,250)}}
    if(target?.matches?.('.add-btn')){const sku=skuFromCard(target);const size=sizeFromCard(target);if(sku&&size)record('add_to_cart',sku,{source:'catalog',size})}
    if(target?.matches?.('.favorite-btn')&&!customerSession?.user){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showAccountPrompt('favorite');return}
    if(target?.matches?.('.favorite-btn')&&customerSession?.user){const sku=skuFromCard(target);if(!sku)return;setTimeout(async()=>{const c=client();if(!c)return;const liked=JSON.parse(localStorage.getItem('woman656_favorites')||'[]').map(String).includes(String(sku));await c.rpc('toggle_product_like',{p_product_sku:sku,p_like:liked}).catch(()=>{})},25)}
    if(target?.id==='whatsappBtn'&&!customerSession?.user){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();record('begin_checkout',null,{channel:'whatsapp',blocked_for_auth:true});showAccountPrompt('checkout');return}
    if(target?.id==='whatsappBtn'&&customerSession?.user)record('begin_checkout',null,{channel:'whatsapp'})
  },true);

  async function start(){ensureStyles();injectAccountButton();injectStatsButton();injectContact();enhanceNewsletter();await refreshCustomerSession();await record('store_visit',null,{path:location.pathname});await syncExistingFavorites();setTimeout(maybeSoftPrompt,30000);const c=client();if(c)c.auth.onAuthStateChange((_event,session)=>{customerSession=session||null;updateAccountButton();setTimeout(()=>{record('store_visit',null,{path:location.pathname});syncExistingFavorites()},50)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
