/* WOMAN 656 · aterrizaje de anuncios/catálogos: producto correcto + video primero */
(() => {
  'use strict';
  if(window.__W656_AD_LANDING_GALLERY__)return;
  window.__W656_AD_LANDING_GALLERY__=true;

  const params=new URLSearchParams(location.search);
  const landingSku=String(params.get('product')||params.get('utm_content')||'').trim();
  const redirected=Boolean(landingSku && (params.get('fbclid')||params.get('utm_source')||params.get('utm_campaign')||document.referrer));
  if(!landingSku)return;

  function findProduct(){
    try{
      if(typeof state!=='undefined' && Array.isArray(state.products)){
        return state.products.find(p=>String(p?.sku||'').trim()===landingSku)||null;
      }
    }catch(_){}
    return null;
  }

  function openLandingProduct(){
    const product=findProduct();
    if(!product)return false;
    try{
      if(typeof openQuickView==='function'){
        openQuickView(product);
        return true;
      }
    }catch(_){}
    return false;
  }

  function videoFirst(){
    if(!redirected)return false;
    const modal=document.getElementById('quickView');
    const thumbs=document.getElementById('quickViewThumbs');
    if(!modal||modal.classList.contains('hidden')||!thumbs)return false;
    const buttons=[...thumbs.querySelectorAll('.quick-view-thumb')];
    const videoButton=buttons.find(button=>button.querySelector('video'));
    if(!videoButton)return false;
    if(thumbs.firstElementChild!==videoButton)thumbs.insertBefore(videoButton,thumbs.firstElementChild);
    if(!videoButton.classList.contains('active'))videoButton.click();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(openLandingProduct()){
      clearInterval(timer);
      window.setTimeout(videoFirst,80);
      window.setTimeout(videoFirst,350);
      window.setTimeout(videoFirst,900);
    }else if(attempts>80){
      clearInterval(timer);
    }
  },125);

  if('MutationObserver' in window){
    const observer=new MutationObserver(()=>videoFirst());
    const startObserver=()=>{
      const modal=document.getElementById('quickView');
      if(modal)observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      else window.setTimeout(startObserver,100);
    };
    startObserver();
  }
})();
