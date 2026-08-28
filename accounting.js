const SUPABASE_URL="https://snkuvxpddxcmbfhgabbx.supabase.co";
const SUPABASE_KEY="sb_publishable_z2Z7BluzsEpaqPxyYWTxjg_kkcme7xK";
if(localStorage.getItem("woman656-auth-token-v1")===null && localStorage.getItem("moda-juarez-auth-token-v2")!==null){
  localStorage.setItem("woman656-auth-token-v1",localStorage.getItem("moda-juarez-auth-token-v2"));
}
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:"woman656-auth-token-v1"
  }
});
const $=id=>document.getElementById(id); const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(n)||0);
const categories=["NOVEDADES","VESTIDOS","FALDAS","SHORTS","BLUSAS","TOPS","ROPA INTERIOR","ACCESORIOS"];
let invoices=[],items=[];
const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function calc(i){const productCost=Number(i.unit_cost)||0,rate=(Number(i.tax_rate)||0)/100,imports=Number(i.shipping_allocated)||0,duties=Number(i.duties_allocated)||0,other=Number(i.other_allocated)||0;const tax=i.tax_included?0:productCost*rate;const real=productCost+tax+imports+duties+other;const rounding=Number(i.rounding)||1;const suggested=Math.ceil((real*(1+(Number(i.margin_percent)||0)/100))/rounding)*rounding;return{real,suggested,tax}}
function summary(){const cost=items.reduce((s,i)=>s+calc(i).real*(Number(i.quantity)||0),0),revenue=items.reduce((s,i)=>s+(Number(i.final_price)||calc(i).suggested)*(Number(i.quantity)||0),0);$("summary").innerHTML=`<div class="metric"><b>${invoices.length}</b>facturas</div><div class="metric"><b>${money(cost)}</b>costo inventario</div><div class="metric"><b>${money(revenue)}</b>venta esperada</div>`}
function itemRow(i){const c=calc(i);return `<tr data-id="${i.id}"><td><input class="name" data-k="description" value="${esc(i.description)}"></td><td><input data-k="sku" placeholder="SKU" value="${esc(i.sku)}"></td><td><select data-k="category">${categories.map(x=>`<option ${x===i.category?'selected':''}>${x}</option>`)}</select></td><td><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td><td><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td><td><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td><td><input data-k="tax_rate" type="number" min="0" max="100" step=".001" value="${i.tax_rate}"><label class="checks"><input data-k="tax_included" type="checkbox" ${i.tax_included?'checked':''}> ya incluido</label></td><td><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${i.shipping_allocated||0}"></td><td><input data-k="duties_allocated" type="number" min="0" step=".01" value="${i.duties_allocated||0}"></td><td><input data-k="other_allocated" type="number" min="0" step=".01" value="${i.other_allocated||0}"></td><td><input data-k="margin_percent" type="number" min="0" max="1000" value="${i.margin_percent}">%</td><td>${money(c.real)}<small>IVA sumado: ${money(c.tax)}</small></td><td><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"><small>sug. ${money(c.suggested)}</small></td><td><button data-save>Guardar</button><button data-apply>Aplicar</button></td></tr>`}
function render(){$("itemsBody").innerHTML=items.map(itemRow).join("")||`<tr><td colspan="10">Selecciona una factura o agrega una partida.</td></tr>`;$("invoiceList").innerHTML=invoices.map(x=>`<div class="invoice"><span><b>${esc(x.supplier)}</b> · ${esc(x.invoice_number||'sin folio')} · ${esc(x.invoice_date||'sin fecha')}</span><span>${money(x.grand_total)} <button data-invoice="${x.id}">Ver partidas</button></span></div>`).join("")||"Sin facturas";summary()}
async function guard(){const {data:{session}}=await db.auth.getSession();if(!session)return false;const {data}=await db.from("profiles").select("role").eq("id",session.user.id).maybeSingle();return data?.role==="admin"}
async function load(){const a=await db.from("purchase_invoices").select("*").order("created_at",{ascending:false});if(a.error)throw a.error;invoices=a.data||[];const b=await db.from("purchase_items").select("*").order("created_at");if(b.error)throw b.error;items=b.data||[];render()}
async function boot(){try{if(!await guard())return;$("restricted").hidden=true;$("workspace").hidden=false;await load()}catch(e){$("restricted").innerHTML=`<h1>Configuración pendiente</h1><p class="error">${esc(e.message)}</p><p>Ejecuta las migraciones 006 y 007 en Supabase.</p>`}}
$("invoiceForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),file=f.get("pdf");if(file.size>20971520)return $("invoiceStatus").textContent="PDF mayor a 20 MB";const id=crypto.randomUUID(),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=`invoices/${new Date().getFullYear()}/${id}-${safe}`;$("invoiceStatus").textContent="Guardando…";const up=await db.storage.from("accounting-documents").upload(path,file,{contentType:"application/pdf"});if(up.error)return $("invoiceStatus").textContent=up.error.message;const row={supplier:f.get("supplier"),invoice_number:f.get("invoice_number")||null,invoice_date:f.get("invoice_date")||null,currency:f.get("currency"),exchange_rate:Number(f.get("exchange_rate")),grand_total:Number(f.get("grand_total")),pdf_path:path,original_filename:file.name};const q=await db.from("purchase_invoices").insert(row);if(q.error){await db.storage.from("accounting-documents").remove([path]);return $("invoiceStatus").textContent=q.error.message}$("invoiceStatus").textContent="✅ Factura guardada en privado";e.target.reset();await load()};
$("addItemBtn").onclick=async()=>{if(!invoices.length)return alert("Primero guarda una factura.");const q=await db.from("purchase_items").insert({invoice_id:invoices[0].id,description:"Producto nuevo",quantity:1,unit_cost:0,tax_rate:16,tax_included:true,tax_creditable:false,margin_percent:50}).select().single();if(q.error)return alert(q.error.message);await load()};
$("invoiceList").onclick=async e=>{const id=e.target.dataset.invoice;if(!id)return;const q=await db.from("purchase_items").select("*").eq("invoice_id",id).order("created_at");items=q.data||[];render()};
$("itemsBody").onchange=e=>{const tr=e.target.closest("tr"),i=items.find(x=>x.id===tr?.dataset.id);if(!i)return;const k=e.target.dataset.k;if(k)i[k]=e.target.type==="checkbox"?e.target.checked:e.target.value;render()};

function syncItemFromRow(item,row){
  row.querySelectorAll("[data-k]").forEach(input=>{
    item[input.dataset.k]=input.type==="checkbox" ? input.checked : input.value;
  });
  item.sku=String(item.sku||"").trim();
  return item;
}

function accountingPayload(item){
  const c=calc(item);
  return {
    description:item.description,
    sku:item.sku||null,
    category:item.category,
    size:item.size||null,
    quantity:Number(item.quantity),
    unit_cost:Number(item.unit_cost),
    tax_rate:Number(item.tax_rate),
    tax_included:!!item.tax_included,
    tax_creditable:false,
    shipping_allocated:Number(item.shipping_allocated)||0,
    duties_allocated:Number(item.duties_allocated)||0,
    other_allocated:Number(item.other_allocated)||0,
    margin_percent:Number(item.margin_percent),
    real_unit_cost:c.real,
    suggested_price:c.suggested,
    final_price:Number(item.final_price)||c.suggested,
    import_status:"ready"
  };
}

function explainApplyError(error,sku){
  const message=String(error?.message||error||"Error desconocido");
  if(message.includes("No se encontró")){
    return `${message}\n\nQué hacer: verifica que ${sku||"el SKU"} sea idéntico en Contabilidad y en Editar producto.`;
  }
  if(/row-level security|permission|policy|jwt|session/i.test(message)){
    return `Supabase rechazó el cambio por sesión o permisos.\n\nQué hacer: vuelve a entrar como ADMIN y repite Guardar y Aplicar.\n\nDetalle: ${message}`;
  }
  return `El precio NO se actualizó.\n\nQué hacer: conserva esta partida, recarga Contabilidad, vuelve a entrar como ADMIN y reintenta.\n\nDetalle: ${message}`;
}

async function saveAccountingItem(item,row,{reload=true}={}){
  syncItemFromRow(item,row);
  if(!item.sku) throw new Error("Falta el SKU de la partida.");
  const payload=accountingPayload(item);
  const {data,error}=await db.from("purchase_items")
    .update(payload)
    .eq("id",item.id)
    .select("id,sku,final_price")
    .single();
  if(error) throw error;
  if(!data || String(data.sku||"").trim()!==item.sku){
    throw new Error("Supabase no confirmó el guardado de la partida contable.");
  }
  Object.assign(item,payload,data);
  if(reload) await load();
  return data;
}

async function applyAccountingPrice(item,row){
  await saveAccountingItem(item,row,{reload:false});
  const sku=String(item.sku||"").trim();
  const price=Number(item.final_price)||calc(item).suggested;

  const {data:matches,error:findError}=await db.from("shop_products")
    .select("id,sku,price,category")
    .eq("sku",sku)
    .limit(2);
  if(findError) throw findError;
  if(!matches?.length) throw new Error(`No se encontró el SKU ${sku} en el catálogo de la tienda.`);
  if(matches.length>1) throw new Error(`Hay más de un producto con el SKU ${sku}; no se aplicó el precio para evitar modificar el producto equivocado.`);

  const product=matches[0];
  const {data:updated,error:updateError}=await db.from("shop_products")
    .update({price,category:item.category})
    .eq("id",product.id)
    .eq("sku",sku)
    .select("id,sku,price,category")
    .single();
  if(updateError) throw updateError;

  const {data:verified,error:verifyError}=await db.from("shop_products")
    .select("id,sku,price,category")
    .eq("id",product.id)
    .single();
  if(verifyError) throw verifyError;
  if(!verified || Math.abs(Number(verified.price)-price)>0.001){
    throw new Error(`Supabase devolvió ${money(verified?.price)} en lugar de ${money(price)}. El cambio no quedó confirmado.`);
  }

  const {error:linkError}=await db.from("purchase_items")
    .update({shop_product_id:product.id,final_price:price})
    .eq("id",item.id);
  if(linkError) throw linkError;

  Object.assign(item,{shop_product_id:product.id,final_price:price});
  return {sku:updated.sku,price:Number(verified.price),category:verified.category};
}

$("itemsBody").onclick=async e=>{
  const button=e.target.closest("button");
  const row=e.target.closest("tr");
  const item=items.find(x=>x.id===row?.dataset.id);
  if(!button||!item)return;

  if(button.hasAttribute("data-save")){
    button.disabled=true;
    try{
      const saved=await saveAccountingItem(item,row);
      alert(`✅ Partida guardada.\nSKU: ${saved.sku}\nPrecio final: ${money(saved.final_price)}\n\nEste paso todavía no modifica la tienda. Pulsa Aplicar.`);
    }catch(error){
      console.error(error);
      alert(`❌ La partida NO se guardó.\n\n${explainApplyError(error,item.sku)}`);
    }finally{button.disabled=false;}
  }

  if(button.hasAttribute("data-apply")){
    syncItemFromRow(item,row);
    const intendedPrice=Number(item.final_price)||calc(item).suggested;
    if(!confirm(`¿Aplicar ${money(intendedPrice)} al SKU ${item.sku||"sin SKU"}?`))return;
    button.disabled=true;
    try{
      const result=await applyAccountingPrice(item,row);
      alert(`✅ PRECIO ACTUALIZADO Y VERIFICADO\n\nSKU: ${result.sku}\nPrecio confirmado en Supabase: ${money(result.price)}\nCategoría: ${result.category}\n\nAbre o recarga la tienda. No necesitas publicar GitHub para este cambio de precio.`);
      await load();
    }catch(error){
      console.error(error);
      alert(`❌ EL PRECIO NO SE ACTUALIZÓ\n\n${explainApplyError(error,item.sku)}`);
    }finally{button.disabled=false;}
  }
};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();location.href="index.html?admin=1"};boot();
