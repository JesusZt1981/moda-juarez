(() => {
  const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const collator = new Intl.Collator('es', { numeric:true, sensitivity:'base' });
  const normalize = value => String(value ?? '').trim();
  const key = value => normalize(value).toLocaleUpperCase('es-MX');
  const today = () => new Date().toISOString().slice(0,10);

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

  const normalizedHeader = value =>
    key(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Z0-9]/g,'');

  const cell = (row, ...names) => {
    for(const name of names){
      if(Object.prototype.hasOwnProperty.call(row,name)) return row[name];
    }
    const entries = Object.entries(row);
    for(const name of names){
      const wanted = normalizedHeader(name);
      const found = entries.find(([header]) => normalizedHeader(header) === wanted);
      if(found) return found[1];
    }
    return '';
  };

  async function ensureXlsx(){
    if(window.XLSX) return window.XLSX;
    await new Promise((resolve,reject)=>{
      const existing = [...document.scripts].find(
        s => s.src===XLSX_SRC || s.src.includes('/xlsx@0.18.5/')
      );
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener(
          'error',
          ()=>reject(new Error('No se pudo cargar el lector de Excel.')),
          {once:true}
        );
        if(window.XLSX) resolve();
        return;
      }
      const script=document.createElement('script');
      script.src=XLSX_SRC;
      script.defer=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
    if(!window.XLSX) throw new Error('El lector de Excel no quedó disponible.');
    return window.XLSX;
  }

  async function requireAdmin(){
    if(typeof requireShopAdmin !== 'function'){
      throw new Error('El panel ADMIN todavía no está listo. Recarga la página.');
    }
    return requireShopAdmin();
  }

  function setStatus(message,type='info'){
    const el=document.getElementById('adminExcelStatus');
    if(!el) return;
    el.textContent=message;
    el.dataset.type=type;
  }

  const preferredSizes = [
    'XS','S','CH','M','G','L','XL','XG','EG','XXL','2XL','3XL','UNITALLA'
  ];

  function sortSizes(sizes){
    const rank = new Map(preferredSizes.map((size,index)=>[key(size),index]));
    return [...sizes].sort((a,b)=>{
      const ra=rank.has(key(a)) ? rank.get(key(a)) : 999;
      const rb=rank.has(key(b)) ? rank.get(key(b)) : 999;
      if(ra!==rb) return ra-rb;
      return collator.compare(a,b);
    });
  }

  function collectCatalogSizes(products){
    const seen=new Map();
    for(const product of products||[]){
      for(const variant of (Array.isArray(product?.variants)?product.variants:[])){
        const size=normalize(variant?.size || 'UNITALLA') || 'UNITALLA';
        if(!seen.has(key(size))) seen.set(key(size),size);
      }
    }
    if(!seen.size) seen.set('UNITALLA','UNITALLA');
    return sortSizes([...seen.values()]);
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
      const cost=
        Number.isFinite(real) && real>0
          ? real
          : (Number.isFinite(unit) && unit>0 ? unit : null);
      if(cost!==null) costs.set(id,cost);
    }
    return costs;
  }

  function exportRows(products,costs,mode){
    const sizes=collectCatalogSizes(products);
    const sorted=[...products].sort(
      (a,b)=>collator.compare(String(a.sku||''),String(b.sku||''))
    );
    const rows=[];

    for(const product of sorted){
      const variants=Array.isArray(product.variants)?product.variants:[];
      const bySize=new Map(
        variants.map(v=>[key(v.size||'UNITALLA'),v])
      );
      const totalStock=variants.reduce(
        (sum,v)=>sum+Math.max(0,Math.floor(Number(v.quantity)||0)),
        0
      );

      if(mode==='positive' && totalStock<=0) continue;
      if(mode==='zero' && totalStock!==0) continue;

      const productId=Number(product.dbId)||'';
      const row={
        SKU:product.sku||'',
        Producto:product.name||'',
        'Descripción':product.description||'',
        'Categoría':product.category||'',
        Precio_Costo:costs.has(Number(product.dbId))
          ? Number(costs.get(Number(product.dbId)))
          : '',
        Precio_Venta:Number(product.price)||0,
        Activo:product.active===false?'NO':'SI',
        Total_Stock:totalStock,
        ID_Producto:productId
      };

      for(const size of sizes){
        const variant=bySize.get(key(size));
        row[`Stock_${size}`]=variant
          ? Math.max(0,Math.floor(Number(variant.quantity)||0))
          : '';
      }

      rows.push(row);
    }

    return {rows,sizes};
  }

  async function downloadStock(mode='all'){
    await requireAdmin();
    setStatus('Preparando inventario desde Supabase…');

    if(typeof loadCatalogFromSupabase==='function'){
      await loadCatalogFromSupabase();
    }

    const XLSX=await ensureXlsx();
    const costs=await loadLatestCosts();
    const {rows,sizes}=exportRows(state.products||[],costs,mode);

    if(!rows.length){
      throw new Error('No hay productos de inventario que coincidan con ese filtro.');
    }

    const headers=[
      'SKU',
      'Producto',
      'Descripción',
      'Categoría',
      'Precio_Costo',
      'Precio_Venta',
      'Activo',
      'Total_Stock',
      ...sizes.map(size=>`Stock_${size}`),
      'ID_Producto'
    ];

    const worksheet=XLSX.utils.json_to_sheet(rows,{header:headers});
    worksheet['!cols']=[
      {wch:18},{wch:32},{wch:48},{wch:20},
      {wch:15},{wch:15},{wch:10},{wch:12},
      ...sizes.map(size=>({wch:Math.max(11,Math.min(22,`Stock_${size}`.length+2))})),
      {wch:14}
    ];
    worksheet['!autofilter']={ref:worksheet['!ref']};

    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,'Stock');

    const label=
      mode==='zero'
        ? 'stock-cero'
        : mode==='positive'
          ? 'stock-mayor-cero'
          : 'stock-completo';

    XLSX.writeFile(workbook,`woman-656-${label}-${today()}.xlsx`);
    setStatus(
      `✅ Excel descargado: ${rows.length} productos. Una sola fila por SKU; las tallas están en columnas de stock.`,
      'ok'
    );
  }

  function parseWorkbookRows(file){
    return ensureXlsx().then(async XLSX=>{
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:'array'});
      const sheetName=workbook.SheetNames.includes('Stock')
        ? 'Stock'
        : workbook.SheetNames[0];

      if(!sheetName) throw new Error('El archivo no contiene hojas.');

      const rows=XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        {defval:'',raw:true}
      );

      if(!rows.length){
        throw new Error('El Excel no contiene filas de inventario.');
      }
      return rows;
    });
  }

  function parseStockHeader(header){
    const raw=normalize(header);
    const normalized=raw.toLocaleUpperCase('es-MX');
    if(normalized==='STOCK_TOTAL' || normalized==='TOTAL_STOCK') return null;
    const match=raw.match(/^stock[_\s-]+(.+)$/i);
    if(!match) return null;
    const size=normalize(match[1]);
    return size || null;
  }

  function isLegacyFormat(rows){
    const headers=Object.keys(rows[0]||{});
    const normalized=headers.map(normalizedHeader);
    return normalized.includes('TALLA') && normalized.includes('CANTIDAD');
  }

  function groupLegacyRows(rows){
    const grouped=new Map();
    const duplicates=new Set();

    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      const sku=normalize(cell(row,'SKU'));
      if(!sku) throw new Error(`Fila ${index+2}: falta SKU.`);

      const size=normalize(cell(row,'Talla','Size')) || 'UNITALLA';
      const qty=integerOrNull(cell(row,'Cantidad','Stock','Quantity'));
      if(qty===null){
        throw new Error(
          `Fila ${index+2} (${sku} ${size}): Cantidad debe ser un número mayor o igual a 0.`
        );
      }

      const groupKey=key(sku);
      if(!grouped.has(groupKey)){
        grouped.set(groupKey,{sku,rows:[]});
      }

      const duplicateKey=`${groupKey}|${key(size)}`;
      if(duplicates.has(duplicateKey)){
        throw new Error(
          `El Excel repite ${sku} talla ${size}. Deja una sola fila por SKU + talla.`
        );
      }

      duplicates.add(duplicateKey);
      grouped.get(groupKey).rows.push({
        ...row,
        __row:index+2,
        __sku:sku,
        __size:size,
        __qty:qty
      });
    }

    return grouped;
  }

  function groupWideRows(rows){
    const grouped=new Map();

    for(let index=0;index<rows.length;index++){
      const row=rows[index];
      const sku=normalize(cell(row,'SKU'));
      if(!sku) throw new Error(`Fila ${index+2}: falta SKU.`);

      const groupKey=key(sku);
      if(grouped.has(groupKey)){
        throw new Error(
          `El Excel repite el SKU ${sku}. En el formato nuevo debe existir una sola fila por SKU.`
        );
      }

      const stockEntries=[];
      const seenSizes=new Set();

      for(const [header,value] of Object.entries(row)){
        const size=parseStockHeader(header);
        if(!size) continue;
        if(value==='' || value===null || value===undefined) continue;

        const sizeKey=key(size);
        if(seenSizes.has(sizeKey)){
          throw new Error(
            `Fila ${index+2} (${sku}): hay más de una columna para la talla ${size}.`
          );
        }
        seenSizes.add(sizeKey);

        const qty=integerOrNull(value);
        if(qty===null){
          throw new Error(
            `Fila ${index+2} (${sku}) columna ${header}: el stock debe ser 0 o mayor.`
          );
        }

        stockEntries.push({
          ...row,
          __row:index+2,
          __sku:sku,
          __size:size,
          __qty:qty
        });
      }

      const metaRow={
        ...row,
        __row:index+2,
        __sku:sku,
        __size:null,
        __qty:null
      };

      grouped.set(groupKey,{
        sku,
        rows:stockEntries.length ? stockEntries : [metaRow]
      });
    }

    return grouped;
  }

  function groupRows(rows){
    return isLegacyFormat(rows)
      ? groupLegacyRows(rows)
      : groupWideRows(rows);
  }

  function commonValue(rows,names,{numeric=false,boolean=false}={}){
    const values=[];

    for(const row of rows){
      const raw=cell(row,...names);
      if(raw==='' || raw===null || raw===undefined) continue;

      const value=
        boolean
          ? yesNo(raw)
          : numeric
            ? numberOrNull(raw)
            : normalize(raw);

      if(value===null) continue;
      values.push(value);
    }

    if(!values.length) return null;

    const first=values[0];
    if(values.some(value=>String(value)!==String(first))){
      throw new Error(
        `El SKU ${rows[0].__sku} tiene valores distintos en la columna ${names[0]}.`
      );
    }

    return first;
  }

  async function loadFreshInventory(){
    const {data:products,error:productError}=
      await shopSupabase.from('shop_products').select('*');

    if(productError) throw productError;

    const ids=(products||[]).map(p=>p.id);
    let variants=[];

    if(ids.length){
      const vr=await shopSupabase
        .from('shop_product_variants')
        .select('*')
        .in('product_id',ids);

      if(vr.error) throw vr.error;
      variants=vr.data||[];
    }

    const variantIds=variants.map(v=>v.id);
    let inventory=[];

    if(variantIds.length){
      const ir=await shopSupabase
        .from('shop_inventory')
        .select('*')
        .in('variant_id',variantIds);

      if(ir.error) throw ir.error;
      inventory=ir.data||[];
    }

    const qtyByVariant=new Map(
      inventory.map(i=>[
        Number(i.variant_id),
        Math.max(0,Math.floor(Number(i.quantity)||0))
      ])
    );

    const variantsByProduct=new Map();

    for(const variant of variants){
      const pid=Number(variant.product_id);
      if(!variantsByProduct.has(pid)){
        variantsByProduct.set(pid,[]);
      }

      variantsByProduct.get(pid).push({
        ...variant,
        quantity:qtyByVariant.get(Number(variant.id))||0
      });
    }

    return {products:products||[],variantsByProduct};
  }

  async function updateAccountingCost(productId,sku,cost,price,name,category){
    if(cost===null) return;

    const payload={
      unit_cost:cost,
      real_unit_cost:cost
    };

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

    const target=
      rows.find(r=>r.source_reference==='CATALOG_AUTO') || rows[0];

    if(target){
      const q=await shopSupabase
        .from('purchase_items')
        .update(payload)
        .eq('id',target.id);

      if(q.error) throw q.error;
      return;
    }

    const insert={
      invoice_id:null,
      shop_product_id:productId,
      source_reference:'EXCEL_STOCK',
      sku,
      description:name||sku,
      category:category||'NOVEDADES',
      quantity:1,
      unit_cost:cost,
      tax_rate:16,
      tax_included:false,
      tax_creditable:false,
      shipping_allocated:0,
      duties_allocated:0,
      other_allocated:0,
      margin_percent:50,
      real_unit_cost:cost,
      suggested_price:price||0,
      final_price:price||0,
      import_status:'ready'
    };

    const q=await shopSupabase.from('purchase_items').insert(insert);
    if(q.error) throw q.error;
  }

  async function importStock(file){
    await requireAdmin();
    setStatus('Leyendo y validando Excel…');

    const rows=await parseWorkbookRows(file);
    const legacy=isLegacyFormat(rows);
    const groups=groupRows(rows);
    const fresh=await loadFreshInventory();

    const productBySku=new Map(
      fresh.products.map(p=>[key(p.sku),p])
    );

    let productsCreated=0;
    let productsUpdated=0;
    let variantsCreated=0;
    let stockChanges=0;

    for(const [skuKey,group] of groups){
      const name=commonValue(group.rows,['Producto','Nombre']);
      const description=commonValue(
        group.rows,
        ['Descripción','Descripcion']
      );
      const category=commonValue(
        group.rows,
        ['Categoría','Categoria']
      );
      const salePrice=commonValue(
        group.rows,
        ['Precio_Venta','Precio Venta','Precio_MXN'],
        {numeric:true}
      );
      const costPrice=commonValue(
        group.rows,
        ['Precio_Costo','Precio Costo','Costo'],
        {numeric:true}
      );
      const active=commonValue(
        group.rows,
        ['Activo'],
        {boolean:true}
      );

      let product=productBySku.get(skuKey);

      if(!product){
        if(!name){
          throw new Error(
            `SKU ${group.sku}: para crear un producto nuevo falta Producto.`
          );
        }
        if(!category){
          throw new Error(
            `SKU ${group.sku}: para crear un producto nuevo falta Categoría.`
          );
        }
        if(salePrice===null || salePrice<0){
          throw new Error(
            `SKU ${group.sku}: para crear un producto nuevo falta Precio_Venta válido.`
          );
        }

        const payload={
          sku:group.sku.toLocaleUpperCase('es-MX'),
          name,
          category,
          description:description||null,
          price:salePrice,
          compare_at_price:null,
          currency:'MXN',
          active:active===null?true:active
        };

        const ins=await shopSupabase
          .from('shop_products')
          .insert(payload)
          .select('*')
          .single();

        if(ins.error) throw ins.error;

        product=ins.data;
        productBySku.set(skuKey,product);
        fresh.variantsByProduct.set(Number(product.id),[]);
        productsCreated++;
      }else{
        const patch={};

        if(name!==null && name!==product.name) patch.name=name;
        if(
          description!==null &&
          description!==String(product.description||'')
        ){
          patch.description=description||null;
        }
        if(category!==null && category!==product.category){
          patch.category=category;
        }
        if(
          salePrice!==null &&
          Number(product.price)!==Number(salePrice)
        ){
          patch.price=salePrice;
        }
        if(
          active!==null &&
          Boolean(product.active)!==active
        ){
          patch.active=active;
        }

        if(Object.keys(patch).length){
          const up=await shopSupabase
            .from('shop_products')
            .update(patch)
            .eq('id',product.id)
            .select('*')
            .single();

          if(up.error) throw up.error;

          product=up.data;
          productBySku.set(skuKey,product);
          productsUpdated++;
        }
      }

      await updateAccountingCost(
        Number(product.id),
        product.sku,
        costPrice,
        salePrice,
        name||product.name,
        category||product.category
      );

      const variants=
        fresh.variantsByProduct.get(Number(product.id))||[];

      const bySize=new Map(
        variants.map(v=>[key(v.size||'UNITALLA'),v])
      );

      for(const row of group.rows){
        if(!row.__size || row.__qty===null) continue;

        const size=row.__size;
        const next=row.__qty;
        let variant=bySize.get(key(size));

        if(!variant){
          const variantSku=`${product.sku}-${size}`;

          const ins=await shopSupabase
            .from('shop_product_variants')
            .insert({
              product_id:product.id,
              variant_sku:variantSku,
              size,
              color:null,
              active:true
            })
            .select('*')
            .single();

          if(ins.error){
            throw new Error(
              `${product.sku} talla ${size}: ${ins.error.message}`
            );
          }

          variant={...ins.data,quantity:0};
          bySize.set(key(size),variant);
          variants.push(variant);
          variantsCreated++;
        }

        const previous=Math.max(
          0,
          Math.floor(Number(variant.quantity)||0)
        );

        if(previous===next) continue;

        const up=await shopSupabase
          .from('shop_inventory')
          .upsert(
            {variant_id:variant.id,quantity:next},
            {onConflict:'variant_id'}
          );

        if(up.error) throw up.error;

        const movement=await shopSupabase
          .from('shop_inventory_movements')
          .insert({
            variant_id:variant.id,
            movement_type:'excel_adjustment',
            quantity:next-previous,
            previous_stock:previous,
            new_stock:next,
            reason:'Actualización de stock desde Excel',
            reference:product.sku
          });

        if(movement.error) throw movement.error;

        variant.quantity=next;
        stockChanges++;
      }
    }

    if(typeof loadCatalogFromSupabase==='function'){
      await loadCatalogFromSupabase();
    }

    setStatus(
      `✅ Excel aplicado (${legacy?'formato anterior':'una fila por SKU'}): ` +
      `${productsCreated} productos nuevos, ${productsUpdated} productos actualizados, ` +
      `${variantsCreated} tallas nuevas y ${stockChanges} cambios de stock.`,
      'ok'
    );
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
        <div>
          <strong>📊 Excel de inventario</strong>
          <span>
            Descarga una sola fila por SKU. Las existencias aparecen en columnas
            Stock_XS, Stock_S, Stock_M, Stock_G, Stock_XG, etc. Un espacio vacío
            significa que esa talla no existe; 0 significa que la talla existe pero
            está agotada.
          </span>
        </div>
      </div>
      <div class="admin-excel-actions">
        <button type="button" class="secondary-btn" data-stock-export="all">
          Descargar todo
        </button>
        <button type="button" class="secondary-btn" data-stock-export="positive">
          Stock &gt; 0
        </button>
        <button type="button" class="secondary-btn" data-stock-export="zero">
          Stock = 0
        </button>
        <button type="button" class="primary-btn" id="adminImportStockExcel">
          Cargar / actualizar Excel
        </button>
        <input
          type="file"
          id="adminStockExcelFile"
          accept=".xlsx,.xls,.csv"
          hidden
        >
      </div>
      <div id="adminExcelStatus" class="admin-excel-status">
        Columnas base: SKU · Producto · Descripción · Categoría · Precio_Costo ·
        Precio_Venta · Activo · Total_Stock · Stock_por_talla.
      </div>`;

    actions.insertAdjacentElement('afterend',box);

    const style=document.createElement('style');
    style.textContent=`
      .admin-excel-inventory{
        margin-top:12px;padding:14px;border:1px solid var(--border);
        border-radius:12px;background:#f7f8f6
      }
      .admin-excel-head strong{display:block;font-size:14px}
      .admin-excel-head span{
        display:block;margin-top:4px;color:var(--muted);
        font-size:11px;line-height:1.45
      }
      .admin-excel-actions{
        display:flex;gap:8px;flex-wrap:wrap;margin-top:11px
      }
      .admin-excel-status{
        margin-top:9px;font-size:11px;color:var(--muted)
      }
      .admin-excel-status[data-type="ok"]{color:#527160}
      .admin-excel-status[data-type="error"]{color:#9b4f4f}
    `;
    document.head.appendChild(style);

    box.querySelectorAll('[data-stock-export]').forEach(
      button=>button.addEventListener('click',async()=>{
        button.disabled=true;
        try{
          await downloadStock(button.dataset.stockExport);
        }catch(error){
          console.error(error);
          setStatus(`❌ ${error.message||error}`,'error');
          alert(error.message||error);
        }finally{
          button.disabled=false;
        }
      })
    );

    const fileInput=document.getElementById('adminStockExcelFile');

    document
      .getElementById('adminImportStockExcel')
      .addEventListener('click',()=>fileInput.click());

    fileInput.addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      event.target.value='';
      if(!file) return;

      const button=document.getElementById('adminImportStockExcel');
      button.disabled=true;

      try{
        const ok=confirm(
          'El Excel actualizará el stock FINAL por SKU y talla.\n\n' +
          'En el formato nuevo hay una sola fila por SKU y cada talla tiene su columna Stock_TALLA.\n\n' +
          '0 = la talla queda en cero.\n' +
          'Celda vacía = esa talla no se modifica / no existe en esa fila.\n\n' +
          'También puedes crear una talla nueva agregando una columna como Stock_XXL y escribiendo una cantidad.\n\n' +
          '¿Continuar?'
        );

        if(!ok) return;
        await importStock(file);
      }catch(error){
        console.error(error);
        setStatus(`❌ ${error.message||error}`,'error');
        alert(error.message||error);
      }finally{
        button.disabled=false;
      }
    });

    return true;
  }

  let attempts=0;

  function install(){
    attempts++;
    if(ensureUi()) return;
    if(attempts<100) setTimeout(install,100);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
