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
const categories=["NOVEDADES","CONJUNTOS","VESTIDOS","FALDAS","SHORTS","PANTALONES","JEANS","LEGGINGS","BLUSAS","TOPS","PLAYERAS","SUDADERAS","CHAQUETAS","ROPA INTERIOR","TRAJES DE BAÑO","ACCESORIOS","CALZADO","OTROS"];
let invoices=[],items=[],settings={},transactions=[],entries=[],entryLines=[],accounts=[],trial=[],shopProducts=[];
const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function calc(i){
  const paid=Number(i.unit_cost)||0,rate=(Number(i.tax_rate)||0)/100;
  const tax=i.tax_included?paid-(paid/(1+rate)):paid*rate;
  const base=i.tax_included?paid-tax:paid;
  const extras=(Number(i.shipping_allocated)||0)+(Number(i.duties_allocated)||0)+(Number(i.other_allocated)||0);
  const creditable=!!i.tax_creditable;
  const real=base+extras+(creditable?0:tax);
  const rounding=Number(i.rounding||settings.price_rounding)||1;
  const suggested=Math.ceil((real*(1+(Number(i.margin_percent)||0)/100))/rounding)*rounding;
  return{base,tax,creditableTax:creditable?tax:0,real,suggested};
}
function summary(){const cost=items.reduce((s,i)=>s+calc(i).real*(Number(i.quantity)||0),0),revenue=items.reduce((s,i)=>s+(Number(i.final_price)||calc(i).suggested)*(Number(i.quantity)||0),0);$("summary").innerHTML=`<div class="metric"><b>${invoices.length}</b>facturas</div><div class="metric"><b>${money(cost)}</b>costo inventario</div><div class="metric"><b>${money(revenue)}</b>venta esperada</div>`}
function itemRow(i){const c=calc(i);return `<tr data-id="${i.id}"><td><input class="name" data-k="description" value="${esc(i.description)}"></td><td><input data-k="sku" placeholder="SKU" value="${esc(i.sku)}"></td><td><select data-k="category">${categories.map(x=>`<option ${x===i.category?'selected':''}>${x}</option>`)}</select></td><td><input data-k="size" placeholder="Talla" value="${esc(i.size)}"></td><td><input data-k="quantity" type="number" min="1" value="${i.quantity}"></td><td><input data-k="unit_cost" type="number" min="0" step=".01" value="${i.unit_cost}"></td><td><input data-k="tax_rate" type="number" min="0" max="100" step=".001" value="${i.tax_rate}"><label class="checks"><input data-k="tax_included" type="checkbox" ${i.tax_included?'checked':''}> incluido</label><label class="checks"><input data-k="tax_creditable" type="checkbox" ${i.tax_creditable?'checked':''}> acreditable</label></td><td><input data-k="shipping_allocated" type="number" min="0" step=".01" value="${i.shipping_allocated||0}"></td><td><input data-k="duties_allocated" type="number" min="0" step=".01" value="${i.duties_allocated||0}"></td><td><input data-k="other_allocated" type="number" min="0" step=".01" value="${i.other_allocated||0}"></td><td><input data-k="margin_percent" type="number" min="0" max="1000" value="${i.margin_percent}">%</td><td>${money(c.real)}<small>IVA acreditable: ${money(c.creditableTax)}</small></td><td><input data-k="final_price" type="number" min="0" step=".01" value="${i.final_price||c.suggested}"><small>sug. ${money(c.suggested)}</small></td><td><button data-save>Guardar</button><button data-apply>Aplicar</button></td></tr>`}
function render(){
  $("itemsBody").innerHTML=items.map(itemRow).join("")||`<tr><td colspan="14">Selecciona una factura o agrega una partida.</td></tr>`;
  $("invoiceList").innerHTML=invoices.map(x=>`<div class="invoice"><span><b>${esc(x.supplier)}</b> · ${esc(x.invoice_number||'sin folio')} · ${esc(x.invoice_date||'sin fecha')}</span><span>${money(x.grand_total)} <button data-invoice="${x.id}">Ver partidas</button> <button data-post-invoice="${x.id}">Contabilizar</button></span></div>`).join("")||"Sin facturas";
  summary(); renderOperations(); renderLedger(); renderReports(); fillSettings();
}
async function guard(){const {data:{session}}=await db.auth.getSession();if(!session)return false;const {data}=await db.from("profiles").select("role").eq("id",session.user.id).maybeSingle();return data?.role==="admin"}
async function query(table,options={}){let q=db.from(table).select(options.select||"*");if(options.order)q=q.order(options.order,{ascending:options.ascending??false});const r=await q;if(r.error)throw r.error;return r.data||[]}
async function load(){
  const [a,b,s,t,e,l,ac,tr,p]=await Promise.all([
    query("purchase_invoices",{order:"created_at"}),query("purchase_items",{order:"created_at",ascending:true}),
    db.from("pricing_settings").select("*").eq("id",1).single(),query("accounting_transactions",{order:"operation_date"}),
    query("accounting_entries",{order:"entry_date"}),query("accounting_entry_lines",{order:"id",ascending:true}),
    query("accounting_accounts",{order:"code",ascending:true}),query("accounting_trial_balance",{order:"code",ascending:true}),
    query("shop_products",{order:"sku",ascending:true})
  ]);
  if(s.error)throw s.error;
  shopProducts=p;
  const productById=new Map(shopProducts.map(product=>[Number(product.id),product]));
  invoices=a;
  items=b.map(item=>{
    const linked=productById.get(Number(item.shop_product_id));
    if(!linked)return item;
    return {...item,purchase_source_sku:item.sku,sku:linked.sku||item.sku,description:linked.name||item.description,category:linked.category||item.category};
  });
  settings=s.data||{};transactions=t;entries=e;entryLines=l;accounts=ac;trial=tr;render();
}
async function boot(){try{if(!await guard())return;$("restricted").hidden=true;$("workspace").hidden=false;const today=new Date().toISOString().slice(0,10);$("operationForm").operation_date.value=today;$("reportFrom").value=`${today.slice(0,4)}-01-01`;$("reportTo").value=today;await load()}catch(e){$("restricted").innerHTML=`<h1>Configuración pendiente</h1><p class="error">${esc(e.message)}</p><p>Ejecuta las migraciones 006, 010 y 011 en Supabase.</p>`}}
$("invoiceForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),file=f.get("pdf");if(file.size>20971520)return $("invoiceStatus").textContent="PDF mayor a 20 MB";const id=crypto.randomUUID(),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=`invoices/${new Date().getFullYear()}/${id}-${safe}`;$("invoiceStatus").textContent="Guardando…";const up=await db.storage.from("accounting-documents").upload(path,file,{contentType:"application/pdf"});if(up.error)return $("invoiceStatus").textContent=up.error.message;const row={supplier:f.get("supplier"),invoice_number:f.get("invoice_number")||null,invoice_date:f.get("invoice_date")||null,currency:f.get("currency"),exchange_rate:Number(f.get("exchange_rate")),grand_total:Number(f.get("grand_total")),pdf_path:path,original_filename:file.name};const q=await db.from("purchase_invoices").insert(row);if(q.error){await db.storage.from("accounting-documents").remove([path]);return $("invoiceStatus").textContent=q.error.message}$("invoiceStatus").textContent="✅ Factura guardada en privado";e.target.reset();await load()};
$("addItemBtn").onclick=async()=>{if(!invoices.length)return alert("Primero guarda una factura.");const q=await db.from("purchase_items").insert({invoice_id:invoices[0].id,description:"Producto nuevo",quantity:1,unit_cost:0,tax_rate:Number(settings.sales_tax_rate)||16,tax_included:false,tax_creditable:true,margin_percent:Number(settings.default_margin_percent)||50}).select().single();if(q.error)return alert(q.error.message);await load()};
$("invoiceList").onclick=async e=>{
  const id=e.target.dataset.invoice;if(id){const q=await db.from("purchase_items").select("*").eq("invoice_id",id).order("created_at");items=q.data||[];render();return}
  const postId=e.target.dataset.postInvoice;if(!postId)return;
  const invoice=invoices.find(x=>x.id===postId),q=await db.from("purchase_items").select("*").eq("invoice_id",postId);if(q.error)return alert(q.error.message);
  const its=q.data||[];if(!its.length)return alert("Esta factura no tiene partidas.");
  const ref=invoice.invoice_number||`FACTURA-${invoice.id.slice(0,8)}`,duplicate=transactions.find(t=>t.operation_type==="purchase"&&t.reference===ref&&t.status==="posted");
  if(duplicate)return alert(`✅ Esta factura ya fue contabilizada con la referencia ${ref}.`);
  let subtotal=0,tax=0;its.forEach(i=>{const c=calc(i),qty=Number(i.quantity)||0;subtotal+=c.real*qty;tax+=c.creditableTax*qty});subtotal=Number(subtotal.toFixed(2));tax=Number(tax.toFixed(2));
  if(!confirm(`Se generará una póliza de compra.\n\nBase/costo: ${money(subtotal)}\nIVA acreditable: ${money(tax)}\nTotal: ${money(subtotal+tax)}\n\n¿Continuar?`))return;
  const payload={operation_date:invoice.invoice_date||new Date().toISOString().slice(0,10),operation_type:"purchase",channel:"direct",reference:ref,customer_or_supplier:invoice.supplier,subtotal,tax_rate:Number(settings.sales_tax_rate)||16,tax_amount:tax,total:Number((subtotal+tax).toFixed(2)),notes:`Factura ${invoice.original_filename||ref}`,status:"posted"};
  const ins=await db.from("accounting_transactions").insert(payload).select().single();if(ins.error)return alert(`❌ ${ins.error.message}`);
  const posted=await db.rpc("post_accounting_transaction",{p_transaction:ins.data.id});if(posted.error){await db.from("accounting_transactions").delete().eq("id",ins.data.id);return alert(`❌ No se generó la póliza: ${posted.error.message}`)}
  alert(`✅ Factura contabilizada.\nReferencia: ${ref}\nIVA acreditable: ${money(tax)}`);await load();
};
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
    tax_creditable:!!item.tax_creditable,
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

  let lookup=db.from("shop_products").select("id,sku,price,category");
  lookup=item.shop_product_id ? lookup.eq("id",item.shop_product_id) : lookup.eq("sku",sku);
  const {data:matches,error:findError}=await lookup.limit(2);
  if(findError) throw findError;
  if(!matches?.length) throw new Error(`No se encontró el producto vinculado al SKU ${sku} en el catálogo de la tienda.`);
  if(matches.length>1) throw new Error(`Hay más de un producto con el SKU ${sku}; no se aplicó el precio para evitar modificar el producto equivocado.`);

  const product=matches[0];
  const {data:updated,error:updateError}=await db.from("shop_products")
    .update({price,category:item.category})
    .eq("id",product.id)
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
    .update({shop_product_id:product.id,sku:updated.sku,description:item.description,category:item.category,final_price:price})
    .eq("id",item.id);
  if(linkError) throw linkError;

  Object.assign(item,{shop_product_id:product.id,sku:updated.sku,final_price:price});
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

function fillSettings(){
  const f=$("settingsForm"); if(!f)return;
  ["fiscal_regime","sales_tax_rate","income_tax_rate","platform_isr_withholding_rate","platform_vat_withholding_rate"].forEach(k=>{if(f.elements[k])f.elements[k].value=settings[k]??0});
  f.elements.border_stimulus_enabled.checked=!!settings.border_stimulus_enabled;
  $("operationForm").elements.tax_rate.value=settings.sales_tax_rate??16;
}

document.querySelector(".tabs").onclick=e=>{
  const b=e.target.closest("button[data-tab]");if(!b)return;
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("active",x===b));
  document.querySelectorAll(".tabPanel").forEach(x=>x.hidden=x.id!==b.dataset.tab);
};

