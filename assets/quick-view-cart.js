/* WOMAN 656 · compra desde la vista rápida */
(() => {
  'use strict';

  function currentProduct(){
    try{
      if(typeof quickViewProduct!=='undefined' && quickViewProduct) return quickViewProduct;
    }catch(_){}
    const sku=document.getElementById('quickViewSku')?.textContent?.trim();
    if(!sku)return null;
    try{
      if(typeof products!=='undefined' && Array.isArray(products)) return products.find(p=>String(p?.sku||'').trim()===sku)||null;
    }catch(_){}
    return null;
  }

  function injectStyles(){
    if(document.getElementById('w656QuickViewCartStyles'))return;
    const style=document.createElement('style');
    style.id='w656QuickViewCartStyles';
    style.textContent=`
      #w656QuickViewBuy{width:100%;display:grid;grid-template-columns:1fr;gap:8px;margin-top:2px}
      #w656QuickViewSize{width:100%;min-height:42px;border:1px solid var(--border);border-radius:999px;padding:10px 14px;background:var(--surface);color:var(--text);font:inherit;font-size:12px;font-weight:700;outline:none}
      #w656QuickViewSize:focus{border-color:var(--blue-dark);box-shadow:0 0 0 3px rgba(115,137,155,.12)}
      #w656QuickViewAdd{width:100%;border:0;border-radius:999px;padding:13px 16px;background:var(--blue);color:#26343d;font-weight:900;cursor:pointer}
      #w656QuickViewAdd:hover{background:var(--blue-dark);color:#fff}
      #w656QuickViewAdd:disabled{opacity:.55;cursor:not-allowed}
      #quickViewWhatsApp{margin-top:0!important}
      @media(max-width:560px){#w656QuickViewSize{min-height:38px;padding:8px 12px;font-size:11px}#w656QuickViewAdd{padding:11px 14px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function availableSizes(product){
    const sizes=Array.isArray(product?.sizes)?product.sizes:[];
    return sizes.filter(size=>Number(product?.stock?.[size]||0)>0);
  }

  function refresh(){
    const select=document.getElementById('w656QuickViewSize');
    const button=document.getElementById('w656QuickViewAdd');
    if(!select||!button)return;
    const product=currentProduct();
    const signature=product?`${product.sku}|${JSON.stringify(product.stock||{})}`:'';
    if(select.dataset.signature===signature)return;
    select.dataset.signature=signature;

    const sizes=availableSizes(product);
    select.innerHTML='<option value="">Selecciona talla</option>';
    for(const size of sizes){
      const option=document.createElement('option');
      option.value=String(size);
      option.textContent=`${size} · ${Number(product.stock?.[size]||0)} disponibles`;
      select.appendChild(option);
    }
    button.disabled=!product||sizes.length===0;
    button.textContent=sizes.length?'Agregar al carrito':'Agotado';
  }

  function install(){
    const info=document.querySelector('#quickView .quick-view-info');
    const whatsapp=document.getElementById('quickViewWhatsApp');
    if(!info||!whatsapp)return false;
    injectStyles();

    if(!document.getElementById('w656QuickViewBuy')){
      const box=document.createElement('div');
      box.id='w656QuickViewBuy';
      box.innerHTML='<select id="w656QuickViewSize" aria-label="Selecciona talla"><option value="">Selecciona talla</option></select><button id="w656QuickViewAdd" type="button">Agregar al carrito</button>';
      info.insertBefore(box,whatsapp);

      const button=box.querySelector('#w656QuickViewAdd');
      const select=box.querySelector('#w656QuickViewSize');
      button.addEventListener('click',()=>{
        const product=currentProduct();
        const size=select.value?.trim();
        if(!product)return;
        if(!size){alert('Selecciona una talla.');return;}
        if(Number(product.stock?.[size]||0)<=0){alert('Ese producto está agotado.');refresh();return;}

        let added=false;
        try{
          if(typeof addToCart==='function'){
            addToCart(product,size);
            added=true;
          }else if(typeof window.addToCart==='function'){
            window.addToCart(product,size);
            added=true;
          }
        }catch(err){
          console.warn('WOMAN 656 quick view cart:',err);
        }
        if(!added){alert('No fue posible agregar el producto al carrito.');return;}

        try{window.W656Analytics?.record?.('add_to_cart',product.sku||null,{size,source:'quick_view',value:Number(product.price)||0});}catch(_){}
        button.textContent='Agregado ✓';
        window.setTimeout(()=>{button.textContent='Agregar al carrito';refresh();},900);
      });
    }
    refresh();
    return true;
  }

  function start(){
    if(!install() && 'MutationObserver' in window){
      const waiter=new MutationObserver(()=>{if(install())waiter.disconnect();});
      waiter.observe(document.documentElement,{childList:true,subtree:true});
    }
    if('MutationObserver' in window){
      const modal=document.getElementById('quickView');
      if(modal){
        const watcher=new MutationObserver(refresh);
        watcher.observe(modal,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
      }
    }
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('.product-image,.product-name'))window.setTimeout(refresh,0);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
