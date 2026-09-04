(() => {
  let installed=false;
  let attempts=0;

  function normalizedSku(value){
    return String(value||'').trim().toLocaleUpperCase('es-MX');
  }

  function resolveShopProduct(item){
    if(!Array.isArray(shopProducts))return null;

    const linkedId=Number(item?.shop_product_id);
    if(Number.isFinite(linkedId) && linkedId>0){
      const linked=shopProducts.find(product=>Number(product?.id)===linkedId);
      if(linked)return linked;
    }

    const wanted=normalizedSku(item?.sku);
    if(!wanted)return null;
    const matches=shopProducts.filter(product=>normalizedSku(product?.sku)===wanted);
    return matches.length===1?matches[0]:null;
  }

  function syncVisibleItemsWithCatalog(){
    if(!Array.isArray(items)||!Array.isArray(shopProducts)||!shopProducts.length)return false;
    let changed=false;

    items.forEach(item=>{
      const product=resolveShopProduct(item);
      if(!product)return;

      const productId=Number(product.id);
      const currentSku=String(product.sku||'').trim();
      const currentItemSku=String(item.sku||'').trim();

      if(Number.isFinite(productId) && productId>0 && Number(item.shop_product_id)!==productId){
        item.shop_product_id=productId;
        changed=true;
      }

      if(currentSku && currentSku!==currentItemSku){
        if(!item.purchase_source_sku)item.purchase_source_sku=currentItemSku;
        item.sku=currentSku;
        changed=true;
      }

      if(product.name && item.description!==product.name){
        item.description=product.name;
        changed=true;
      }

      if(product.category && item.category!==product.category){
        item.category=product.category;
        changed=true;
      }
    });

    return changed;
  }

  function install(){
    if(installed)return;
    attempts++;

    if(typeof render!=='function' || typeof items==='undefined' || typeof shopProducts==='undefined'){
      if(attempts<100)setTimeout(install,50);
      return;
    }

    installed=true;
    const previousRender=render;
    render=function(){
      syncVisibleItemsWithCatalog();
      return previousRender();
    };

    try{render()}catch(error){
      console.warn('WOMAN 656 · sincronización catálogo/contabilidad:',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();