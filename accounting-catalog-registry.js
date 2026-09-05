(() => {
  let installed=false;
  let attempts=0;
  let linkedIds=new Set();
  let captured=false;

  const normalize=value=>String(value||'').trim().toLocaleUpperCase('es-MX');
  const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value)||0);

  function captureLinks(){
    if(!Array.isArray(items))return;
    linkedIds=new Set(items.map(item=>Number(item?.shop_product_id)).filter(id=>Number.isFinite(id)&&id>0));
    captured=true;
  }

  function pendingProducts(){
    if(!Array.isArray(shopProducts))return [];
    return shopProducts
      .filter(product=>{
        const id=Number(product?.id);
        return Number.isFinite(id)&&id>0&&!linkedIds.has(id);
      })
      .sort((a,b)=>normalize(a?.sku).localeCompare(normalize(b?.sku),'es',{numeric:true,sensitivity:'base'}));
  }

  function ensureUi(){
    const purchases=document.getElementById('purchases');
    if(!purchases)return null;
    let section=document.getElementById('catalogAccountingRegistry');
    if(section)return section;

    section=document.createElement('section');
    section.id='catalogAccountingRegistry';
    section.className='card';
    section.innerHTML='<div class="row"><div><h2>Productos nuevos del catálogo</h2><p class="catalog-registry-note">Todo producto creado desde ADMIN aparece aquí automáticamente aunque todavía no tenga una partida de compra. Así no desaparece del panel de Contabilidad.</p></div><span id="catalogRegistryCount" class="catalog-registry-count"></span></div><div id="catalogRegistryList"></div>';

    const parts=[...purchases.querySelectorAll(':scope > section.card')];
    const itemsCard=parts.find(card=>card.querySelector('#itemsBody'));
    if(itemsCard)purchases.insertBefore(section,itemsCard);else purchases.prepend(section);

    const style=document.createElement('style');
    style.textContent='.catalog-registry-note{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}.catalog-registry-count{padding:6px 10px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:800}.catalog-registry-empty{padding:13px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:12px}.catalog-registry-table{width:100%;border-collapse:collapse;margin-top:10px}.catalog-registry-table th,.catalog-registry-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;font-size:12px}.catalog-registry-table th{color:var(--muted);font-size:11px}.catalog-registry-sku{font-weight:900;white-space:nowrap}.catalog-registry-pending{display:inline-flex;padding:5px 8px;border-radius:999px;background:#3b2f18;color:#ffd78b;font-size:10px;font-weight:900;white-space:nowrap}.catalog-registry-open{color:#fff;font-weight:800;text-decoration:none}@media(max-width:760px){.catalog-registry-table{min-width:650px}}';
    document.head.appendChild(style);
    return section;
  }

  function renderRegistry(){
    ensureUi();
    const count=document.getElementById('catalogRegistryCount');
    const list=document.getElementById('catalogRegistryList');
    if(!count||!list)return;

    if(!captured){
      count.textContent='…';
      list.innerHTML='<div class="catalog-registry-empty">Sincronizando catálogo con las partidas de compra…</div>';
      return;
    }

    const pending=pendingProducts();
    count.textContent=String(pending.length);
    if(!pending.length){
      list.innerHTML='<div class="catalog-registry-empty">✅ Todos los productos del catálogo ya tienen partida de compra vinculada.</div>';
      return;
    }

    list.innerHTML='<div class="tableWrap"><table class="catalog-registry-table"><thead><tr><th>SKU</th><th>Producto</th><th>Categoría</th><th>Precio tienda</th><th>Estado</th><th></th></tr></thead><tbody>'+pending.map(product=>{
      const sku=String(product?.sku||'').trim();
      const href='index.html?'+new URLSearchParams({admin:'1',product:sku,product_id:String(product.id)}).toString();
      return '<tr><td class="catalog-registry-sku">'+esc(sku)+'</td><td>'+esc(product.name||'Producto')+'</td><td>'+esc(product.category||'')+'</td><td>'+money(product.price)+'</td><td><span class="catalog-registry-pending">Sin partida de compra</span></td><td><a class="catalog-registry-open" href="'+esc(href)+'" target="_blank" rel="noopener">Abrir ↗</a></td></tr>';
    }).join('')+'</tbody></table></div>';
  }

  function install(){
    if(installed)return;
    attempts++;
    if(typeof load!=='function'||typeof render!=='function'||typeof items==='undefined'||typeof shopProducts==='undefined'){
      if(attempts<100)setTimeout(install,50);
      return;
    }

    installed=true;
    const previousLoad=load;
    load=async function(){
      const result=await previousLoad();
      captureLinks();
      renderRegistry();
      return result;
    };

    const previousRender=render;
    render=function(){
      const result=previousRender();
      renderRegistry();
      return result;
    };

    setTimeout(()=>{
      if(Array.isArray(shopProducts)&&shopProducts.length&&Array.isArray(items)&&items.length){
        captureLinks();
        renderRegistry();
      }else{
        renderRegistry();
      }
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

(() => {
  if(document.querySelector('script[data-accounting-excel-sync]'))return;
  const script=document.createElement('script');
  script.src='accounting-excel-sync.js';
  script.async=true;
  script.dataset.accountingExcelSync='1';
  script.onerror=()=>console.error('No se pudo cargar accounting-excel-sync.js');
  document.body.appendChild(script);
})();

(() => {
  if(document.querySelector('script[data-accounting-tax-separation]'))return;
  const script=document.createElement('script');
  script.src='accounting-tax-separation.js';
  script.async=true;
  script.dataset.accountingTaxSeparation='1';
  script.onerror=()=>console.error('No se pudo cargar accounting-tax-separation.js');
  document.body.appendChild(script);
})();
