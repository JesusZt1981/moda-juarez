(() => {
  const originalCalc=typeof calc==='function'?calc:null;
  if(!originalCalc)return;

  const round2=n=>Math.round((Number(n)||0)*100)/100;
  const num=v=>Number(v)||0;
  const byId=id=>document.getElementById(id);
  let activeInvoiceId=null;

  function invoiceForItem(item){
    return invoices.find(x=>String(x.id)===String(item?.invoice_id))||null;
  }

  function currentInvoice(){
    const ids=[...new Set(items.map(i=>i.invoice_id).filter(Boolean))];
    if(ids.length===1)activeInvoiceId=ids[0];
    if(!activeInvoiceId)return null;
    return invoices.find(x=>String(x.id)===String(activeInvoiceId))||null;
  }

  function invoiceRows(invoice=currentInvoice()){
    if(!invoice)return [];
    return items.filter(i=>String(i.invoice_id)===String(invoice.id));
  }

  function effectiveTaxIncluded(item,invoice=invoiceForItem(item)){
    const selected=currentInvoice();
    const master=byId('orderAmountsIncludeTax');
    if(invoice && selected && String(invoice.id)===String(selected.id) && master){
      return !!master.checked;
    }
    if(invoice)return !!invoice.amounts_include_tax;
    return !!item?.tax_included;
  }

  calc=function(i){
    const promotion=num(i.promotion_allocated);
    const paid=num(i.unit_cost);
    const rate=Math.max(0,num(i.tax_rate))/100;
    const included=effectiveTaxIncluded(i);
    const creditable=!!i.tax_creditable;
    const extras=num(i.shipping_allocated)+num(i.duties_allocated)+num(i.other_allocated);
    let base,tax,real;

    if(included){
      tax=rate>0 ? paid-(paid/(1+rate)) : 0;
      base=paid-tax;
      real=(creditable?base:paid)+extras-promotion;
    }else{
      base=paid;
      tax=paid*rate;
      real=paid+extras+(creditable?0:tax)-promotion;
    }

    const rounding=Number(i.rounding||settings.price_rounding)||1;
    const suggested=Math.ceil((real*(1+(Number(i.margin_percent)||0)/100))/rounding)*rounding;
    return {base,tax,creditableTax:creditable?tax:0,real,suggested,promotion};
  };

  const originalPayload=typeof accountingPayload==='function'?accountingPayload:null;
  if(originalPayload){
    accountingPayload=function(item){
      return {...originalPayload(item),promotion_allocated:num(item.promotion_allocated)};
    };
  }

  function money(n){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(num(n))}

  function readTotals(){
    return {
      subtotal:num(byId('orderProductsTotal')?.value),
      shipping:num(byId('orderShippingTotal')?.value),
      promotion:num(byId('orderPromotionTotal')?.value),
      duties:num(byId('orderDutiesTotal')?.value),
      other:num(byId('orderOtherTotal')?.value),
      grand:num(byId('orderGrandTotal')?.value),
      includeTax:!!byId('orderAmountsIncludeTax')?.checked
    };
  }

  function lineBase(rows){
    return round2(rows.reduce((s,i)=>s+num(i.unit_cost)*Math.max(1,num(i.quantity)),0));
  }

  function lineAllocated(rows,key){
    return round2(rows.reduce((s,i)=>s+num(i[key])*Math.max(1,num(i.quantity)),0));
  }

  function allocationValues(total,rows){
    const quantities=rows.map(i=>Math.max(1,Math.floor(num(i.quantity)||1)));
    const weights=rows.map((i,idx)=>Math.max(0,num(i.unit_cost)*quantities[idx]));
    const sum=weights.reduce((a,b)=>a+b,0);
    if(!sum)return {values:rows.map(()=>0),residualCents:Math.round(num(total)*100)};

    const targetCents=Math.round(num(total)*100);
    const values=weights.map((weight,idx)=>round2(((targetCents/100)*(weight/sum))/quantities[idx]));
    let allocatedCents=Math.round(values.reduce((s,value,idx)=>s+(value*quantities[idx]*100),0));
    let residual=targetCents-allocatedCents;

    if(residual!==0){
      const singleUnit=weights
        .map((weight,idx)=>({idx,weight,qty:quantities[idx]}))
        .filter(x=>x.qty===1)
        .sort((a,b)=>b.weight-a.weight);
      if(singleUnit.length){
        values[singleUnit[0].idx]=round2(values[singleUnit[0].idx]+residual/100);
        residual=0;
      }
    }

    if(residual!==0){
      const candidates=weights
        .map((weight,idx)=>({idx,weight,qty:quantities[idx]}))
        .sort((a,b)=>b.weight-a.weight);
      for(const candidate of candidates){
        if(residual % candidate.qty===0){
          values[candidate.idx]=round2(values[candidate.idx]+(residual/candidate.qty)/100);
          residual=0;
          break;
        }
      }
    }

    allocatedCents=Math.round(values.reduce((s,value,idx)=>s+(value*quantities[idx]*100),0));
    residual=targetCents-allocatedCents;
    return {values,residualCents:residual};
  }

  function expectedAllocations(t,rows){
    return {
      shipping:allocationValues(t.shipping,rows),
      duties:allocationValues(t.duties,rows),
      promotion:allocationValues(t.promotion,rows),
      other:allocationValues(t.other,rows)
    };
  }

  function allocationsAreCurrent(t,rows){
    if(!rows.length)return false;
    const expected=expectedAllocations(t,rows);
    if(Object.values(expected).some(x=>x.residualCents!==0))return false;
    return rows.every((item,idx)=>
      Math.abs(num(item.shipping_allocated)-expected.shipping.values[idx])<0.005 &&
      Math.abs(num(item.duties_allocated)-expected.duties.values[idx])<0.005 &&
      Math.abs(num(item.promotion_allocated)-expected.promotion.values[idx])<0.005 &&
      Math.abs(num(item.other_allocated)-expected.other.values[idx])<0.005
    );
  }

  function syncTaxControls(){
    const invoice=currentInvoice();
    const master=byId('orderAmountsIncludeTax');
    const globalIncluded=byId('globalTaxIncluded');
    if(!globalIncluded)return;

    if(invoice && master){
      globalIncluded.checked=!!master.checked;
      globalIncluded.disabled=true;
      globalIncluded.title='Controlado por el checkbox de IVA del Resumen del pedido.';
      const label=globalIncluded.closest('label');
      if(label)label.title=globalIncluded.title;
    }else{
      globalIncluded.disabled=false;
      globalIncluded.title='';
    }
  }

  function previewTotals(){
    const t=readTotals();
    const calculated=round2(t.subtotal+t.shipping-t.promotion+t.duties+t.other);
    const invoice=currentInvoice();
    const rows=invoiceRows(invoice);
    const base=lineBase(rows);
    const invoiceDiff=round2(t.grand-calculated);
    const productDiff=round2(base-t.subtotal);
    const totalsOk=Math.abs(invoiceDiff)<.01;
    const productsOk=Math.abs(productDiff)<.01;
    const allocationOk=productsOk && allocationsAreCurrent(t,rows);

    const parts=[`Calculado: ${money(calculated)}`,`Factura: ${money(t.grand)}`];
    parts.push(totalsOk?'✅ Total de factura cuadra':`⚠️ Total no cuadra (${money(invoiceDiff)})`);
    parts.push(productsOk?`✅ Partidas: ${money(base)}`:`⛔ Partidas: ${money(base)} · diferencia vs Productos: ${money(productDiff)}`);
    if(productsOk)parts.push(allocationOk?'✅ Reparto actualizado':'⚠️ REPARTO DESACTUALIZADO · pulsa “Repartir y guardar”');
    parts.push(t.includeTax?'IVA incluido: no se suma otro IVA':'IVA no incluido: el cálculo considera el IVA según la tasa y si es acreditable');

    const el=byId('orderCostCheck');
    if(el){
      el.textContent=parts.join(' · ');
      el.className=`order-cost-check ${totalsOk&&productsOk&&allocationOk?'allocation-ok':'allocation-warn'}`;
    }

    const btn=byId('allocateOrderCostsBtn');
    if(btn){
      btn.disabled=!totalsOk||!productsOk;
      btn.title=!productsOk?'Las partidas deben sumar exactamente el total de Productos antes de repartir.':(!totalsOk?'El total calculado debe coincidir con el total de la factura.':'');
    }
    syncTaxControls();
  }

  function ensureUi(){
    const pricing=document.querySelector('.pricing-global-bar');
    if(!pricing||byId('orderCostAllocation'))return;
    const box=document.createElement('div');
    box.id='orderCostAllocation';
    box.className='order-cost-box';
    box.innerHTML=`
      <div class="order-cost-head"><div><strong>Resumen del pedido</strong><span>Envío, promoción, importación y otros gastos se reparten automáticamente según la participación de Costo × Cantidad de cada partida.</span></div><button id="allocateOrderCostsBtn" type="button">Repartir y guardar</button></div>
      <div class="order-cost-grid">
        <label>Productos<input id="orderProductsTotal" type="number" min="0" step=".01"></label>
        <label>Envío<input id="orderShippingTotal" type="number" min="0" step=".01"></label>
        <label>Promoción<input id="orderPromotionTotal" type="number" min="0" step=".01"></label>
        <label>Importación<input id="orderDutiesTotal" type="number" min="0" step=".01"></label>
        <label>Otros gastos<input id="orderOtherTotal" type="number" min="0" step=".01"></label>
        <label>Total factura<input id="orderGrandTotal" type="number" min="0" step=".01"></label>
      </div>
      <label class="order-tax-flag"><input id="orderAmountsIncludeTax" type="checkbox"> Los importes del comprobante ya incluyen IVA; no sumar otro IVA al costo real.</label>
      <div class="order-cost-check" id="orderCostCheck"></div>
      <div class="order-cost-note">El sistema bloquea el reparto si la suma de Costo × Cantidad no coincide con Productos. Con cantidades mayores a 1, el reparto se calcula por participación total de la partida y se guarda como costo unitario, corrigiendo centavos para que los totales cierren.</div>`;
    pricing.parentElement.insertBefore(box,pricing);

    const style=document.createElement('style');
    style.textContent=`
      .order-cost-box{margin:16px 0;padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:#121217}.order-cost-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.order-cost-head strong{display:block;font-size:15px}.order-cost-head span{display:block;margin-top:3px;color:var(--muted);font-size:12px;line-height:1.4}.order-cost-head button{white-space:nowrap;background:var(--pink);color:#171217;font-weight:800}.order-cost-head button:disabled{opacity:.45;cursor:not-allowed}.order-cost-grid{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:9px}.order-cost-grid label{display:grid;gap:5px;color:var(--muted);font-size:11px;font-weight:700}.order-cost-grid input{width:100%;padding:9px 8px}.order-tax-flag{display:flex;align-items:center;gap:7px;margin-top:10px;color:#ddd;font-size:12px}.order-tax-flag input{width:auto}.order-cost-check{margin-top:10px;font-size:12px;font-weight:800;line-height:1.55}.order-cost-note{margin-top:6px;color:var(--muted);font-size:11px}.allocation-ok{color:#8ee0a7}.allocation-warn{color:#ffca7a}.accounting-items-table .col-promo{width:90px}.accounting-items-table{min-width:1020px!important}@media(max-width:900px){.order-cost-grid{grid-template-columns:repeat(2,minmax(120px,1fr))}.order-cost-head{align-items:flex-start;flex-direction:column}.order-cost-head button{width:100%}}
    `;
    document.head.appendChild(style);

    ['orderProductsTotal','orderShippingTotal','orderPromotionTotal','orderDutiesTotal','orderOtherTotal','orderGrandTotal'].forEach(id=>byId(id)?.addEventListener('input',previewTotals));
    byId('orderAmountsIncludeTax')?.addEventListener('change',()=>{
      const invoice=currentInvoice();
      if(invoice){
        invoice.amounts_include_tax=!!byId('orderAmountsIncludeTax').checked;
        invoiceRows(invoice).forEach(item=>{item.tax_included=invoice.amounts_include_tax;});
      }
      syncTaxControls();
      try{render()}catch(_){previewTotals();}
    });
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
      syncTaxControls();
      return;
    }

    box.querySelectorAll('input').forEach(el=>el.disabled=false);
    byId('orderProductsTotal').value=num(invoice.subtotal).toFixed(2);
    byId('orderShippingTotal').value=num(invoice.shipping_total).toFixed(2);
    byId('orderPromotionTotal').value=num(invoice.promotion_total).toFixed(2);
    byId('orderDutiesTotal').value=num(invoice.duties_total).toFixed(2);
    byId('orderOtherTotal').value=num(invoice.other_total).toFixed(2);
    byId('orderGrandTotal').value=num(invoice.grand_total).toFixed(2);
    if(byId('orderAmountsIncludeTax'))byId('orderAmountsIncludeTax').checked=!!invoice.amounts_include_tax;
    previewTotals();
  }

  async function allocateAndSave(){
    const invoice=currentInvoice();
    if(!invoice)return alert('Selecciona primero una factura.');
    const rows=invoiceRows(invoice);
    if(!rows.length)return alert('Esta factura no tiene partidas vinculadas.');

    const t=readTotals();
    const calculated=round2(t.subtotal+t.shipping-t.promotion+t.duties+t.other);
    const base=lineBase(rows);
    if(Math.abs(base-t.subtotal)>=.01){
      return alert(`⛔ No se puede repartir.\n\nProductos de factura: ${money(t.subtotal)}\nSuma de partidas (Costo × Cantidad): ${money(base)}\nDiferencia: ${money(round2(base-t.subtotal))}\n\nCorrige o vincula las partidas faltantes antes de continuar.`);
    }
    if(Math.abs(calculated-t.grand)>=.01){
      return alert(`⛔ No se puede repartir.\n\nTotal calculado: ${money(calculated)}\nTotal factura: ${money(t.grand)}\nDiferencia: ${money(round2(t.grand-calculated))}\n\nCorrige los totales del Resumen del pedido antes de continuar.`);
    }

    const expected=expectedAllocations(t,rows);
    const residuals=Object.entries(expected).filter(([,value])=>value.residualCents!==0);
    if(residuals.length){
      return alert(`⛔ No fue posible cerrar el reparto exactamente a centavos con las cantidades actuales.\n\n${residuals.map(([name,value])=>`${name}: ${value.residualCents} centavo(s)`).join('\n')}\n\nDivide alguna partida de cantidad múltiple en unidades individuales o revisa las cantidades.`);
    }

    const btn=byId('allocateOrderCostsBtn');
    btn.disabled=true;
    btn.textContent='Guardando…';
    try{
      const invoiceUpdate=await db.from('purchase_invoices').update({
        subtotal:t.subtotal,
        shipping_total:t.shipping,
        promotion_total:t.promotion,
        duties_total:t.duties,
        other_total:t.other,
        grand_total:t.grand,
        amounts_include_tax:t.includeTax
      }).eq('id',invoice.id);
      if(invoiceUpdate.error)throw invoiceUpdate.error;
      Object.assign(invoice,{subtotal:t.subtotal,shipping_total:t.shipping,promotion_total:t.promotion,duties_total:t.duties,other_total:t.other,grand_total:t.grand,amounts_include_tax:t.includeTax});

      for(let idx=0;idx<rows.length;idx++){
        const item=rows[idx];
        item.tax_included=t.includeTax;
        const patch={
          tax_included:t.includeTax,
          shipping_allocated:expected.shipping.values[idx],
          duties_allocated:expected.duties.values[idx],
          promotion_allocated:expected.promotion.values[idx],
          other_allocated:expected.other.values[idx]
        };
        const c=calc({...item,...patch});
        patch.real_unit_cost=round2(c.real);
        patch.suggested_price=c.suggested;
        if(!num(item.final_price))patch.final_price=c.suggested;
        const q=await db.from('purchase_items').update(patch).eq('id',item.id);
        if(q.error)throw q.error;
        Object.assign(item,patch);
      }

      const checks={
        shipping:lineAllocated(rows,'shipping_allocated'),
        promotion:lineAllocated(rows,'promotion_allocated'),
        duties:lineAllocated(rows,'duties_allocated'),
        other:lineAllocated(rows,'other_allocated')
      };
      alert(`✅ Costos repartidos y guardados.\n\nProductos: ${money(base)}\nEnvío: ${money(checks.shipping)}\nPromoción: -${money(checks.promotion)}\nImportación: ${money(checks.duties)}\nOtros: ${money(checks.other)}\nIVA incluido: ${t.includeTax?'Sí':'No'}\n\nEl reparto quedó conciliado contra la factura.`);
      render();
    }catch(error){
      console.error(error);
      alert(`❌ No se pudo completar el reparto.\n\n${error.message||error}`);
    }finally{
      btn.textContent='Repartir y guardar';
      previewTotals();
    }
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
        const params=new URLSearchParams({admin:'1',product:sku,purchase_cost:String(num(i.unit_cost))});
        if(i.shop_product_id)params.set('product_id',String(i.shop_product_id));
        skuHtml=`<a class="accounting-product-link" href="index.html?${params.toString()}" target="_blank" rel="noopener"><span>${esc(sku)}</span><span class="accounting-product-link-icon">↗</span></a>`;
      }
      return `<tr data-id="${i.id}"><td class="col-sku">${skuHtml}</td><td class="col-size"><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td><td class="col-qty"><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td><td class="col-money"><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td><td class="col-promo"><input data-k="promotion_allocated" type="number" min="0" step=".01" value="${num(i.promotion_allocated)}"></td><td class="col-money"><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${num(i.shipping_allocated)}"></td><td class="col-money"><input data-k="duties_allocated" type="number" min="0" step=".01" value="${num(i.duties_allocated)}"></td><td class="col-money"><input data-k="other_allocated" type="number" min="0" step=".01" value="${num(i.other_allocated)}"></td><td class="col-total">${money(c.real)}</td><td class="col-suggested">${money(c.suggested)}</td><td class="col-price"><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"></td></tr>`;
    };
  }

  const previousRender=typeof render==='function'?render:null;
  if(previousRender){
    render=function(){
      previousRender();
      enhanceTable();
      ensureUi();
      loadInvoiceTotals();
    };
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-invoice]')){
      setTimeout(()=>{
        const ids=[...new Set(items.map(i=>i.invoice_id).filter(Boolean))];
        if(ids.length===1)activeInvoiceId=ids[0];
        loadInvoiceTotals();
      },80);
    }
  });

  document.addEventListener('input',event=>{
    if(!event.target.closest('#itemsBody'))return;
    if(!['unit_cost','quantity'].includes(event.target.dataset.k))return;
    setTimeout(previewTotals,0);
  },true);

  function start(){
    enhanceTable();
    ensureUi();
    loadInvoiceTotals();
    try{render()}catch(error){console.warn('WOMAN 656 reparto pedido:',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