$("settingsForm").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),status=$("settingsStatus");status.textContent="Guardando…";
  const payload={fiscal_regime:f.get("fiscal_regime"),sales_tax_rate:Number(f.get("sales_tax_rate")),default_tax_rate:Number(f.get("sales_tax_rate")),income_tax_rate:Number(f.get("income_tax_rate")),platform_isr_withholding_rate:Number(f.get("platform_isr_withholding_rate")),platform_vat_withholding_rate:Number(f.get("platform_vat_withholding_rate")),border_stimulus_enabled:f.get("border_stimulus_enabled")==="on"};
  if(payload.border_stimulus_enabled&&payload.sales_tax_rate!==8&&!confirm("El estímulo fronterizo está marcado, pero el IVA no es 8%. ¿Guardar de todos modos?"))return;
  const q=await db.from("pricing_settings").update(payload).eq("id",1).select().single();
  if(q.error){status.className="status-error";status.textContent=`❌ ${q.error.message}`;return}
  settings=q.data;status.className="status-ok";status.textContent="✅ Configuración guardada. Solo afecta operaciones nuevas.";fillSettings();
};

$("operationForm").onchange=e=>{
  if(e.target.name==="channel"&&e.target.value==="platform"){
    const f=e.currentTarget,subtotal=Number(f.subtotal.value)||0,tax=subtotal*(Number(f.tax_rate.value)||0)/100;
    if(!Number(f.isr_withheld.value))f.isr_withheld.value=(subtotal*(Number(settings.platform_isr_withholding_rate)||0)/100).toFixed(2);
    if(!Number(f.vat_withheld.value))f.vat_withheld.value=(tax*(Number(settings.platform_vat_withholding_rate)||0)/100).toFixed(2);
  }
};

