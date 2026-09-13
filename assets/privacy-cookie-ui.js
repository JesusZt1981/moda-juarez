/* WOMAN 656 · privacidad, consentimiento opcional y UX no bloqueante */
(() => {
  'use strict';

  const META_CONSENT_KEY='woman656_meta_consent';
  const STORAGE_NOTICE_KEY='woman656_storage_notice';

  function injectStyles(){
    if(document.getElementById('w656CookiePrivacyStyles'))return;
    const style=document.createElement('style');
    style.id='w656CookiePrivacyStyles';
    style.textContent=`
      #cookieBanner.cookie-banner{z-index:230!important;pointer-events:auto}
      #cookieBanner.cookie-banner p{flex:1 1 auto!important;min-width:0!important}
      #w656CookieActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      #w656CookieNecessary{border:1px solid #9aa39f!important;background:#fff!important;color:#3f4844!important}
      #w656CookiePrivacy{flex:0 0 auto;color:#5f6864;font-size:10.5px;font-weight:700;text-decoration:none;white-space:nowrap;padding:6px 2px}
      #w656CookiePrivacy:hover,#w656CookiePrivacy:focus{text-decoration:underline;color:#2f3532}
      @media(max-width:480px){#w656CookieActions{width:100%;justify-content:stretch}#w656CookieActions button{flex:1 1 auto}#w656CookiePrivacy{font-size:9.5px;padding:5px 0}}
    `;
    document.head.appendChild(style);
  }

  function closeBanner(banner){
    try{localStorage.setItem(STORAGE_NOTICE_KEY,'accepted');}catch(_){}
    banner.classList.add('hidden');
  }

  function enhanceCookieBanner(){
    const banner=document.getElementById('cookieBanner');
    if(!banner)return false;

    const text=banner.querySelector('p');
    if(text){
      text.textContent='La tienda funciona completa con almacenamiento necesario. Meta Pixel es opcional y solo se activa si aceptas analítica publicitaria. Puedes seguir viendo imágenes, videos, tallas, carrito y compra sin aceptarla.';
    }

    const accept=document.getElementById('cookieAccept');
    if(accept && accept.dataset.w656MetaConsentBound!=='1'){
      accept.dataset.w656MetaConsentBound='1';
      accept.textContent='Aceptar analítica';
      accept.addEventListener('click',()=>{
        try{localStorage.setItem(META_CONSENT_KEY,'granted');}catch(_){}
        closeBanner(banner);
      },true);
    }

    let actions=document.getElementById('w656CookieActions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='w656CookieActions';
      if(accept){accept.parentNode.insertBefore(actions,accept);actions.appendChild(accept)}
      else banner.appendChild(actions);
    }

    if(!document.getElementById('w656CookieNecessary')){
      const necessary=document.createElement('button');
      necessary.id='w656CookieNecessary';
      necessary.type='button';
      necessary.textContent='Solo necesarias';
      necessary.addEventListener('click',()=>{
        try{localStorage.removeItem(META_CONSENT_KEY);}catch(_){}
        closeBanner(banner);
      });
      actions.insertBefore(necessary,accept||null);
    }

    if(!document.getElementById('w656CookiePrivacy')){
      const link=document.createElement('a');
      link.id='w656CookiePrivacy';
      link.href='privacidad.html';
      link.textContent='Privacidad';
      link.setAttribute('aria-label','Ver aviso de privacidad de WOMAN 656');
      actions.appendChild(link);
    }
    return true;
  }

  function start(){
    injectStyles();
    if(enhanceCookieBanner())return;
    if(!('MutationObserver' in window))return;
    const observer=new MutationObserver(()=>{if(enhanceCookieBanner())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
