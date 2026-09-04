(() => {
  let installed=false;
  let attempts=0;

  function install(){
    if(installed)return;
    attempts++;

    const allocationReady=!!document.getElementById('orderCostAllocation');
    if(!allocationReady){
      if(attempts<100)setTimeout(install,50);
      return;
    }
    if(typeof itemRow!=='function'||typeof render!=='function')return;

    installed=true;
    const num=v=>Number(v)||0;

    function productHref(item){
      const sku=String(item?.sku||'').trim();
      if(!sku)return '';
      const params=new URLSearchParams({admin:'1',product:sku,purchase_cost:String(num(item?.unit_cost))});
      if(item?.shop_product_id)params.set('product_id',String(item.shop_product_id));
      return `index.html?${params.toString()}`;
    }

    function skuEditor(item){
      const sku=String(item?.sku||'').trim();
      const href=productHref(item);
      return `<div class="accounting-sku-edit-wrap">
        <input class="accounting-sku-input" data-k="sku" placeholder="SKU" value="${esc(sku)}" autocomplete="off" spellcheck="false">
        ${href?`<a class="accounting-product-open" href="${esc(href)}" target="_blank" rel="noopener" title="Abrir ${esc(sku)} en la tienda para verificarlo">↗</a>`:''}
      </div><span class="accounting-sku-hint">Editable · guardar después del cambio</span>`;
    }

    itemRow=function(i){
      const c=calc(i);
      return `<tr data-id="${i.id}">
        <td class="col-sku">${skuEditor(i)}</td>
        <td class="col-size"><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td>
        <td class="col-qty"><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td>
        <td class="col-money"><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td>
        <td class="col-promo"><input data-k="promotion_allocated" type="number" min="0" step=".01" value="${num(i.promotion_allocated)}"></td>
        <td class="col-money"><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${num(i.shipping_allocated)}"></td>
        <td class="col-money"><input data-k="duties_allocated" type="number" min="0" step=".01" value="${num(i.duties_allocated)}"></td>
        <td class="col-money"><input data-k="other_allocated" type="number" min="0" step=".01" value="${num(i.other_allocated)}"></td>
        <td class="col-total">${money(c.real)}</td>
        <td class="col-suggested">${money(c.suggested)}</td>
        <td class="col-price"><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"></td>
        <td class="col-actions"><div class="accounting-row-actions"><button type="button" data-save-item>Guardar</button><button type="button" class="accounting-delete-item" data-delete-item>Eliminar</button></div></td>
      </tr>`;
    };

    const previousRender=render;
    render=function(){
      previousRender();
      const table=document.querySelector('.accounting-items-table');
      const head=table?.querySelector('thead tr');
      if(head&&!head.querySelector('.col-actions'))head.insertAdjacentHTML('beforeend','<th class="col-actions">Acciones</th>');
      const empty=document.querySelector('#itemsBody td[colspan]');
      if(empty&&items.length===0)empty.colSpan=12;
    };

    const body=document.getElementById('itemsBody');
    if(body){
      body.onchange=event=>{
        const row=event.target.closest('tr[data-id]');
        const item=items.find(x=>String(x.id)===String(row?.dataset.id));
        if(!item)return;
        const key=event.target.dataset.k;
        if(!key)return;
        item[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;
        if(key==='sku'||key==='size')return;
        render();
      };
    }

    const style=document.createElement('style');
    style.textContent='.accounting-items-table{min-width:1140px!important}.accounting-items-table .col-actions{width:118px!important}@media(max-width:760px){.accounting-items-table{min-width:1080px!important}}';
    document.head.appendChild(style);

    try{render()}catch(error){console.warn('WOMAN 656 · edición final de contabilidad:',error)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();