$("operationForm").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),status=$("operationStatus"),subtotal=Number(f.get("subtotal")),rate=Number(f.get("tax_rate")),tax=Number((subtotal*rate/100).toFixed(2));
  const payload={operation_date:f.get("operation_date"),operation_type:f.get("operation_type"),channel:f.get("channel"),reference:f.get("reference")||null,customer_or_supplier:f.get("customer_or_supplier")||null,subtotal,tax_rate:rate,tax_amount:tax,total:Number((subtotal+tax).toFixed(2)),cost_amount:Number(f.get("cost_amount"))||0,platform_fee:Number(f.get("platform_fee"))||0,isr_withheld:Number(f.get("isr_withheld"))||0,vat_withheld:Number(f.get("vat_withheld"))||0,notes:f.get("notes")||null,status:"posted"};
  if(payload.platform_fee+payload.isr_withheld+payload.vat_withheld>payload.total){status.textContent="❌ Comisiones y retenciones superan el total.";return}
  status.textContent="Registrando…";const ins=await db.from("accounting_transactions").insert(payload).select().single();
  if(ins.error){status.className="status-error";status.textContent=`❌ ${ins.error.message}`;return}
  const posted=await db.rpc("post_accounting_transaction",{p_transaction:ins.data.id});
  if(posted.error){await db.from("accounting_transactions").delete().eq("id",ins.data.id);status.className="status-error";status.textContent=`❌ No se generó la póliza: ${posted.error.message}`;return}
  status.className="status-ok";status.textContent=`✅ Operación y póliza registradas. IVA histórico: ${rate}%.`;
  e.target.reset();e.target.operation_date.value=new Date().toISOString().slice(0,10);e.target.tax_rate.value=settings.sales_tax_rate??16;await load();
};

