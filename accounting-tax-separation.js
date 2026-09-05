(() => {
  let installed=false;
  let attempts=0;
  let syncing=false;
  let disabledObserver=null;

  const byId=id=>document.getElementById(id);

  function activeInvoice(){
    if(!Array.isArray(items)||!Array.isArray(invoices))return null;
    const ids=[...new Set(items.map(i=>i?.invoice_id).filter(Boolean).map(String))];
    if(ids.length!==1)return null;
    return invoices.find(invoice=>String(invoice.id)===ids[0])||null;
  }

  function activeRows(invoice=activeInvoice()){
    if(!invoice||!Array.isArray(items))return [];
    return items.filter(item=>String(item?.invoice_id)===String(invoice.id));
  }

  function setLabelText(label,input,text){
    if(!label||!input)return;
    if(String(label.textContent||'').trim()===text)return;
    [...label.childNodes].forEach(node=>{
      if(node!==input)node.remove();
    });
    label.appendChild(document.createTextNode(` ${text}`));
  }

  function ensureExplanation(){
    const bar=document.querySelector('.pricing-global-bar');
    if(!bar)return;
    let note=byId('taxSeparationNote');
    if(!note){
      note=document.createElement('div');
      note.id='taxSeparationNote';
      note.style.cssText='grid-column:1/-1;margin-top:2px;color:var(--muted);font-size:11px;line-height:1.45';
      bar.appendChild(note);
    }
    const text='IVA de mercancía y costos logísticos son conceptos distintos: C/envío y C/impo se suman al costo real, pero NO se convierten automáticamente en IVA. “IVA acreditable” sólo separa el IVA de la mercancía cuando corresponda y exista soporte fiscal.';
    if(note.textContent!==text)note.textContent=text;
  }

  function refreshLabels(){
    const globalIncluded=byId('globalTaxIncluded');
    const master=byId('orderAmountsIncludeTax');

    if(globalIncluded){
      setLabelText(globalIncluded.closest('label'),globalIncluded,'Costo de mercancía incluye IVA');
      globalIncluded.title='Aplica únicamente a la columna Costo de mercancía. No convierte Envío ni Importación en IVA.';
    }
    if(master){
      setLabelText(master.closest('label'),master,'El costo de mercancía (columna Costo) ya incluye IVA');
      master.title='Aplica únicamente al costo de mercancía. Envío e importación siguen siendo costos separados.';
    }
    ensureExplanation();
  }

  function keepGlobalEnabled(){
    const globalIncluded=byId('globalTaxIncluded');
    if(!globalIncluded)return;
    if(globalIncluded.disabled)globalIncluded.disabled=false;
    const label=globalIncluded.closest('label');
    if(label)label.title='Puedes cambiarlo aquí o en el Resumen del pedido; ambos controles se mantienen sincronizados.';
  }

  function synchronizeIncluded(checked,{renderNow=true}={}){
    if(syncing)return;
    syncing=true;
    try{
      const value=!!checked;
      const master=byId('orderAmountsIncludeTax');
      const globalIncluded=byId('globalTaxIncluded');
      if(master)master.checked=value;
      if(globalIncluded){
        globalIncluded.checked=value;
        globalIncluded.disabled=false;
      }

      const invoice=activeInvoice();
      if(invoice){
        invoice.amounts_include_tax=value;
        activeRows(invoice).forEach(item=>{item.tax_included=value;});
      }

      if(renderNow && typeof render==='function'){
        try{render();}catch(error){console.warn('WOMAN 656 · sincronización IVA:',error);}
      }
    }finally{
      syncing=false;
      setTimeout(()=>{
        keepGlobalEnabled();
        refreshLabels();
      },0);
    }
  }

  function installObservers(){
    const globalIncluded=byId('globalTaxIncluded');
    if(globalIncluded && !disabledObserver){
      disabledObserver=new MutationObserver(()=>keepGlobalEnabled());
      disabledObserver.observe(globalIncluded,{attributes:true,attributeFilter:['disabled']});
    }
  }

  function bind(){
    const globalIncluded=byId('globalTaxIncluded');
    const master=byId('orderAmountsIncludeTax');
    if(!globalIncluded||!master)return false;

    if(!globalIncluded.dataset.taxSeparationBound){
      globalIncluded.dataset.taxSeparationBound='1';
      globalIncluded.addEventListener('change',()=>{
        if(syncing)return;
        synchronizeIncluded(globalIncluded.checked);
      });
    }

    if(!master.dataset.taxSeparationBound){
      master.dataset.taxSeparationBound='1';
      master.addEventListener('change',()=>{
        if(syncing)return;
        synchronizeIncluded(master.checked);
      });
    }

    installObservers();
    refreshLabels();
    keepGlobalEnabled();

    const invoice=activeInvoice();
    if(invoice){
      const desired=master.checked;
      globalIncluded.checked=desired;
      activeRows(invoice).forEach(item=>{item.tax_included=desired;});
    }
    return true;
  }

  function install(){
    if(installed)return;
    attempts++;
    if(!bind()){
      if(attempts<160)setTimeout(install,50);
      return;
    }
    installed=true;

    const bodyObserver=new MutationObserver(()=>{
      refreshLabels();
      keepGlobalEnabled();
      bind();
    });
    bodyObserver.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
