(() => {
  const XLSX_SRC='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
  const normalize=value=>String(value??'').trim();
  const key=value=>normalize(value).toLocaleUpperCase('es-MX');
  const numOrNull=value=>{
    if(value===null||value===undefined||value==='')return null;
    const n=Number(String(value).replace(/[$,\s]/g,''));
    return Number.isFinite(n)?n:null;
  };
  const boolOrNull=value=>{
    if(typeof value==='boolean')return value;
    const v=key(value);
    if(['SI','SÍ','YES','TRUE','1'].includes(v))return true;
    if(['NO','FALSE','0'].includes(v))return false;
    return null;
  };
  const today=()=>new Date().toISOString().slice(0,10);
  const cell=(row,...names)=>{
    for(const name of names)if(Object.prototype.hasOwnProperty.call(row,name))return row[name];
    const simplify=value=>key(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
    const entries=Object.entries(row);
    for(const name of names){
      const wanted=simplify(name);
      const found=entries.find(([header])=>simplify(header)===wanted);
      if(found)return found[1];
    }
    return '';
  };

  async function ensureXlsx(){
    if(window.XLSX)return window.XLSX;
    await new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src.includes('/xlsx@0.18.5/'));
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el lector de Excel.')),{once:true});
        if(window.XLSX)resolve();
        return;
      }
      const script=document.createElement('script');script.src=XLSX_SRC;script.defer=true;
      script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
    if(!window.XLSX)throw new Error('El lector de Excel no quedó disponible.');
    return window.XLSX;
  }

  function setStatus(message,type='info'){
    const el=document.getElementById('accountingExcelStatus');if(!el)return;
    el.textContent=message;el.dataset.type=type;
  }

  function invoiceFor(item){
    return Array.isArray(invoices)?invoices.find(x=>String(x.id)===String(item?.invoice_id)):null;
  }

  function calculate(item){
    const paid=Number(item.unit_cost)||0;
    const shipping=Number(item.shipping_allocated)||0;
    const duties=Number(item.duties_allocated)||0;
    const other=Number(item.other_allocated)||0;
    const promotion=Number(item.promotion_allocated)||0;
    const invoice=invoiceFor(item);
    let real;
    if(invoice?.amounts_include_tax){
      real=paid+shipping+duties+other-promotion;
    }else{
      const rate=(Number(item.tax_rate)||0)/100;
      const tax=item.tax_included?paid-(paid/(1+rate)):paid*rate;
      const base=item.tax_included?paid-tax:paid;
      real=base+shipping+duties+other+(item.tax_creditable?0:tax)-promotion;
    }
    real=Math.max(0,Math.round(real*100)/100);
    const rounding=Number(item.rounding||settings?.price_rounding)||1;
    const margin=Number(item.margin_percent)||0;
    const suggested=Math.ceil((real*(1+margin/100))/rounding)*rounding;
    return {real,suggested};
  }

  function productForItem(item){
    const id=Number(item?.shop_product_id);
    if(id&&Array.isArray(shopProducts)){
      const product=shopProducts.find(p=>Number(p.id)===id);
      if(product)return product;
    }
    const skuKey=key(item?.sku);
    return Array.isArray(shopProducts)?shopProducts.find(p=>key(p.sku)===skuKey):null;
  }

  function exportRows(){
    const sorted=[...(items||[])].sort((a,b)=>collator.compare(String(a.sku||''),String(b.sku||'')));
    return sorted.map(item=>{
      const product=productForItem(item);
      const c=calculate(item);
      return {
        SKU:item.sku||product?.sku||'',
        Producto:product?.name||item.description||'',
        'Descripción':product?.description||'',
        'Categoría':product?.category||item.category||'',
        Talla:item.size||'',
        Cantidad:Number(item.quantity)||1,
        Costo_Compra:Number(item.unit_cost)||0,
        Costo_Envio:Number(item.shipping_allocated)||0,
        Costo_Importacion:Number(item.duties_allocated)||0,
        Promocion_Unit:Number(item.promotion_allocated)||0,
        Otros_Costos:Number(item.other_allocated)||0,
        IVA_Pct:Number(item.tax_rate)||0,
        IVA_Incluido:item.tax_included?'SI':'NO',
        IVA_Acreditable:item.tax_creditable?'SI':'NO',
        Costo_Total_Unit:c.real,
        Margen_Pct:Number(item.margin_percent)||0,
        Precio_Sugerido:c.suggested,
        Precio_Venta:Number(item.final_price)||c.suggested,
        Estado:item.import_status||'',
        Origen:item.source_reference||'',
        ID_Contable:item.id||'',
        ID_Producto:item.shop_product_id||product?.id||'',
        Factura_ID:item.invoice_id||''
      };
    });
  }

  async function downloadAccounting(){
    setStatus('Preparando tabla contable…');
    if(typeof load==='function')await load();
    const rows=exportRows();
    if(!rows.length)throw new Error('No hay partidas contables para descargar.');
    const XLSX=await ensureXlsx();
    const header=['SKU','Producto','Descripción','Categoría','Talla','Cantidad','Costo_Compra','Costo_Envio','Costo_Importacion','Promocion_Unit','Otros_Costos','IVA_Pct','IVA_Incluido','IVA_Acreditable','Costo_Total_Unit','Margen_Pct','Precio_Sugerido','Precio_Venta','Estado','Origen','ID_Contable','ID_Producto','Factura_ID'];
    const worksheet=XLSX.utils.json_to_sheet(rows,{header});
    worksheet['!cols']=[{wch:18},{wch:32},{wch:48},{wch:20},{wch:11},{wch:10},{wch:14},{wch:14},{wch:17},{wch:15},{wch:14},{wch:10},{wch:14},{wch:16},{wch:17},{wch:12},{wch:17},{wch:15},{wch:12},{wch:18},{wch:38},{wch:14},{wch:38}];
    worksheet['!autofilter']={ref:worksheet['!ref']};
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,'Contabilidad');
    XLSX.writeFile(workbook,`woman-656-contabilidad-${today()}.xlsx`);
    setStatus(`✅ Excel descargado: ${rows.length} partidas.`, 'ok');
  }

  async function readRows(file){
    const XLSX=await ensureXlsx();
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheetName=workbook.SheetNames.includes('Contabilidad')?'Contabilidad':workbook.SheetNames[0];
    if(!sheetName)throw new Error('El archivo no contiene hojas.');
    const rows=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{defval:'',raw:true});
    if(!rows.length)throw new Error('El Excel no contiene partidas.');
    return rows;
  }

  async function freshContext(){
    const [itemResult,productResult]=await Promise.all([
      db.from('purchase_items').select('*').order('created_at',{ascending:false}),
      db.from('shop_products').select('*')
    ]);
    if(itemResult.error)throw itemResult.error;
    if(productResult.error)throw productResult.error;
    const currentItems=itemResult.data||[];
    const products=productResult.data||[];
    return {
      items:currentItems,
      products,
      byItemId:new Map(currentItems.map(i=>[String(i.id),i])),
      byProductId:new Map(products.map(p=>[Number(p.id),p])),
      bySku:new Map(products.map(p=>[key(p.sku),p]))
    };
  }

  function productPatch(row,product){
    const patch={};
    const name=normalize(cell(row,'Producto','Nombre'));
    const description=normalize(cell(row,'Descripción','Descripcion'));
    const category=normalize(cell(row,'Categoría','Categoria'));
    const price=numOrNull(cell(row,'Precio_Venta','Precio Venta','Precio_MXN'));
    if(name&&name!==String(product.name||''))patch.name=name;
    if((cell(row,'Descripción','Descripcion')!=='')&&description!==String(product.description||''))patch.description=description||null;
    if(category&&category!==String(product.category||''))patch.category=category;
    if(price!==null&&price>=0&&Number(product.price)!==price)patch.price=price;
    return patch;
  }

  function itemPayload(row,target,product){
    const sku=normalize(cell(row,'SKU'))||target?.sku||product?.sku||'';
    const productName=normalize(cell(row,'Producto','Nombre'))||product?.name||target?.description||sku||'Producto';
    const category=normalize(cell(row,'Categoría','Categoria'))||product?.category||target?.category||'NOVEDADES';
    const sizeRaw=cell(row,'Talla','Size');
    const quantity=numOrNull(cell(row,'Cantidad','Quantity'));
    if(quantity!==null&&quantity<1)throw new Error(`${sku||'Partida'}: Cantidad en Contabilidad debe ser 1 o mayor. Para stock = 0 usa el Excel del panel ADMIN.`);
    const candidate={
      ...(target||{}),
      invoice_id:target?.invoice_id||null,
      shop_product_id:product?.id??target?.shop_product_id??null,
      source_reference:target?.source_reference||'EXCEL_ACCOUNTING',
      sku:sku||null,
      description:productName,
      category,
      size:sizeRaw===''?(target?.size||null):(normalize(sizeRaw)||null),
      quantity:quantity===null?(Number(target?.quantity)||1):Math.floor(quantity),
      unit_cost:numOrNull(cell(row,'Costo_Compra','Precio_Costo','Costo')) ?? Number(target?.unit_cost||0),
      shipping_allocated:numOrNull(cell(row,'Costo_Envio','Envio')) ?? Number(target?.shipping_allocated||0),
      duties_allocated:numOrNull(cell(row,'Costo_Importacion','Importacion')) ?? Number(target?.duties_allocated||0),
      promotion_allocated:numOrNull(cell(row,'Promocion_Unit','Promoción','Promocion')) ?? Number(target?.promotion_allocated||0),
      other_allocated:numOrNull(cell(row,'Otros_Costos','Otros')) ?? Number(target?.other_allocated||0),
      tax_rate:numOrNull(cell(row,'IVA_Pct','IVA')) ?? Number(target?.tax_rate ?? settings?.sales_tax_rate ?? 16),
      tax_included:boolOrNull(cell(row,'IVA_Incluido')) ?? Boolean(target?.tax_included),
      tax_creditable:boolOrNull(cell(row,'IVA_Acreditable')) ?? Boolean(target?.tax_creditable),
      margin_percent:numOrNull(cell(row,'Margen_Pct','Margen')) ?? Number(target?.margin_percent ?? settings?.default_margin_percent ?? 50),
      final_price:numOrNull(cell(row,'Precio_Venta','Precio Venta','Precio_MXN')) ?? Number(target?.final_price||0),
      import_status:'ready'
    };
    const calculated=calculate(candidate);
    candidate.real_unit_cost=calculated.real;
    candidate.suggested_price=calculated.suggested;
    if(!(Number(candidate.final_price)>0))candidate.final_price=calculated.suggested;
    return candidate;
  }

  async function importAccounting(file){
    setStatus('Leyendo y validando Excel…');
    const rows=await readRows(file);
    const context=await freshContext();
    const seenIds=new Set();
    let updated=0,created=0,productsUpdated=0;

    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      const rowNumber=index+2;
      const id=normalize(cell(row,'ID_Contable','ID Contable'));
      if(id&&seenIds.has(id))throw new Error(`El ID_Contable ${id} aparece más de una vez en el Excel.`);
      if(id)seenIds.add(id);
      let target=id?context.byItemId.get(id):null;
      if(id&&!target)throw new Error(`Fila ${rowNumber}: no existe ID_Contable ${id}. Descarga nuevamente la tabla antes de editar.`);

      const rowSku=normalize(cell(row,'SKU'))||target?.sku||'';
      let product=null;
      if(target?.shop_product_id)product=context.byProductId.get(Number(target.shop_product_id))||null;
      if(!product&&rowSku)product=context.bySku.get(key(rowSku))||null;
      if(target?.shop_product_id&&product&&rowSku&&key(rowSku)!==key(product.sku)){
        throw new Error(`Fila ${rowNumber}: el SKU ${rowSku} no corresponde al producto vinculado a ID_Contable ${target.id}. Cambia SKU desde ADMIN, no desde esta hoja.`);
      }

      if(!target&&!id&&product){
        const size=key(cell(row,'Talla'));
        target=context.items.find(item=>Number(item.shop_product_id)===Number(product.id)&&(!size||key(item.size)===size)&&item.source_reference==='CATALOG_AUTO')
          || context.items.find(item=>Number(item.shop_product_id)===Number(product.id)&&(!size||key(item.size)===size))
          || null;
      }

      if(product){
        const patch=productPatch(row,product);
        if(Object.keys(patch).length){
          const q=await db.from('shop_products').update(patch).eq('id',product.id).select('*').single();
          if(q.error)throw q.error;
          product=q.data;
          context.byProductId.set(Number(product.id),product);
          context.bySku.set(key(product.sku),product);
          productsUpdated++;
        }
      }

      const payload=itemPayload(row,target,product);
      const writePayload={
        invoice_id:payload.invoice_id||null,
        shop_product_id:payload.shop_product_id||null,
        source_reference:payload.source_reference||'EXCEL_ACCOUNTING',
        sku:payload.sku||null,
        description:payload.description,
        category:payload.category,
        size:payload.size||null,
        quantity:payload.quantity,
        unit_cost:payload.unit_cost,
        tax_rate:payload.tax_rate,
        tax_included:payload.tax_included,
        tax_creditable:payload.tax_creditable,
        shipping_allocated:payload.shipping_allocated,
        duties_allocated:payload.duties_allocated,
        promotion_allocated:payload.promotion_allocated,
        other_allocated:payload.other_allocated,
        margin_percent:payload.margin_percent,
        real_unit_cost:payload.real_unit_cost,
        suggested_price:payload.suggested_price,
        final_price:payload.final_price,
        import_status:'ready'
      };

      if(target){
        const q=await db.from('purchase_items').update(writePayload).eq('id',target.id).select('*').single();
        if(q.error)throw q.error;
        Object.assign(target,q.data);
        updated++;
      }else{
        const q=await db.from('purchase_items').insert(writePayload).select('*').single();
        if(q.error)throw q.error;
        context.items.push(q.data);context.byItemId.set(String(q.data.id),q.data);
        created++;
      }
    }

    if(typeof load==='function')await load();
    setStatus(`✅ Excel aplicado: ${updated} partidas actualizadas, ${created} partidas nuevas y ${productsUpdated} productos sincronizados con la tienda.`, 'ok');
  }

  function ensureUi(){
    if(document.getElementById('accountingExcelTools'))return true;
    const purchases=document.getElementById('purchases');
    if(!purchases)return false;
    const cards=[...purchases.querySelectorAll(':scope > section.card')];
    const itemsCard=cards.find(card=>card.querySelector('#itemsBody'));
    if(!itemsCard)return false;
    const section=document.createElement('section');
    section.id='accountingExcelTools';section.className='card accounting-excel-tools';
    section.innerHTML=`
      <div class="row"><div><h2>Excel de Contabilidad</h2><p>Descarga la tabla completa, edita costos, descripción, talla, cantidad o precio y vuelve a cargarla. ID_Contable identifica con seguridad cada partida existente.</p></div><div class="accounting-excel-actions"><button type="button" id="downloadAccountingExcel">Descargar Excel</button><button type="button" class="primary" id="importAccountingExcel">Cargar / actualizar Excel</button><input id="accountingExcelFile" type="file" accept=".xlsx,.xls,.csv" hidden></div></div>
      <div id="accountingExcelStatus" class="accounting-excel-status">La hoja usa el orden: SKU · Producto · Descripción · Categoría · Talla · Cantidad · costos · IVA · margen · Precio_Venta.</div>`;
    purchases.insertBefore(section,itemsCard);
    const style=document.createElement('style');
    style.textContent=`.accounting-excel-tools .row{align-items:flex-start}.accounting-excel-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.accounting-excel-status{margin-top:10px;color:var(--muted);font-size:12px}.accounting-excel-status[data-type="ok"]{color:#8ee0a7}.accounting-excel-status[data-type="error"]{color:#ff9e9e}@media(max-width:760px){.accounting-excel-actions{width:100%;justify-content:flex-start}}`;
    document.head.appendChild(style);

    const download=document.getElementById('downloadAccountingExcel');
    const upload=document.getElementById('importAccountingExcel');
    const input=document.getElementById('accountingExcelFile');
    download.addEventListener('click',async()=>{
      download.disabled=true;
      try{await downloadAccounting();}catch(error){console.error(error);setStatus(`❌ ${error.message||error}`,'error');alert(error.message||error);}finally{download.disabled=false;}
    });
    upload.addEventListener('click',()=>input.click());
    input.addEventListener('change',async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      upload.disabled=true;
      try{
        if(!confirm('El Excel actualizará las partidas identificadas por ID_Contable.\n\nLos cambios en Precio_Venta, Producto, Descripción o Categoría también se sincronizarán al producto vinculado de la tienda.\n\nEl stock NO se cambia desde esta hoja; para existencias usa el Excel del panel ADMIN.\n\n¿Continuar?'))return;
        await importAccounting(file);
      }catch(error){console.error(error);setStatus(`❌ ${error.message||error}`,'error');alert(error.message||error);}finally{upload.disabled=false;}
    });
    return true;
  }

  let attempts=0;
  function install(){attempts++;if(ensureUi())return;if(attempts<100)setTimeout(install,100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