function renderOperations(){
  $("operationList").innerHTML=`<table class="compact"><thead><tr><th>Fecha</th><th>Tipo</th><th>Canal</th><th>Referencia</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Estado</th></tr></thead><tbody>${transactions.map(t=>`<tr><td>${esc(t.operation_date)}</td><td>${esc(t.operation_type)}</td><td>${esc(t.channel)}</td><td>${esc(t.reference||"")}</td><td>${money(t.subtotal)}</td><td>${money(t.tax_amount)} (${Number(t.tax_rate)}%)</td><td>${money(t.total)}</td><td>${esc(t.status)}</td></tr>`).join("")||'<tr><td colspan="8">Sin operaciones.</td></tr>'}</tbody></table>`;
}

function accountByCode(code){return accounts.find(a=>a.code===code)||{code,name:code,account_type:""}}
function renderLedger(){
  const lineRows=[];
  entries.forEach(en=>entryLines.filter(l=>l.entry_id===en.id).forEach(l=>lineRows.push({...l,entry_date:en.entry_date,entry_number:en.entry_number,concept:en.concept})));
  $("journal").innerHTML=`<div class="tableWrap"><table class="compact"><thead><tr><th>Póliza</th><th>Fecha</th><th>Concepto</th><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead><tbody>${lineRows.map(l=>`<tr><td>${l.entry_number}</td><td>${esc(l.entry_date)}</td><td>${esc(l.concept)}</td><td>${esc(l.account_code)} · ${esc(accountByCode(l.account_code).name)}</td><td>${money(l.debit)}</td><td>${money(l.credit)}</td></tr>`).join("")||'<tr><td colspan="6">Sin pólizas.</td></tr>'}</tbody></table></div>`;
  $("tAccounts").innerHTML=accounts.map(a=>{const ls=lineRows.filter(l=>l.account_code===a.code),debit=ls.reduce((s,l)=>s+Number(l.debit),0),credit=ls.reduce((s,l)=>s+Number(l.credit),0);if(!debit&&!credit)return"";return `<article class="tAccount"><h4>${esc(a.code)} · ${esc(a.name)}</h4><table><thead><tr><th>Debe</th><th>Haber</th></tr></thead><tbody>${ls.map(l=>`<tr><td>${Number(l.debit)?money(l.debit):""}</td><td>${Number(l.credit)?money(l.credit):""}</td></tr>`).join("")}</tbody></table><div class="balance"><b>Saldo</b><span>${money(a.normal_balance==="credit"?credit-debit:debit-credit)} ${a.normal_balance==="credit"?"acreedor":"deudor"}</span></div></article>`}).join("")||"Sin movimientos";
}

