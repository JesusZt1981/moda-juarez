/* WOMAN 656 · avisos compactos y translúcidos para clientes */
(() => {
  'use strict';

  const COOKIE_V2_KEY='woman656_cookie_consent_v2';
  const STORAGE_NOTICE_KEY='woman656_storage_notice';
  const META_CONSENT_KEY='woman656_meta_consent';

  function injectStyles(){
    if(document.getElementById('w656GlassUiStyles'))return;
    const style=document.createElement('style');
    style.id='w656GlassUiStyles';
    style.textContent=`
      #cookieBanner.cookie-banner{
        left:50%!important;right:auto!important;bottom:12px!important;
        transform:translateX(-50%)!important;
        width:min(520px,calc(100vw - 24px))!important;max-width:none!important;
        min-height:48px!important;margin:0!important;padding:8px 10px 8px 14px!important;
        display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;
        border:1px solid rgba(255,255,255,.62)!important;border-radius:999px!important;
        background:rgba(255,255,255,.76)!important;
        -webkit-backdrop-filter:blur(15px) saturate(125%)!important;backdrop-filter:blur(15px) saturate(125%)!important;
        box-shadow:0 8px 24px rgba(25,25,25,.12)!important;
      }
      #cookieBanner.cookie-banner.hidden{display:none!important}
      #cookieBanner.cookie-banner p{margin:0!important;color:#3d4341!important;font-size:11.5px!important;line-height:1.25!important;font-weight:600!important}
      #cookieBanner.cookie-banner button{flex:0 0 auto!important;border:0!important;border-radius:999px!important;padding:8px 14px!important;background:#171417!important;color:#fff!important;font-size:11px!important;font-weight:800!important;white-space:nowrap!important;box-shadow:none!important}

      #w656AccountPrompt.w656-modal{
        position:fixed!important;inset:0!important;z-index:9998!important;background:transparent!important;
        -webkit-backdrop-filter:none!important;backdrop-filter:none!important;padding:0!important;
        display:block!important;pointer-events:none!important;
      }
      #w656AccountPrompt .w656-modal-card{
        position:absolute!important;right:16px!important;bottom:78px!important;
        width:min(330px,calc(100vw - 24px))!important;max-height:none!important;overflow:visible!important;
        padding:15px!important;border:1px solid rgba(255,255,255,.62)!important;border-radius:18px!important;
        background:rgba(255,255,255,.80)!important;
        -webkit-backdrop-filter:blur(18px) saturate(125%)!important;backdrop-filter:blur(18px) saturate(125%)!important;
        box-shadow:0 14px 38px rgba(24,22,23,.16)!important;color:#303638!important;
        pointer-events:auto!important;
      }
      #w656AccountPrompt .w656-brand-seal{display:flex;align-items:center;gap:8px;margin-bottom:9px}
      #w656AccountPrompt .w656-brand-seal img{width:36px;height:30px;object-fit:contain;display:block}
      #w656AccountPrompt .w656-brand-seal span{font-size:10px;font-weight:900;letter-spacing:.13em;color:#2f3432}
      #w656AccountPrompt .w656-modal-card h3{margin:0 0 5px!important;font-size:16px!important;line-height:1.2!important}
      #w656AccountPrompt .w656-modal-card>p:not(.w656-legal-mini){margin:0!important;font-size:12px!important;line-height:1.4!important;color:#59615e!important}
      #w656AccountPrompt .w656-modal-benefits{display:none!important}
      #w656AccountPrompt .w656-modal-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;margin-top:11px!important}
      #w656AccountPrompt .w656-modal-actions button{min-height:36px!important;padding:8px 10px!important;border-radius:10px!important;font-size:11px!important;font-weight:800!important}
      #w656AccountPrompt .w656-modal-primary{background:#171417!important;color:#fff!important}
      #w656AccountPrompt .w656-modal-secondary{background:rgba(238,242,239,.86)!important;color:#303638!important;border:1px solid rgba(115,135,122,.16)!important}
      #w656AccountPrompt .w656-modal-link{grid-column:1/-1!important;min-height:auto!important;padding:4px!important;background:transparent!important;color:#727a77!important;font-size:10px!important}
      #w656AccountPrompt .w656-legal-mini{margin:7px 0 0!important;font-size:9px!important;line-height:1.3!important;color:#858c89!important;text-align:center!important}

      @media(max-width:560px){
        #cookieBanner.cookie-banner{bottom:8px!important;width:calc(100vw - 16px)!important;min-height:44px!important;padding:7px 8px 7px 12px!important}
        #cookieBanner.cookie-banner p{font-size:10.5px!important}
        #cookieBanner.cookie-banner button{padding:7px 12px!important;font-size:10.5px!important}
        #w656AccountPrompt .w656-modal-card{right:8px!important;bottom:64px!important;width:calc(100vw - 16px)!important;padding:13px!important;border-radius:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function configureCookieBanner(){
    const banner=document.getElementById('cookieBanner');
    if(!banner)return;
    const text=banner.querySelector('p');
    const button=document.getElementById('cookieAccept')||banner.querySelector('button');
    if(text)text.textContent='Usamos cookies para mejorar tu experiencia.';
    if(button){
      button.textContent='Aceptar';
      if(button.dataset.w656ConsentBound!=='1'){
        button.dataset.w656ConsentBound='1';
        button.addEventListener('click',()=>{
          try{
            localStorage.setItem(COOKIE_V2_KEY,'accepted');
            localStorage.setItem(STORAGE_NOTICE_KEY,'accepted');
            localStorage.setItem(META_CONSENT_KEY,'granted');
          }catch(_){}
        },true);
      }
    }

    /* El aviso actualizado debe mostrarse una vez incluso a quien aceptó la versión antigua. */
    try{
      if(localStorage.getItem(COOKIE_V2_KEY)!=='accepted')banner.classList.remove('hidden');
    }catch(_){}
  }

  function removeSeparateMetaConsent(){
    document.getElementById('w656MetaConsent')?.remove();
  }

  function decorateAccountPrompt(root=document){
    const prompt=root.id==='w656AccountPrompt'?root:root.querySelector?.('#w656AccountPrompt');
    if(!prompt)return;
    const card=prompt.querySelector('.w656-modal-card');
    if(!card)return;

    if(!card.querySelector('.w656-brand-seal')){
      const seal=document.createElement('div');
      seal.className='w656-brand-seal';
      seal.innerHTML='<img src="assets/woman-656-logo.png" alt=""><span>WOMAN 656</span>';
      card.prepend(seal);
    }

    const title=card.querySelector('h3');
    const text=[...card.children].find(el=>el.tagName==='P'&&!el.classList.contains('w656-legal-mini'));
    const normalized=(title?.textContent||'').toLowerCase();
    if(text){
      if(normalized.includes('compra'))text.textContent='Inicia sesión para continuar con tu compra.';
      else if(normalized.includes('favor'))text.textContent='Guarda tus favoritos y encuéntralos después.';
      else text.textContent='Guarda tus favoritos y compra más rápido.';
    }
  }

  function observeUi(){
    if(!('MutationObserver' in window))return;
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.id==='w656MetaConsent')node.remove();
          decorateAccountPrompt(node);
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  function start(){
    injectStyles();
    configureCookieBanner();
    removeSeparateMetaConsent();
    decorateAccountPrompt();
    observeUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
