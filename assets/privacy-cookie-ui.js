/* WOMAN 656 · enlace de privacidad y consentimiento de analítica publicitaria */
(() => {
  'use strict';

  const META_CONSENT_KEY='woman656_meta_consent';

  function injectStyles(){
    if(document.getElementById('w656CookiePrivacyStyles'))return;
    const style=document.createElement('style');
    style.id='w656CookiePrivacyStyles';
    style.textContent=`
      #cookieBanner.cookie-banner p{flex:1 1 auto!important;min-width:0!important}
      #w656CookiePrivacy{
        flex:0 0 auto;
        color:#5f6864;
        font-size:10.5px;
        font-weight:700;
        text-decoration:none;
        white-space:nowrap;
        padding:6px 2px;
      }
      #w656CookiePrivacy:hover,#w656CookiePrivacy:focus{text-decoration:underline;color:#2f3532}
      @media(max-width:420px){
        #w656CookiePrivacy{font-size:9.5px;padding:5px 0}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceCookieBanner(){
    const banner=document.getElementById('cookieBanner');
    if(!banner)return false;

    const text=banner.querySelector('p');
    if(text){
      text.textContent='Usamos almacenamiento local y Meta Pixel para medir visitas, productos vistos, carrito y compras, y mejorar nuestros anuncios. Consulta nuestro aviso de privacidad.';
    }

    const accept=document.getElementById('cookieAccept');
    if(accept && accept.dataset.w656MetaConsentBound!=='1'){
      accept.dataset.w656MetaConsentBound='1';
      accept.textContent='Aceptar';
      accept.addEventListener('click',()=>{
        try{localStorage.setItem(META_CONSENT_KEY,'granted');}catch(_){}
      },true);
    }

    if(!document.getElementById('w656CookiePrivacy')){
      const link=document.createElement('a');
      link.id='w656CookiePrivacy';
      link.href='privacidad.html';
      link.textContent='Privacidad';
      link.setAttribute('aria-label','Ver aviso de privacidad de WOMAN 656');
      banner.appendChild(link);
    }
    return true;
  }

  function start(){
    injectStyles();
    if(enhanceCookieBanner())return;
    if(!('MutationObserver' in window))return;
    const observer=new MutationObserver(()=>{
      if(enhanceCookieBanner())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
