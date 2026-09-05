(() => {
  const params=new URLSearchParams(location.search);
  const requestedSku=String(params.get('product')||'').trim();
  const requestedProductIdRaw=params.get('product_id');
  const requestedProductId=requestedProductIdRaw!==null?Number(requestedProductIdRaw):null;
  if(!requestedSku && !Number.isFinite(requestedProductId))return;

  const purchaseCostRaw=params.get('purchase_cost');
  const purchaseCost=purchaseCostRaw!==null?Number(purchaseCostRaw):null;
  const normalize=value=>String(value||'').trim().toLowerCase();
  const html=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const targetSku=normalize(requestedSku);
  let attempts=0;

  function money(value){
    return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value)||0);
  }

  function clearProductQuery(){
    try{
      const clean=new URL(location.href);
      clean.searchParams.delete('product');
      clean.searchParams.delete('product_id');
      clean.searchParams.delete('purchase_cost');
      history.replaceState(history.state,'',clean.pathname+(clean.searchParams.toString()?`?${clean.searchParams.toString()}`:'')+clean.hash);
    }catch(error){
      console.warn('WOMAN 656 · no se pudo limpiar el enlace temporal:',error);
    }
  }

  function ensureStyles(){
    if(document.getElementById('w656AccountingDeepLinkStyles'))return;
    const style=document.createElement('style');
    style.id='w656AccountingDeepLinkStyles';
    style.textContent=`
      .w656-accounting-verify{margin:0 0 16px;padding:13px 15px;border:1px solid #d7b7c5;border-radius:12px;background:#fff5f8;color:#3a2730;box-shadow:0 7px 20px rgba(63,39,50,.08);font-size:12px;line-height:1.45}
      .w656-accounting-verify strong{font-weight:900}.w656-accounting-verify b{font-size:14px}.w656-accounting-verify .w656-verify-note{display:block;margin-top:4px;color:#6d5962}
      .product-card.w656-accounting-target{outline:3px solid #d685a8;outline-offset:3px;box-shadow:0 0 0 7px rgba(214,133,168,.13),var(--shadow-hover)!important}
      @media(max-width:700px){.w656-accounting-verify{margin:0 10px 14px}}
    `;
    document.head.appendChild(style);
  }

  function products(){
    try{return (typeof state!=='undefined'&&Array.isArray(state.products))?state.products:[]}catch(_){return []}
  }

  function productDbId(product){
    const value=product?.dbId ?? product?.id;
    const id=Number(value);
    return Number.isFinite(id)?id:null;
  }

  function findProduct(){
    const list=products();
    if(Number.isFinite(requestedProductId)){
      const byId=list.find(product=>productDbId(product)===requestedProductId);
      if(byId)return byId;
    }
    if(!targetSku)return null;
    return list.find(product=>normalize(product?.sku)===targetSku)||null;
  }

  function showNotice(product){
    ensureStyles();
    const toolbar=document.querySelector('.catalog-toolbar');
    const host=toolbar?.parentElement||document.querySelector('.catalog-section');
    if(!host)return;
    let notice=document.getElementById('w656AccountingVerify');
    if(!notice){notice=document.createElement('div');notice.id='w656AccountingVerify';notice.className='w656-accounting-verify';host.insertBefore(notice,toolbar||host.firstChild)}
    const safeSku=html(requestedSku||'Producto vinculado');
    if(product){
      const currentSku=String(product.sku||'').trim();
      const skuChanged=requestedSku && normalize(currentSku)!==targetSku;
      const cost=Number.isFinite(purchaseCost)?` · Costo de compra registrado: <b>${money(purchaseCost)}</b>`:'';
      const linkage=skuChanged?` · SKU actual en tienda: <b>${html(currentSku)}</b>`:'';
      notice.innerHTML=`<strong>Validación desde Contabilidad</strong> · ${safeSku}${linkage}${cost} · Precio actual en tienda: <b>${money(product.price)}</b><span class="w656-verify-note">${skuChanged?'La partida estaba vinculada a este producto por su ID; por eso se abrió el producto correcto aunque el SKU haya cambiado. ':''}Verifica que sea la misma prenda. Si algo no corresponde, usa <b>Editar producto</b> en esta tarjeta.</span>`;
    }else{
      notice.innerHTML=`<strong>No se encontró ${safeSku} en la tienda.</strong><span class="w656-verify-note">Ese producto ya no existe o cambió. Al recargar, el catálogo volverá a mostrarse sin este filtro.</span>`;
    }
  }

  function reveal(product){
    const resolvedSku=String(product?.sku||requestedSku||'').trim();
    const search=document.getElementById('searchInput');
    if(search)search.value=product?resolvedSku:'';
    try{if(typeof applyFilters==='function')applyFilters()}catch(error){console.warn('WOMAN 656 deeplink:',error)}

    window.setTimeout(()=>{
      const resolvedTarget=normalize(resolvedSku);
      const cards=[...document.querySelectorAll('.product-card')];
      const card=product?cards.find(node=>normalize(node.querySelector('.sku')?.textContent)===resolvedTarget):null;
      if(card){
        card.classList.add('w656-accounting-target');
        card.scrollIntoView({behavior:'smooth',block:'center'});
        const edit=card.querySelector('.admin-edit-btn');
        if(edit)edit.focus({preventScroll:true});
      }else{
        document.querySelector('.catalog-section')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      showNotice(product);
      clearProductQuery();
    },120);
  }

  function tryOpen(){
    attempts++;
    const product=findProduct();
    const ready=products().length>0 && typeof applyFilters==='function';
    if(ready){reveal(product);return}
    if(attempts<80){window.setTimeout(tryOpen,125);return}
    const search=document.getElementById('searchInput');
    if(search)search.value='';
    try{if(typeof applyFilters==='function')applyFilters()}catch(_){ }
    showNotice(product);
    clearProductQuery();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryOpen,{once:true});else tryOpen();
})();