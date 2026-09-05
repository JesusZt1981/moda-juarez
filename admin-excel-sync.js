(() => {
  const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const collator = new Intl.Collator('es', { numeric:true, sensitivity:'base' });
  const DEFAULT_SIZES = ['XS','S','M','G','XG'];
  const normalize = value => String(value ?? '').trim();
  const key = value => normalize(value).toLocaleUpperCase('es-MX');
  const numberOrNull = value => {
    if(value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(/[$,\s]/g,''));
    return Number.isFinite(n) ? n : null;
  };
  const integerOrNull = value => {
    const n = numberOrNull(value);
    return n === null ? null : Math.max(0, Math.floor(n));
  };
  const yesNo = value => {
    if(typeof value === 'boolean') return value;
    const v = key(value);
    if(['SI','SÍ','YES','TRUE','1','ACTIVO'].includes(v)) return true;
    if(['NO','FALSE','0','OCULTO','INACTIVO'].includes(v)) return false;
    return null;
  };
  const today = () => new Date().toISOString().slice(0,10);
  const cell = (row, ...names) => {
    for(const name of names){
      if(Object.prototype.hasOwnProperty.call(row,name)) return row[name];
    }
    const entries = Object.entries(row);
    for(const name of names){
      const wanted = key(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
      const found = entries.find(([header]) => key(header).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'') === wanted);
      if(found) return found[1];
    }
    return '';
  };

  async function ensureXlsx(){
    if(window.XLSX) return window.XLSX;
    await new Promise((resolve,reject)=>{
      const existing = [...document.scripts].find(s=>s.src===XLSX_SRC || s.src.includes('/xlsx@0.18.5/'));
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el lector de Excel.')),{once:true});
        if(window.XLSX) resolve();
        return;
      }
      const script=document.createElement('script');
      script.src=XLSX_SRC;script.defer=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
    if(!window.XLSX) throw new Error('El lector de Excel no quedó disponible.');
    return window.XLSX;
  }

  async function requireAdmin(){
    if(typeof requireShopAdmin !== 'function') throw new Error('El panel ADMIN todavía no está listo. Recarga la página.');
    return requireShopAdmin();
  }

  function setStatus(message, type='info'){
    const el=document.getElementById('adminExcelStatus');
    if(!el) return;
    el.textContent=message;
    el.dataset.type=type;
  }

  function chooseSizes(product){
    const variants=Array.isArray(product?.variants) ? product.variants : [];
    const existing=[...new Set(variants.map(v=>normalize(v.size||'UNITALLA')).filter(Boolean))];
    if(existing.length===1 && key(existing[0])==='UNITALLA') return existing;
    const hasStandard=existing.some(size=>DEFAULT_SIZES.includes(key(size)));
    if(hasStandard) return [...new Set([...DEFAULT_SIZES,...existing])];
    if(existing.length) return existing;
    return DEFAULT_SIZES;
  }

  async function loadLatestCosts(){
    const costs=new Map();
    if(!shopSupabase) return costs;
    const {data,error}=await shopSupabase
      .from('purchase_items')
      .select('shop_product_id,real_unit_cost,unit_cost,created_at')
      .not('shop_product_id','is',null)
      .order('created_at',{ascending:false});
    if(error) throw error;
    for(const row of data||[]){
      const id=Number(row.shop_product_id);
      if(!id || costs.has(id)) continue;
      const real=Number(row.real_unit_cost);
      const unit=Number(row.unit_cost);
      const cost=Number.isFinite(real) && real>0 ? real : (Number.isFinite(unit) ? unit : 0);
      if(cost>0) costs.set(id,cost);
    }
    return costs;
  }

  function exportRows(products,costs,mode){
    const rows=[];
    const sorted=[...products].sort((a,b)=>collator.compare(String(a.sku||''),String(b.sku||'')));
    for(const product of sorted){
      const variants=Array.isArray(product.variants)?product.variants:[];
      const bySize=new Map(variants.map(v=>[key(v.size||'UNITALLA'),v]));
      for(const size of chooseSizes(product)){
        const variant=bySize.get(key(size));
        const quantity=variant ? Math.max(0,Math.floor(Number(variant.quantity)||0)) : 0;
        if(mode==='positive' && quantity<=0) continue;
        if(mode==='zero' && quantity!==0) continue;
        rows.push({
          SKU:product.sku||'',
          Producto:product.name||'',
          'Descripción':product.description||'',
          'Categoría':product.category||'',
          Talla:size||'UNITALLA',
          Cantidad:quantity,
          Precio_Costo:Number(costs.get(Number(product.dbId))||0),
          Precio_Venta:Number(product.price)||0,
          Activo:product.active===false?'NO':'SI',
          ID_Producto:product.dbId||'',
          ID_Variante:variant?.id||''
        });
      }
    }
    return rows;
  }

  async function downloadStock(mode='all'){
    await requireAdmin();
    setStatus('Preparando inventario desde Supabase…');
    if(typeof loadCatalogFromSupabase==='function') await loadCatalogFromSupabase();
    const XLSX=await ensureXlsx();
    const costs=await loadLatestCosts();
    const rows=exportRows(state.products||[],costs,mode);
    if(!rows.length) throw new Error('No hay filas de inventario que coincidan con ese filtro.');
    const worksheet=XLSX.utils.json_to_sheet(rows,{header:['SKU','Producto','Descripción','Categoría','Talla','Cantidad','Precio_Costo','Precio_Venta','Activo','ID_Producto','ID_Variante']});
    worksheet['!cols']=[{wch:18},{wch:32},{wch:48},{wch:20},{wch:12},{wch:12},{wch:15},{wch:15},{wch:10},{wch:14},{wch:14}];
    worksheet['!autofilter']={ref:worksheet['!ref']};
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,'Stock');
    const label=mode==='zero'?'stock-cero':mode==='positive'?'stock-mayor-cero':'stock-completo';
    XLSX.writeFile(workbook,`woman-656-${label}-${today()}.xlsx`);
    setStatus(`✅ Excel descargado: ${rows.length} filas. Cada fila representa un SKU + talla.`, 'ok');
  }

  function parseWorkbookRows(file){
    return ensureXlsx().then(async XLSX=>{
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:'array'});
      const sheetName=workbook.SheetNames.includes('Stock')?'Stock':workbook.SheetNames[0];
      if(!sheetName) throw new Error('El archivo no contiene hojas.');
      const rows=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{defval:'',raw:true});
      if(!rows.length) throw new Error('El Excel no contiene filas de inventario.');
      return rows;
    });
  }

  function groupRows(rows){
    const grouped=new Map();
    const duplicates=new Set();
    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      const sku=normalize(cell(row,'SKU'));
      if(!sku) throw new Error(`Fila ${index+2}: falta SKU.`);
      const size=normalize(cell(row,'Talla','Size')) || 'UNITALLA';
      const qty=integerOrNull(cell(row,'Cantidad','Stock','Quantity'));
      if(qty===null) throw new Error(`Fila ${index+2} (${sku} ${size}): Cantidad debe ser un número mayor o igual a 0.`);
      const groupKey=key(sku);
      if(!grouped.has(groupKey)) grouped.set(groupKey,{sku,rows:[]});
      const duplicateKey=`${groupKey}|${key(size)}`;
      if(duplicates.has(duplicateKey)) throw new Error(`El Excel repite ${sku} talla ${size}. Deja una sola fila por SKU + talla.`);
      duplicates.add(duplicateKey);
      grouped.get(groupKey).rows.push({...row,__row:index+2,__sku:sku,__size:size,__qty:qty});
    }
    return grouped;
  }

  function commonValue(rows,names,{numeric=false,boolean=false}={}){
    const values=[];
    for(const row of rows){
      const raw=cell(row,...names);
      if(raw==='' || raw===null || raw===undefined) continue;
      const value=boolean ? yesNo(raw) : numeric ? numberOrNull(raw) : normalize(raw);
      if(value===null) continue;
      values.push(value);
    }
    if(!values.length) return null;
    const first=values[0];
    if(values.some(value=>String(value)!==String(first))) throw new Error(`El SKU ${rows[0].__sku} tiene valores distintos en la columna ${names[0]}. Debe ser el mismo valor en todas sus tallas.`);
    return first;
  }

  async function loadFreshInventory(){
    const {data:products,error:productError}=await shopSupabase.from('shop_products').select('*');
    if(productError) throw productError;
    const ids=(products||[]).map(p=>p.id);
    let variants=[];
    if(ids.length){
      const vr=await shopSupabase.from('shop_product_variants').select('*').in('product_id',ids);
      if(vr.error) throw vr.error;
      variants=vr.data||[];
    }
    const variantIds=variants.map(v=>v.id);
    let inventory=[];
    if(variantIds.length){
      const ir=await shopSupabase.from('shop_inventory').select('*').in('variant_id',variantIds);
      if(ir.error) throw ir.error;
      inventory=ir.data||[];
    }
    const qtyByVariant=new Map(inventory.map(i=>[Number(i.variant_id),Math.max(0,Math.floor(Number(i.quantity)||0))]));
    const variantsByProduct=new Map();
    for(const variant of variants){
      const pid=Number(variant.product_id);
      if(!variantsByProduct.has(pid)) variantsByProduct.set(pid,[]);
      variantsByProduct.get(pid).push({...variant,quantity:qtyByVariant.get(Number(variant.id))||0});
    }
    return {products:products||[],variantsByProduct};
  }

  async function updateAccountingCost(productId,sku,cost,price,name,category){
    if(cost===null) return;
    const payload={unit_cost:cost,real_unit_cost:cost};
    if(price!==null) payload.final_price=price;
    if(name) payload.description=name;
    if(category) payload.category=category;
    let {data:rows,error}=await shopSupabase
      .from('purchase_items')
      .select('id,source_reference,created_at')
      .eq('shop_product_id',productId)
      .order('created_at',{ascending:false});
    if(error) throw error;
    rows=rows||[];
    const target=rows.find(r=>r.source_reference==='CATALOG_AUTO') || rows[0];
    if(target){
      const q=await shopSupabase.from('purchase_items').update(payload).eq('id',target.id);
      if(q.error) throw q.error;
      return;
    }
    const insert={invoice_id:null,shop_product_id:productId,source_reference:'EXCEL_STOCK',sku,description:name||sku,category:category||'NOVEDADES',quantity:1,unit_cost:cost,tax_rate:16,tax_included:false,tax_creditable:false,shipping_allocated:0,duties_allocated:0,other_allocated:0,margin_percent:50,real_unit_cost:cost,suggested_price:price||0,final_price:price||0,import_status:'ready'};
    const q=await shopSupabase.from('purchase_items').insert(insert);
    if(q.error) throw q.error;
  }

  async function importStock(file){
    await requireAdmin();
    setStatus('Leyendo y validando Excel…');
    const rows=await parseWorkbookRows(file);
    const groups=groupRows(rows);
    const fresh=await loadFreshInventory();
    const productBySku=new Map(fresh.products.map(p=>[key(p.sku),p]));
    let productsCreated=0,productsUpdated=0,variantsCreated=0,stockChanges=0;

    for(const [skuKey,group] of groups){
      const name=commonValue(group.rows,['Producto','Nombre']);
      const description=commonValue(group.rows,['Descripción','Descripcion']);
      const category=commonValue(group.rows,['Categoría','Categoria']);
      const salePrice=commonValue(group.rows,['Precio_Venta','Precio Venta','Precio_MXN'],{numeric:true});
      const costPrice=commonValue(group.rows,['Precio_Costo','Precio Costo','Costo'],{numeric:true});
      const active=commonValue(group.rows,['Activo'],{boolean:true});
      let product=productBySku.get(skuKey);

      if(!product){
        if(!name) throw new Error(`SKU ${group.sku}: para crear un producto nuevo falta Producto.`);
        if(!category) throw new Error(`SKU ${group.sku}: para crear un producto nuevo falta Categoría.`);
        if(salePrice===null || salePrice<0) throw new Error(`SKU ${group.sku}: para crear un producto nuevo falta Precio_Venta válido.`);
        const payload={sku:group.sku.toLocaleUpperCase('es-MX'),name,category,description:description||null,price:salePrice,compare_at_price:null,currency:'MXN',active:active===null?true:active};
        const ins=await shopSupabase.from('shop_products').insert(payload).select('*').single();
        if(ins.error) throw ins.error;
        product=ins.data;
        productBySku.set(skuKey,product);
        fresh.variantsByProduct.set(Number(product.id),[]);
        productsCreated++;
      }else{
        const patch={};
        if(name!==null && name!==product.name) patch.name=name;
        if(description!==null && description!==String(product.description||'')) patch.description=description||null;
        if(category!==null && category!==product.category) patch.category=category;
        if(salePrice!==null && Number(product.price)!==Number(salePrice)) patch.price=salePrice;
        if(active!==null && Boolean(product.active)!==active) patch.active=active;
        if(Object.keys(patch).length){
          const up=await shopSupabase.from('shop_products').update(patch).eq('id',product.id).select('*').single();
          if(up.error) throw up.error;
          product=up.data;
          productBySku.set(skuKey,product);
          productsUpdated++;
        }
      }

      await updateAccountingCost(Number(product.id),product.sku,costPrice,salePrice,name||product.name,category||product.category);

      const variants=fresh.variantsByProduct.get(Number(product.id))||[];
      const bySize=new Map(variants.map(v=>[key(v.size||'UNITALLA'),v]));
      for(const row of group.rows){
        const size=row.__size;
        const next=row.__qty;
        let variant=bySize.get(key(size));
        if(!variant){
          const variantSku=`${product.sku}-${size}`;
          const ins=await shopSupabase.from('shop_product_variants').insert({product_id:product.id,variant_sku:variantSku,size,color:null,active:true}).select('*').single();
          if(ins.error) throw new Error(`${product.sku} talla ${size}: ${ins.error.message}`);
          variant={...ins.data,quantity:0};
          bySize.set(key(size),variant);
          variants.push(variant);
          variantsCreated++;
        }
        const previous=Math.max(0,Math.floor(Number(variant.quantity)||0));
        if(previous===next) continue;
        const up=await shopSupabase.from('shop_inventory').upsert({variant_id:variant.id,quantity:next},{onConflict:'variant_id'});
        if(up.error) throw up.error;
        const movement=await shopSupabase.from('shop_inventory_movements').insert({variant_id:variant.id,movement_type:'excel_adjustment',quantity:next-previous,previous_stock:previous,new_stock:next,reason:'Actualización de stock desde Excel',reference:product.sku});
        if(movement.error) throw movement.error;
        variant.quantity=next;
        stockChanges++;
      }
    }

    if(typeof loadCatalogFromSupabase==='function') await loadCatalogFromSupabase();
    setStatus(`✅ Excel aplicado: ${productsCreated} productos nuevos, ${productsUpdated} productos actualizados, ${variantsCreated} tallas nuevas y ${stockChanges} cambios de stock.`, 'ok');
  }

  function ensureUi(){
    if(document.getElementById('adminExcelInventory')) return true;
    const actions=document.getElementById('adminTopActions');
    if(!actions) return false;
    const box=document.createElement('section');
    box.id='adminExcelInventory';
    box.className='admin-excel-inventory';
    box.innerHTML=`
      <div class="admin-excel-head">
        <div><strong>📊 Excel de inventario</strong><span>Descarga stock por SKU + talla, edita Cantidad, costo o precio y vuelve a cargarlo. La Cantidad importada reemplaza el stock actual de esa talla.</span></div>
      </div>
      <div class="admin-excel-actions">
        <button type="button" class="secondary-btn" data-stock-export="all">Descargar todo</button>
        <button type="button" class="secondary-btn" data-stock-export="positive">Stock &gt; 0</button>
        <button type="button" class="secondary-btn" data-stock-export="zero">Stock = 0</button>
        <button type="button" class="primary-btn" id="adminImportStockExcel">Cargar / actualizar Excel</button>
        <input type="file" id="adminStockExcelFile" accept=".xlsx,.xls,.csv" hidden>
      </div>
      <div id="adminExcelStatus" class="admin-excel-status">Columnas: SKU · Producto · Descripción · Categoría · Talla · Cantidad · Precio_Costo · Precio_Venta.</div>`;
    actions.insertAdjacentElement('afterend',box);
    const style=document.createElement('style');
    style.textContent=`.admin-excel-inventory{margin-top:12px;padding:14px;border:1px solid var(--border);border-radius:12px;background:#f7f8f6}.admin-excel-head strong{display:block;font-size:14px}.admin-excel-head span{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.45}.admin-excel-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.admin-excel-status{margin-top:9px;font-size:11px;color:var(--muted)}.admin-excel-status[data-type="ok"]{color:#527160}.admin-excel-status[data-type="error"]{color:#9b4f4f}`;
    document.head.appendChild(style);

    box.querySelectorAll('[data-stock-export]').forEach(button=>button.addEventListener('click',async()=>{
      button.disabled=true;
      try{await downloadStock(button.dataset.stockExport);}catch(error){console.error(error);setStatus(`❌ ${error.message||error}`,'error');alert(error.message||error);}finally{button.disabled=false;}
    }));
    const fileInput=document.getElementById('adminStockExcelFile');
    document.getElementById('adminImportStockExcel').addEventListener('click',()=>fileInput.click());
    fileInput.addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      event.target.value='';
      if(!file) return;
      const button=document.getElementById('adminImportStockExcel');
      button.disabled=true;
      try{
        const ok=confirm('El Excel actualizará el stock FINAL por SKU + talla.\n\nEjemplo: si en Cantidad pones 3, esa talla quedará en 3; no se sumarán 3 al stock actual.\n\nTambién puede crear productos/tallas nuevas si agregas filas completas.\n\n¿Continuar?');
        if(!ok) return;
        await importStock(file);
      }catch(error){console.error(error);setStatus(`❌ ${error.message||error}`,'error');alert(error.message||error);}finally{button.disabled=false;}
    });
    return true;
  }

  let attempts=0;
  function install(){
    attempts++;
    if(ensureUi()) return;
    if(attempts<100) setTimeout(install,100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
