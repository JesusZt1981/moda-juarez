(() => {
  const originalCalc=typeof calc==='function'?calc:null;
  if(!originalCalc)return;

  const round2=n=>Math.round((Number(n)||0)*100)/100;
  const num=v=>Number(v)||0;
  const byId=id=>document.getElementById(id);
  let activeInvoiceId=null;
  let draftTotals=null;

  calc=function(i){
    const base=originalCalc(i);
    const promotion=num(i.promotion_allocated);
    const real=base.real-promotion;
    const rounding=Number(i.rounding||settings.price_rounding)||1;
    const suggested=Math.ceil((real*(1+(Number(i.margin_percent)||0)/100))/rounding)*rounding;
    return {...base,real,suggested,promotion};
  };

  const originalPayload=typeof accountingPayload==='function'?accountingPayload:null;
  if(originalPayload){
    accountingPayload=function(item){
      return {...originalPayload(item),promotion_allocated:num(item.promotion_allocated)};
    };
  }

  function currentInvoice(){
    const ids=[...new Set(items.map(i=>i.invoice_id).filter(Boolean))];
    if(ids.length===1)activeInvoiceId=ids[0];
    if(!activeInvoiceId)return null;
    return invoices.find(x=>String(x.id)===String(activeInvoiceId))||null;
  }

  function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(num(n))}

  function ensureUi(){
    const pricing=document.querySelector('.pricing-global-bar');
    if(!pricing||byId('orderCostAllocation'))return;
    const box=document.createElement('div');
    box.id='orderCostAllocation';
    box.className='order-cost-box';
    box.innerHTML=`
      <div class="order-cost-head"><div><strong>Resumen del pedido</strong><span>Captura los totales del comprobante. Envío, promoción, importación y otros gastos se reparten proporcionalmente entre las prendas.</span></div><button id="allocateOrderCostsBtn" type="button">Repartir y guardar</button></div>
      <div class="order-cost-grid">
        <label>Productos<input id="orderProductsTotal" type="number" min="0" step=".01"></label>
        <label>Envío<input id="orderShippingTotal" type="number" min="0" step=".01"></label>
        <label>Promoción<input id="orderPromotionTotal" type="number" min="0" step=".01"></label>
        <label>Importación<input id="orderDutiesTotal" type="number" min="0" step=".01"></label>
        <label>Otros gastos<input id="orderOtherTotal" type="number" min="0" step=".01"></label>
        <label>Total factura<input id="orderGrandTotal" type="number" min="0" step=".01"></label>
      </div>
      <div class="order-cost-check" id="orderCostCheck"></div>
      <div class="order-cost-note">El reparto usa el valor de cada partida como peso. Dos prendas con el mismo costo reciben la misma proporción. La promoción se resta del costo; envío, importación y otros se suman.</div>`;
    pricing.parentElement.insertBefore(box,pricing);

    const style=document.createElement('style');
    style.textContent=`
      .order-cost-box{margin:16px 0;padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:#121217}.order-cost-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.order-cost-head strong{display:block;font-size:15px}.order-cost-head span{display:block;margin-top:3px;color:var(--muted);font-size:12px;line-height:1.4}.order-cost-head button{white-space:nowrap;background:var(--pink);color:#171217;font-weight:800}.order-cost-grid{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:9px}.order-cost-grid label{display:grid;gap:5px;color:var(--muted);font-size:11px;font-weight:700}.order-cost-grid input{width:100%;padding:9px 8px}.order-cost-check{margin-top:10px;font-size:12px;font-weight:800}.order-cost-note{margin-top:6px;color:var(--muted);font-size:11px}.allocation-ok{color:#8ee0a7}.allocation-warn{color:#ffca7a}.accounting-items-table .col-promo{width:90px}.accounting-items-table{min-width:1020px!important}@media(max-width:900px){.order-cost-grid{grid-template-columns:repeat(2,minmax(120px,1fr))}.order-cost-head{align-items:flex-start;flex-direction:column}.order-cost-head button{width:100%}}
    `;
    document.head.appendChild(style);

    ['orderProductsTotal','orderShippingTotal','orderPromotionTotal','orderDutiesTotal','orderOtherTotal','orderGrandTotal'].forEach(id=>byId(id)?.addEventListener('input',previewTotals));
    byId('allocateOrderCostsBtn').addEventListener('click',allocateAndSave);
  }

  function loadInvoiceTotals(){
    ensureUi();
    const invoice=currentInvoice();
    const box=byId('orderCostAllocation');
    if(!box)return;
    if(!invoice){
      box.querySelector('.order-cost-head span').textContent='Selecciona una factura en “Facturas guardadas” para editar y repartir sus costos.';
      box.querySelectorAll('input,button').forEach(el=>el.disabled=true);
      return;
    }
    box.querySelectorAll('input,button').forEach(el=>el.disabled=false);
    draftTotals={
      subtotal:num(invoice.subtotal),shipping:num(invoice.shipping_total),promotion:num(invoice.promotion_total),duties:num(invoice.duties_total),other:num(invoice.other_total),grand:num(invoice.grand_total)
    };
    byId('orderProductsTotal').value=draftTotals.subtotal.toFixed(2);
    byId('orderShippingTotal').value=draftTotals.shipping.toFixed(2);
    byId('orderPromotionTotal').value=draftTotals.promotion.toFixed(2);
    byId('orderDutiesTotal').value=draftTotals.duties.toFixed(2);
    byId('orderOtherTotal').value=draftTotals.other.toFixed(2);
    byId('orderGrandTotal').value=draftTotals.grand.toFixed(2);
    previewTotals();
  }

  function readTotals(){return{
    subtotal:num(byId('orderProductsTotal')?.value),shipping:num(byId('orderShippingTotal')?.value),promotion:num(byId('orderPromotionTotal')?.value),duties:num(byId('orderDutiesTotal')?.value),other:num(byId('orderOtherTotal')?.value),grand:num(byId('orderGrandTotal')?.value)
  }}

  function previewTotals(){
    const t=readTotals();
    const calculated=round2(t.subtotal+t.shipping-t.promotion+t.duties+t.other);
    const diff=round2(t.grand-calculated);
    const lineBase=round2(items.reduce((s,i)=>s+num(i.unit_cost)*num(i.quantity),0));
    const parts=[`Calculado: ${money(calculated)}`,`Factura: ${money(t.grand)}`];
    if(Math.abs(diff)<.01)parts.push('✅ Cuadra');else parts.push(`⚠️ Diferencia ${money(diff)}`);
    if(Math.abs(lineBase-t.subtotal)>=.01)parts.push(`· Suma de partidas: ${money(lineBase)} (diferencia vs Productos: ${money(round2(lineBase-t.subtotal))})`);
    const el=byId('orderCostCheck');if(el){el.textContent=parts.join(' · ');el.className=`order-cost-check ${Math.abs(diff)<.01?'allocation-ok':'allocation-warn'}`}
  }

  function allocations(total,rows){
    const weights=rows.map(i=>Math.max(0,num(i.unit_cost)*Math.max(1,num(i.quantity))));
    const sum=weights.reduce((a,b)=>a+b,0);
    if(!sum)return rows.map(()=>0);
    const target=Math.round(num(total)*100);
    const raw=weights.map(w=>target*w/sum);
    const cents=raw.map(Math.floor);
    let remaining=target-cents.reduce((a,b)=>a+b,0);
    const order=raw.map((v,idx)=>({idx,frac:v-Math.floor(v)})).sort((a,b)=>b.frac-a.frac);
    for(let k=0;k<remaining;k++)cents[order[k%order.length].idx]++;
    return cents.map((c,idx)=>round2((c/100)/Math.max(1,num(rows[idx].quantity))));
  }

  async function allocateAndSave(){
    const invoice=currentInvoice();if(!invoice)return alert('Selecciona primero una factura.');
    const rows=items.filter(i=>String(i.invoice_id)===String(invoice.id));
    if(!rows.length)return alert('Esta factura no tiene partidas visibles.');
    const t=readTotals();
    const calculated=round2(t.subtotal+t.shipping-t.promotion+t.duties+t.other);
    if(Math.abs(calculated-t.grand)>=.01&&!confirm(`El total calculado (${money(calculated)}) no coincide con la factura (${money(t.grand)}).\n\n¿Guardar y repartir de todos modos?`))return;
    const btn=byId('allocateOrderCostsBtn');btn.disabled=true;btn.textContent='Guardando…';
    try{
      const invoiceUpdate=await db.from('purchase_invoices').update({subtotal:t.subtotal,shipping_total:t.shipping,promotion_total:t.promotion,duties_total:t.duties,other_total:t.other,grand_total:t.grand}).eq('id',invoice.id);
      if(invoiceUpdate.error)throw invoiceUpdate.error;
      const shipping=allocations(t.shipping,rows),duties=allocations(t.duties,rows),promotion=allocations(t.promotion,rows),other=allocations(t.other,rows);
      for(let idx=0;idx<rows.length;idx++){
        const item=rows[idx];
        const patch={shipping_allocated:shipping[idx],duties_allocated:duties[idx],promotion_allocated:promotion[idx],other_allocated:other[idx]};
        const c=calc({...item,...patch});
        patch.real_unit_cost=round2(c.real);patch.suggested_price=c.suggested;
        if(!num(item.final_price))patch.final_price=c.suggested;
        const q=await db.from('purchase_items').update(patch).eq('id',item.id);
        if(q.error)throw q.error;
        Object.assign(item,patch);
      }
      Object.assign(invoice,{subtotal:t.subtotal,shipping_total:t.shipping,promotion_total:t.promotion,duties_total:t.duties,other_total:t.other,grand_total:t.grand});
      alert(`✅ Costos repartidos y guardados.\n\nEnvío: ${money(t.shipping)}\nPromoción: -${money(t.promotion)}\nImportación: ${money(t.duties)}\nOtros: ${money(t.other)}\n\nLos costos reales y precios sugeridos fueron recalculados.`);
      render();loadInvoiceTotals();
    }catch(error){console.error(error);alert(`❌ No se pudo completar el reparto.\n\n${error.message||error}`)}
    finally{btn.disabled=false;btn.textContent='Repartir y guardar'}
  }

  function enhanceTable(){
    const head=document.querySelector('.accounting-items-table thead tr');
    if(head)head.innerHTML='<th class="col-sku">SKU</th><th class="col-size">Talla</th><th class="col-qty">Cant.</th><th class="col-money">Costo</th><th class="col-promo">Promo</th><th class="col-money">C/envío</th><th class="col-money">C/impo</th><th class="col-money">Otros/u.</th><th class="col-total">Costo total</th><th class="col-suggested">P/sugerido</th><th class="col-price">Precio</th>';
  }

  const previousItemRow=typeof itemRow==='function'?itemRow:null;
  if(previousItemRow){
    itemRow=function(i){
      const c=calc(i);
      const sku=String(i?.sku||'').trim();
      let skuHtml='<span class="accounting-product-unlinked">Sin SKU</span>';
      if(sku){
        const params=new URLSearchParams({admin:'1',product:sku,purchase_cost:String(num(i.unit_cost))});if(i.shop_product_id)params.set('product_id',String(i.shop_product_id));
        skuHtml=`<a class="accounting-product-link" href="index.html?${params.toString()}" target="_blank" rel="noopener"><span>${esc(sku)}</span><span class="accounting-product-link-icon">↗</span></a>`;
      }
      return `<tr data-id="${i.id}"><td class="col-sku">${skuHtml}</td><td class="col-size"><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td><td class="col-qty"><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td><td class="col-money"><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td><td class="col-promo"><input data-k="promotion_allocated" type="number" min="0" step=".01" value="${num(i.promotion_allocated)}"></td><td class="col-money"><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${num(i.shipping_allocated)}"></td><td class="col-money"><input data-k="duties_allocated" type="number" min="0" step=".01" value="${num(i.duties_allocated)}"></td><td class="col-money"><input data-k="other_allocated" type="number" min="0" step=".01" value="${num(i.other_allocated)}"></td><td class="col-total">${money(c.real)}</td><td class="col-suggested">${money(c.suggested)}</td><td class="col-price"><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"></td></tr>`;
    };
  }

  const previousRender=typeof render==='function'?render:null;
  if(previousRender){render=function(){previousRender();enhanceTable();ensureUi();loadInvoiceTotals()}}

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-invoice]'))setTimeout(()=>{const ids=[...new Set(items.map(i=>i.invoice_id).filter(Boolean))];if(ids.length===1)activeInvoiceId=ids[0];loadInvoiceTotals()},80);
  });

  function start(){enhanceTable();ensureUi();loadInvoiceTotals();try{render()}catch(error){console.warn('WOMAN 656 reparto pedido:',error)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();