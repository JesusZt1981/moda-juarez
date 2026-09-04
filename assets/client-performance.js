/* WOMAN 656 · rendimiento y resiliencia de imágenes para clientes */
(() => {
  'use strict';

  function tuneProductImages(scope=document){
    const images=[...scope.querySelectorAll?.('.product-image')||[]];
    images.forEach((img,index)=>{
      img.decoding='async';
      if(!img.hasAttribute('loading')) img.loading=index<2?'eager':'lazy';
      if(!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority',index<2?'high':'low');
    });
  }

  function retrySeparator(url){
    return url.includes('?')?'&':'?';
  }

  /* Un fallo transitorio de red/CDN no debe dejar una tarjeta rota de inmediato.
     Se reintenta una sola vez y, si vuelve a fallar, actúa el fallback existente. */
  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement)) return;
    if(!img.classList.contains('product-image')) return;
    if(img.dataset.w656Retried==='1') return;
    if(!navigator.onLine || !img.currentSrc && !img.src) return;

    const original=img.currentSrc||img.src;
    img.dataset.w656Retried='1';
    event.stopImmediatePropagation();

    window.setTimeout(()=>{
      const clean=original.replace(/([?&])w656_retry=\d+(&?)/,'$1').replace(/[?&]$/,'');
      img.src=`${clean}${retrySeparator(clean)}w656_retry=${Date.now()}`;
    },350);
  },true);

  function start(){
    tuneProductImages(document);
    const grid=document.getElementById('productGrid');
    if(grid && 'MutationObserver' in window){
      const observer=new MutationObserver(records=>{
        for(const record of records){
          for(const node of record.addedNodes){
            if(node.nodeType===1) tuneProductImages(node.matches?.('.product-image')?node.parentElement:node);
          }
        }
      });
      observer.observe(grid,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
