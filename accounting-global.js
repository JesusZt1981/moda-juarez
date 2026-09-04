(() => {
  const originalItemRow=typeof itemRow==='function'?itemRow:null;
  const originalRender=typeof render==='function'?render:null;
  const originalLoad=typeof load==='function'?load:null;
  if(!originalItemRow||!originalRender||!originalLoad)return;

  const skuCollator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});

  function globalTax(){return Number(document.getElementById('globalTaxRate')?.value ?? settings.sales_tax_rate ?? 16)}
  function globalMargin(){return Number(document.getElementById('globalMargin')?.value ?? settings.default_margin_percent ?? 50)}
  function globalIncluded(){return !!document.getElementById('globalTaxIncluded')?.checked}
  function globalCreditable(){return !!document.getElementById('globalTaxCreditable')?.checked}

  function productHref(item){
    const sku=String(item?.sku||'').trim();
    if(!sku)return '';
    const params=new URLSearchParams({admin:'1',product:sku});
    const purchaseCost=Number(item?.unit_cost);
    if(Number.isFinite(purchaseCost))params.set('purchase_cost',String(purchaseCost));
    if(item?.shop_product_id)params.set('product_id',String(item.shop_product_id));
    return `index.html?${params.toString()}`;
  }

  function sortItemsBySku(){
    items.sort((a,b)=>{
      const aSku=String(a?.sku||'').trim();
      const bSku=String(b?.sku||'').trim();
      if(!aSku&&!bSku)return 0;
      if(!aSku)return 1;
      if(!bSku)return -1;
      return skuCollator.compare(aSku,bSku);
    });
  }

  function skuCell(item){
    const sku=String(item?.sku||'').trim();
    const href=sku?productHref(item):'';
    return `<div class="accounting-sku-edit-wrap">
      <input class="accounting-sku-input" data-k="sku" placeholder="SKU" value="${esc(sku)}" autocomplete="off" spellcheck="false">
      ${href?`<a class="accounting-product-open" href="${esc(href)}" target="_blank" rel="noopener" title="Abrir ${esc(sku)} en la tienda para verificarlo">↗</a>`:''}
    </div><span class="accounting-sku-hint">Editable · guardar después del cambio</span>`;
  }

  itemRow=function(i){
    const c=calc(i);
    return `<tr data-id="${i.id}">
      <td class="col-sku">${skuCell(i)}</td>
      <td class="col-size"><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td>
      <td class="col-qty"><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td>
      <td class="col-money"><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td>
      <td class="col-money"><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${i.shipping_allocated||0}"></td>
      <td class="col-money"><input data-k="duties_allocated" type="number" min="0" step=".01" value="${i.duties_allocated||0}"></td>
      <td class="col-money"><input data-k="other_allocated" type="number" min="0" step=".01" value="${i.other_allocated||0}"></td>
      <td class="col-total">${money(c.real)}</td>
      <td class="col-suggested">${money(c.suggested)}</td>
      <td class="col-price"><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"></td>
      <td class="col-actions"><div class="accounting-row-actions"><button type="button" data-save-item>Guardar</button><button type="button" class="accounting-delete-item" data-delete-item>Eliminar</button></div></td>
    </tr>`;
  };

  render=function(){
    sortItemsBySku();
    originalRender();
    const table=document.querySelector('#purchases .tableWrap table');
    if(table){
      table.classList.add('accounting-items-table');
      const head=table.querySelector('thead tr');
      if(head&&!head.querySelector('.col-actions'))head.insertAdjacentHTML('beforeend','<th class="col-actions">Acciones</th>');
    }
    const empty=document.querySelector('#itemsBody td[colspan="13"]');
    if(empty)empty.colSpan=11;
    syncGlobalControls();
  };

  load=async function(){
    await originalLoad();
    const {data,error}=await db.from('purchase_items').select('id,tax_included,tax_creditable');
    if(!error&&data){
      const flags=new Map(data.map(row=>[String(row.id),row]));
      items.forEach(item=>{const row=flags.get(String(item.id));if(row){item.tax_included=!!row.tax_included;item.tax_creditable=!!row.tax_creditable}});
    }
    sortItemsBySku();
    render();
  };

  function syncGlobalControls(){
    const tax=document.getElementById('globalTaxRate'),margin=document.getElementById('globalMargin');
    const included=document.getElementById('globalTaxIncluded'),creditable=document.getElementById('globalTaxCreditable');
    if(!tax||!margin)return;
    if(document.activeElement!==tax)tax.value=String(Number(settings.sales_tax_rate ?? items[0]?.tax_rate ?? 16));
    if(document.activeElement!==margin)margin.value=String(Number(settings.default_margin_percent ?? items[0]?.margin_percent ?? 50));
    if(document.activeElement!==included)included.checked=items.length?items.every(i=>!!i.tax_included):false;
    if(document.activeElement!==creditable)creditable.checked=items.length?items.every(i=>!!i.tax_creditable):false;
  }

  function applyGlobalsToMemory({resetPrices=false}={}){
    const tax=globalTax(),margin=globalMargin(),included=globalIncluded(),creditable=globalCreditable();
    settings.sales_tax_rate=tax;settings.default_tax_rate=tax;settings.default_margin_percent=margin;
    items.forEach(i=>{
      i.tax_rate=tax;
      i.margin_percent=margin;
      i.tax_included=included;
      i.tax_creditable=creditable;
      if(resetPrices)i.final_price=calc(i).suggested;
    });
  }

  async function saveGlobalSettings(){
    const payload={sales_tax_rate:globalTax(),default_tax_rate:globalTax(),default_margin_percent:globalMargin()};
    const {data,error}=await db.from('pricing_settings').update(payload).eq('id',1).select().single();
    if(error)throw error;
    settings={...settings,...data};
  }

  function normalizedSku(value){return String(value||'').trim().toLocaleUpperCase('es-MX')}

  function findShopProductForSku(sku){
    const wanted=normalizedSku(sku);
    if(!wanted)return null;
    const matches=shopProducts.filter(product=>normalizedSku(product?.sku)===wanted);
    if(matches.length>1)throw new Error(`Hay más de un producto de tienda con el SKU ${sku}. Corrige el catálogo antes de vincular esta partida.`);
    return matches[0]||null;
  }

  async function saveEditableItem(item,row,{reload=false}={}){
    syncItemFromRow(item,row);
    item.sku=String(item.sku||'').trim();
    const linked=findShopProductForSku(item.sku);
    const payload={...accountingPayload(item),shop_product_id:linked?.id??null};
    const {data,error}=await db.from('purchase_items')
      .update(payload)
      .eq('id',item.id)
      .select('id,sku,final_price,shop_product_id')
      .single();
    if(error)throw error;
    if(!data)throw new Error('Supabase no confirmó el guardado de la partida contable.');
    Object.assign(item,payload,data);
    if(linked){
      item.description=linked.name||item.description;
      item.category=linked.category||item.category;
    }
    if(reload)await load();
    return data;
  }

  async function saveAllItems(){
    applyGlobalsToMemory();
    await saveGlobalSettings();
    const rows=[...document.querySelectorAll('#itemsBody tr[data-id]')];
    let saved=0;
    for(const row of rows){
      const item=items.find(x=>String(x.id)===String(row.dataset.id));
      if(!item)continue;
      await saveEditableItem(item,row,{reload:false});
      saved++;
    }
    return saved;
  }

  async function applyAllPrices(){
    applyGlobalsToMemory();
    await saveGlobalSettings();
    const rows=[...document.querySelectorAll('#itemsBody tr[data-id]')];
    let applied=0;const failures=[];
    for(const row of rows){
      const item=items.find(x=>String(x.id)===String(row.dataset.id));
      if(!item)continue;
      try{
        await saveEditableItem(item,row,{reload:false});
        if(!item.sku)throw new Error('La partida no tiene SKU.');
        if(!item.shop_product_id)throw new Error(`El SKU ${item.sku} no existe en el catálogo de la tienda; la partida se guardó, pero no hay producto al cual aplicar el precio.`);
        await applyAccountingPrice(item,row);
        applied++;
      }catch(error){failures.push(`${item.sku||'sin SKU'}: ${String(error?.message||error)}`)}
    }
    return {applied,failures};
  }

  function invoiceForItem(item){return invoices.find(invoice=>String(invoice.id)===String(item?.invoice_id))||null}

  function postedPurchaseForItem(item){
    const invoice=invoiceForItem(item);
    if(!invoice)return null;
    const reference=invoice.invoice_number||`FACTURA-${String(invoice.id).slice(0,8)}`;
    return transactions.find(t=>t.operation_type==='purchase'&&t.reference===reference&&t.status==='posted')||null;
  }

  async function deleteAccountingItem(item){
    if(postedPurchaseForItem(item)){
      throw new Error('Esta partida pertenece a una factura que ya fue contabilizada. No se puede borrar porque alteraría el historial contable; primero debe corregirse mediante un ajuste o reversa.');
    }
    const sku=String(item?.sku||'Sin SKU').trim()||'Sin SKU';
    if(!confirm(`Se eliminará ${sku} de las partidas de Contabilidad.\n\nEsto NO borra ningún producto de la tienda y no se puede deshacer.\n\n¿Eliminar esta partida?`))return false;
    const {error}=await db.from('purchase_items').delete().eq('id',item.id);
    if(error)throw error;
    return true;
  }

  function setStatus(message,ok=true){
    const el=document.getElementById('globalPricingStatus');if(!el)return;
    el.textContent=message;el.className=`pricing-global-status ${ok?'status-ok':'status-error'}`;
  }

  function setup(){
    const tax=document.getElementById('globalTaxRate'),margin=document.getElementById('globalMargin');
    const included=document.getElementById('globalTaxIncluded'),creditable=document.getElementById('globalTaxCreditable');
    const save=document.getElementById('saveAllItemsBtn'),apply=document.getElementById('applyAllItemsBtn');
    const body=document.getElementById('itemsBody');
    if(!tax||!margin||!save||!apply||!body)return;

    const recalc=()=>{applyGlobalsToMemory({resetPrices:true});render()};
    tax.addEventListener('change',recalc);margin.addEventListener('change',recalc);included?.addEventListener('change',recalc);creditable?.addEventListener('change',recalc);

    body.addEventListener('click',async event=>{
      const button=event.target.closest('button[data-save-item],button[data-delete-item]');
      if(!button)return;
      const row=button.closest('tr[data-id]');
      const item=items.find(x=>String(x.id)===String(row?.dataset.id));
      if(!row||!item)return;

      button.disabled=true;
      try{
        if(button.hasAttribute('data-save-item')){
          await saveEditableItem(item,row,{reload:true});
          setStatus(`✅ ${item.sku||'Partida'} guardada.`,true);
          return;
        }
        const deleted=await deleteAccountingItem(item);
        if(deleted){setStatus(`✅ ${item.sku||'Partida'} eliminada de Contabilidad.`,true);await load()}
      }catch(error){
        console.error(error);
        setStatus(`❌ ${error.message||error}`,false);
        alert(error.message||error);
      }finally{button.disabled=false}
    });

    save.addEventListener('click',async()=>{
      save.disabled=true;apply.disabled=true;setStatus('Guardando todas las partidas…',true);
      try{const count=await saveAllItems();setStatus(`✅ ${count} partidas guardadas. IVA ${globalTax()}% y margen ${globalMargin()}% aplicados a todo.`,true);await load()}
      catch(error){console.error(error);setStatus(`❌ No se guardó todo: ${error.message||error}`,false)}
      finally{save.disabled=false;apply.disabled=false}
    });

    apply.addEventListener('click',async()=>{
      if(!confirm(`Se guardarán todas las partidas y se aplicarán sus precios a la tienda.\n\nIVA: ${globalTax()}%\nMargen: ${globalMargin()}%\n\n¿Continuar?`))return;
      save.disabled=true;apply.disabled=true;setStatus('Guardando y aplicando precios a la tienda…',true);
      try{
        const result=await applyAllPrices();
        if(result.failures.length){setStatus(`⚠️ ${result.applied} precios aplicados. ${result.failures.length} no pudieron actualizarse. Revisa consola.`,false);console.warn('WOMAN 656 · errores al aplicar precios',result.failures)}
        else setStatus(`✅ ${result.applied} precios guardados y aplicados a la tienda.`,true);
        await load();
      }catch(error){console.error(error);setStatus(`❌ No se pudo completar: ${error.message||error}`,false)}
      finally{save.disabled=false;apply.disabled=false}
    });

    syncGlobalControls();
    render();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();

(()=>{
  const script=document.createElement('script');
  script.src='accounting-order-allocation.js';
  script.defer=true;
  document.head.appendChild(script);
})();