const balanceFor=r=>r.normal_balance==="credit"?Number(r.credit)-Number(r.debit):Number(r.debit)-Number(r.credit);
function linesHtml(rows){return rows.map(r=>`<div class="reportLine"><span>${esc(r.code)} · ${esc(r.name)}</span><b>${money(balanceFor(r))}</b></div>`).join("")||'<p>Sin movimientos</p>'}
function periodTrial(cumulative=false){
  const from=cumulative?"0000-01-01":($("reportFrom")?.value||"0000-01-01"),to=$("reportTo")?.value||"9999-12-31",allowed=new Set(entries.filter(e=>e.status==="posted"&&e.entry_date>=from&&e.entry_date<=to).map(e=>e.id));
  return accounts.map(a=>{const ls=entryLines.filter(l=>l.account_code===a.code&&allowed.has(l.entry_id));return{...a,debit:ls.reduce((s,l)=>s+Number(l.debit),0),credit:ls.reduce((s,l)=>s+Number(l.credit),0)}});
}
function renderReports(){
  const reportTrial=periodTrial(),by=type=>reportTrial.filter(r=>r.account_type===type),inputVat=Math.max(balanceFor(reportTrial.find(r=>r.code==="118-01")||{normal_balance:"debit",debit:0,credit:0}),0),outputVat=Math.max(balanceFor(reportTrial.find(r=>r.code==="208-01")||{normal_balance:"credit",debit:0,credit:0}),0),vatWithheld=Math.max(balanceFor(reportTrial.find(r=>r.code==="210-02")||{normal_balance:"debit",debit:0,credit:0}),0),isrWithheld=Math.max(balanceFor(reportTrial.find(r=>r.code==="210-01")||{normal_balance:"debit",debit:0,credit:0}),0),payable=Math.max(outputVat-inputVat-vatWithheld,0),favor=Math.max(inputVat+vatWithheld-outputVat,0);
  const estimatedBase=Math.max(by("income").reduce((s,r)=>s+balanceFor(r),0)-by("cost").reduce((s,r)=>s+balanceFor(r),0)-by("expense").reduce((s,r)=>s+balanceFor(r),0),0),estimatedIncomeTax=estimatedBase*(Number(settings.income_tax_rate)||0)/100;
  $("taxReport").innerHTML=`<div class="taxCards"><div><span>IVA acreditable</span><b>${money(inputVat)}</b></div><div><span>IVA trasladado</span><b>${money(outputVat)}</b></div><div><span>IVA retenido por plataformas</span><b>${money(vatWithheld)}</b></div><div><span>ISR retenido por plataformas</span><b>${money(isrWithheld)}</b></div><div><span>IVA por pagar</span><b>${money(payable)}</b></div><div><span>IVA a favor</span><b>${money(favor)}</b></div></div><div class="reportLine"><span>ISR meramente estimado (${Number(settings.income_tax_rate)||0}%)</span><b>${money(estimatedIncomeTax)}</b></div><p>Resumen operativo de pólizas registradas; debe conciliarse con CFDI, estados de cuenta y determinación del contador. El ISR mostrado no es una declaración ni una determinación fiscal definitiva.</p>`;
  $("trialBalance").innerHTML=`<table class="compact"><thead><tr><th>Cuenta</th><th>Tipo</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr></thead><tbody>${reportTrial.map(r=>`<tr><td>${esc(r.code)} · ${esc(r.name)}</td><td>${esc(r.account_type)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balanceFor(r))}</td></tr>`).join("")}</tbody></table>`;
  const income=by("income").reduce((s,r)=>s+balanceFor(r),0),cost=by("cost").reduce((s,r)=>s+balanceFor(r),0),expense=by("expense").reduce((s,r)=>s+balanceFor(r),0),profit=income-cost-expense;
  $("incomeStatement").innerHTML=`${linesHtml(by("income"))}<div class="reportLine"><span>Costos</span><b>${money(cost)}</b></div><div class="reportLine"><span>Gastos</span><b>${money(expense)}</b></div><div class="reportLine"><strong>Resultado del periodo</strong><strong>${money(profit)}</strong></div>`;
  const cumulative=periodTrial(true),cumBy=type=>cumulative.filter(r=>r.account_type===type),assets=cumBy("asset").reduce((s,r)=>s+balanceFor(r),0),liabilities=cumBy("liability").reduce((s,r)=>s+balanceFor(r),0),equity=cumBy("equity").reduce((s,r)=>s+balanceFor(r),0),cumProfit=cumBy("income").reduce((s,r)=>s+balanceFor(r),0)-cumBy("cost").reduce((s,r)=>s+balanceFor(r),0)-cumBy("expense").reduce((s,r)=>s+balanceFor(r),0);
  $("balanceSheet").innerHTML=`<p>Acumulado hasta ${esc($("reportTo").value)}</p><h4>Activos</h4>${linesHtml(cumBy("asset"))}<div class="reportLine"><b>Total activos</b><b>${money(assets)}</b></div><h4>Pasivos</h4>${linesHtml(cumBy("liability"))}<div class="reportLine"><b>Total pasivos</b><b>${money(liabilities)}</b></div><h4>Capital y resultado</h4>${linesHtml(cumBy("equity"))}<div class="reportLine"><span>Resultado acumulado</span><b>${money(cumProfit)}</b></div><div class="reportLine"><b>Pasivo + capital + resultado</b><b>${money(liabilities+equity+cumProfit)}</b></div><p class="${Math.abs(assets-(liabilities+equity+cumProfit))<.02?'status-ok':'status-error'}">Diferencia contable: ${money(assets-(liabilities+equity+cumProfit))}</p>`;
}
$("applyPeriod").onclick=()=>renderReports();

