/* WOMAN 656 · rendimiento, resiliencia, analítica y UX de cliente */
(() => {
  'use strict';

  const FILTERS_STORAGE_KEY='w656_catalog_filters_collapsed';

  function loadCustomerGlassUi(){
    if(document.querySelector('script[data-w656-glass-ui]'))return;
    const s=document.createElement('script');
    s.src='assets/customer-glass-ui.js?v=1';
    s.async=false;
    s.dataset.w656GlassUi='1';
    document.head.appendChild(s);
  }

  function loadPrivacyCookieUi(){
    if(document.querySelector('script[data-w656-cookie-privacy]'))return;
    const s=document.createElement('script');
    s.src='assets/privacy-cookie-ui.js?v=1';
    s.async=false;
    s.dataset.w656CookiePrivacy='1';
    document.head.appendChild(s);
  }

  function loadQuickViewCart(){
    if(document.querySelector('script[data-w656-quick-cart]'))return;
    const s=document.createElement('script');
    s.src='assets/quick-view-cart.js?v=1';
    s.async=false;
    s.dataset.w656QuickCart='1';
    document.head.appendChild(s);
  }

  function loadCheckoutPayment(){
    if(document.querySelector('script[data-w656-checkout-payment]'))return;
    const s=document.createElement('script');
    s.src='assets/checkout-payment.js?v=2';
    s.async=false;
    s.dataset.w656CheckoutPayment='1';
    document.head.appendChild(s);
  }

  function loadUnifiedAnalytics(){
    if(window.__W656_UNIFIED_ANALYTICS__||document.querySelector('script[data-w656-analytics]'))return;
    const s=document.createElement('script');
    s.src='analytics-unified.js?v=4';
    s.async=false;
    s.dataset.w656Analytics='1';
    document.head.appendChild(s);
  }

  function tuneProductImages(scope=document){
    const images=[...scope.querySelectorAll?.('.product-image')||[]];
    images.forEach((img,index)=>{
      img.decoding='async';
      if(!img.hasAttribute('loading')) img.loading=index<2?'eager':'lazy';
      if(!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority',index<2?'high':'low');
    });
  }

  function retrySeparator(url){return url.includes('?')?'&':'?'}

  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement)) return;
    if(!img.classList.contains('product-image')) return;
    if(img.dataset.w656Retried==='1') return;
    if(!navigator.onLine || (!img.currentSrc && !img.src)) return;
    const original=img.currentSrc||img.src;
    img.dataset.w656Retried='1';
    event.stopImmediatePropagation();
    window.setTimeout(()=>{
      const clean=original.replace(/([?&])w656_retry=\d+(&?)/,'$1').replace(/[?&]$/,'');
      img.src=`${clean}${retrySeparator(clean)}w656_retry=${Date.now()}`;
    },350);
  },true);

  function readFiltersCollapsed(){try{return localStorage.getItem(FILTERS_STORAGE_KEY)==='1'}catch(_){return false}}
  function saveFiltersCollapsed(collapsed){try{localStorage.setItem(FILTERS_STORAGE_KEY,collapsed?'1':'0')}catch(_){}}

  function setupFilterPanelToggle(){
    const shell=document.querySelector('.page-shell');
    const sidebar=shell?.querySelector('.sidebar');
    const catalogSection=shell?.querySelector('.catalog-section');
    if(!shell || !sidebar || !catalogSection) return;
    if(document.getElementById('catalogFilterToggle')) return;
    const button=document.createElement('button');
    button.id='catalogFilterToggle';button.type='button';button.className='catalog-filter-toggle';
    button.setAttribute('aria-controls','catalogFilterSidebar');
    sidebar.id=sidebar.id||'catalogFilterSidebar';
    const applyState=(collapsed,{persist=false}={})=>{
      shell.classList.toggle('filters-collapsed',collapsed);
      button.setAttribute('aria-expanded',String(!collapsed));
      button.innerHTML=collapsed?'<span aria-hidden="true">☰</span> Mostrar filtros':'<span aria-hidden="true">‹</span> Ocultar filtros';
      button.title=collapsed?'Mostrar panel Comprar por':'Ocultar panel Comprar por';
      if(persist) saveFiltersCollapsed(collapsed);
    };
    applyState(readFiltersCollapsed());
    button.addEventListener('click',()=>applyState(!shell.classList.contains('filters-collapsed'),{persist:true}));
    catalogSection.prepend(button);
  }

  function resetCatalogSearchOnReload(){
    let isReload=false;
    try{isReload=performance.getEntriesByType?.('navigation')?.[0]?.type==='reload'}catch(_){}
    if(!isReload)return;
    const search=document.getElementById('searchInput');if(search)search.value='';
    try{
      const clean=new URL(location.href);
      clean.searchParams.delete('product');clean.searchParams.delete('product_id');clean.searchParams.delete('purchase_cost');
      history.replaceState(history.state,'',clean.pathname+(clean.searchParams.toString()?`?${clean.searchParams.toString()}`:'')+clean.hash);
    }catch(_){}
    try{if(typeof window.applyFilters==='function')window.applyFilters();else if(typeof applyFilters==='function')applyFilters()}catch(_){}
  }

  function start(){
    loadCustomerGlassUi();
    loadPrivacyCookieUi();
    loadQuickViewCart();
    loadCheckoutPayment();
    loadUnifiedAnalytics();
    resetCatalogSearchOnReload();
    tuneProductImages(document);
    setupFilterPanelToggle();
    const grid=document.getElementById('productGrid');
    if(grid && 'MutationObserver' in window){
      const observer=new MutationObserver(records=>{
        for(const record of records){for(const node of record.addedNodes){if(node.nodeType===1)tuneProductImages(node.matches?.('.product-image')?node.parentElement:node)}}
      });
      observer.observe(grid,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();