function csvDownload(name,rows){const csv=rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
document.querySelectorAll("[data-export]").forEach(b=>b.onclick=()=>{
  if(b.dataset.export==="trial"){const r=periodTrial();csvDownload("woman-656-balanza.csv",[["Desde",$("reportFrom").value,"Hasta",$("reportTo").value],["Cuenta","Nombre","Tipo","Debe","Haber","Saldo"],...r.map(x=>[x.code,x.name,x.account_type,x.debit,x.credit,balanceFor(x)])]);}
  else if(b.dataset.export==="operations"){const from=$("reportFrom").value,to=$("reportTo").value,rows=transactions.filter(x=>x.operation_date>=from&&x.operation_date<=to).map(x=>[x.operation_date,x.operation_type,x.channel,x.reference,x.customer_or_supplier,x.subtotal,x.tax_rate,x.tax_amount,x.total,x.cost_amount,x.platform_fee,x.isr_withheld,x.vat_withheld,x.status]);csvDownload("woman-656-operaciones.csv",[["Fecha","Tipo","Canal","Referencia","Cliente/Proveedor","Subtotal","Tasa IVA","IVA","Total","Costo","Comisión plataforma","ISR retenido","IVA retenido","Estado"],...rows]);}
  else{const rows=[["Póliza","Fecha","Concepto","Cuenta","Debe","Haber"]];entries.forEach(e=>entryLines.filter(l=>l.entry_id===e.id).forEach(l=>rows.push([e.entry_number,e.entry_date,e.concept,`${l.account_code} ${accountByCode(l.account_code).name}`,l.debit,l.credit])));csvDownload("woman-656-libro-diario.csv",rows)}
});

$("logoutBtn").onclick=async()=>{await db.auth.signOut();location.href="index.html?admin=1"};boot();
