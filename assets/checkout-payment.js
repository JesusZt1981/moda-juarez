/* WOMAN 656 · formas de pago para pedido por WhatsApp */
(() => {
  'use strict';
  if(window.__W656_CHECKOUT_PAYMENT__) return;
  window.__W656_CHECKOUT_PAYMENT__=true;

  const PAYMENT_KEY='woman656_payment_method';
  const LABELS={
    spei_prepaid:'Transferencia SPEI antes de la entrega',
    cash_delivery:'Contraentrega · Efectivo',
    spei_delivery:'Contraentrega · SPEI'
  };

  function moneySafe(value){
    try{return typeof money==='function'?money(value):new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value)||0)}catch(_){return `$${Number(value||0).toFixed(2)}`}
  }

  function injectStyles(){
    if(document.getElementById('w656CheckoutPaymentStyles')) return;
    const style=document.createElement('style');
    style.id='w656CheckoutPaymentStyles';
    style.textContent=`
      .w656-payment-box{margin:12px 0 4px;padding:12px;border:1px solid var(--border,#d9dfdc);border-radius:12px;background:#fff}
      .w656-payment-box>strong{display:block;margin-bottom:8px;font-size:12px;color:var(--text,#303638)}
      .w656-payment-options{display:grid;gap:7px}
      .w656-payment-option{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border:1px solid var(--border,#d9dfdc);border-radius:10px;background:var(--surface-soft,#eef2ef);cursor:pointer}
      .w656-payment-option input{margin-top:2px;accent-color:var(--sage-dark,#73877a)}
      .w656-payment-option span{display:block;font-size:11px;font-weight:800;color:var(--text,#303638);line-height:1.3}
      .w656-payment-option small{display:block;margin-top:2px;font-size:9.5px;font-weight:600;color:var(--muted,#6d7474);line-height:1.3}
      .w656-payment-option.disabled{opacity:.48;cursor:not-allowed}
      .w656-payment-note{margin:8px 1px 0;font-size:10px;line-height:1.4;color:var(--muted,#6d7474)}
      .w656-payment-note strong{color:var(--text,#303638)}
      #whatsappBtn.w656-checkout-btn{background:var(--sage-dark,#73877a);color:#fff}
    `;
    document.head.appendChild(style);
  }

  function isLocalPostal(){
    const cp=document.getElementById('postalCode')?.value?.trim()||'';
    return /^32\d{3}$/.test(cp);
  }

  function selectedMethod(){
    return document.querySelector('input[name="w656PaymentMethod"]:checked')?.value||'spei_prepaid';
  }

  function paymentLabel(){return LABELS[selectedMethod()]||LABELS.spei_prepaid}

  function saveSelection(){
    try{localStorage.setItem(PAYMENT_KEY,selectedMethod())}catch(_){}
  }

  function updateEligibility(){
    const cp=document.getElementById('postalCode')?.value?.trim()||'';
    const local=isLocalPostal();
    const hasCompleteCp=/^\d{5}$/.test(cp);
    document.querySelectorAll('[data-w656-local-payment="1"]').forEach(label=>{
      const input=label.querySelector('input');
      const disabled=hasCompleteCp&&!local;
      input.disabled=disabled;
      label.classList.toggle('disabled',disabled);
      if(disabled&&input.checked){
        const fallback=document.querySelector('input[name="w656PaymentMethod"][value="spei_prepaid"]');
        if(fallback) fallback.checked=true;
      }
    });
    const note=document.getElementById('w656PaymentNote');
    if(!note)return;
    const method=selectedMethod();
    if(method==='spei_prepaid'){
      note.innerHTML='<strong>SPEI:</strong> cuenta Santander. Los datos bancarios se mostrarán al confirmar el pedido; falta configurar la CLABE en la tienda.';
    }else if(!hasCompleteCp){
      note.textContent='Indica tu código postal para validar si la contraentrega está disponible.';
    }else if(local){
      note.textContent=method==='cash_delivery'?'Pagarás en efectivo al recibir tu pedido.':'Realizarás el SPEI al momento de recibir tu pedido.';
    }else{
      note.textContent='La contraentrega está disponible solo para entregas locales en Ciudad Juárez.';
    }
    saveSelection();
  }

  function injectPaymentBox(){
    const btn=document.getElementById('whatsappBtn');
    if(!btn||document.getElementById('w656PaymentBox')) return;
    const box=document.createElement('div');
    box.id='w656PaymentBox';
    box.className='w656-payment-box';
    const saved=(()=>{try{return localStorage.getItem(PAYMENT_KEY)||'spei_prepaid'}catch(_){return 'spei_prepaid'}})();
    box.innerHTML=`
      <strong>Forma de pago</strong>
      <div class="w656-payment-options">
        <label class="w656-payment-option">
          <input type="radio" name="w656PaymentMethod" value="spei_prepaid" ${saved==='spei_prepaid'?'checked':''}>
          <span>Transferencia SPEI<small>Transferencia bancaria antes de la entrega</small></span>
        </label>
        <label class="w656-payment-option" data-w656-local-payment="1">
          <input type="radio" name="w656PaymentMethod" value="cash_delivery" ${saved==='cash_delivery'?'checked':''}>
          <span>Contraentrega · Efectivo<small>Disponible para entrega local</small></span>
        </label>
        <label class="w656-payment-option" data-w656-local-payment="1">
          <input type="radio" name="w656PaymentMethod" value="spei_delivery" ${saved==='spei_delivery'?'checked':''}>
          <span>Contraentrega · SPEI<small>Transferencia al momento de recibir</small></span>
        </label>
      </div>
      <div class="w656-payment-note" id="w656PaymentNote"></div>
    `;
    btn.parentNode.insertBefore(box,btn);
    btn.textContent='Confirmar pedido por WhatsApp';
    btn.classList.add('w656-checkout-btn');
    box.addEventListener('change',updateEligibility);
    document.getElementById('postalCode')?.addEventListener('input',updateEligibility);
    updateEligibility();
  }

  function totals(){
    const subtotal=typeof calculateSubtotal==='function'?calculateSubtotal():0;
    const discount=typeof calculateDiscount==='function'?calculateDiscount():0;
    const afterDiscount=Math.max(0,subtotal-discount);
    const shipping=typeof calculateShipping==='function'?calculateShipping(afterDiscount):0;
    return {subtotal,discount,shipping,total:afterDiscount+shipping};
  }

  function buildMessage(){
    const cp=document.getElementById('postalCode')?.value?.trim()||'';
    const {subtotal,discount,shipping,total}=totals();
    const cart=(typeof state!=='undefined'&&Array.isArray(state.cart))?state.cart:[];
    const lines=cart.map(item=>`• ${item.name} | ${item.sku} | Talla ${item.size} | x${item.qty} | ${moneySafe(item.price*item.qty)}`);
    const storeName=(typeof STORE_CONFIG!=='undefined'&&STORE_CONFIG.storeName?STORE_CONFIG.storeName:'WOMAN 656').trim();
    const method=paymentLabel();
    const extras=[];
    if(selectedMethod()==='spei_prepaid') extras.push('Pago: pendiente de transferencia y validación.');
    if(selectedMethod()==='cash_delivery') extras.push('Pago: efectivo contraentrega.');
    if(selectedMethod()==='spei_delivery') extras.push('Pago: SPEI al momento de la entrega.');
    return [
      `Hola ${storeName}, quiero confirmar este pedido:`,
      '',...lines,'',
      `Subtotal: ${moneySafe(subtotal)}`,
      discount>0?`Descuento: -${moneySafe(discount)}`:null,
      `Envío: ${shipping===0?'Gratis':moneySafe(shipping)}`,
      `TOTAL: ${moneySafe(total)}`,
      '',`Forma de pago: ${method}`,...extras,
      `C.P.: ${cp||'No indicado'}`
    ].filter(Boolean).join('\n');
  }

  function installCheckoutHandler(){
    const btn=document.getElementById('whatsappBtn');
    if(!btn||btn.dataset.w656PaymentBound==='1') return;
    btn.dataset.w656PaymentBound='1';
    btn.onclick=()=>{
      const cart=(typeof state!=='undefined'&&Array.isArray(state.cart))?state.cart:[];
      if(!cart.length){alert('Tu carrito está vacío.');return;}
      const cp=document.getElementById('postalCode')?.value?.trim()||'';
      if(!/^\d{5}$/.test(cp)){alert('Indica un código postal de 5 dígitos para continuar.');document.getElementById('postalCode')?.focus();return;}
      const method=selectedMethod();
      if((method==='cash_delivery'||method==='spei_delivery')&&!isLocalPostal()){
        alert('La contraentrega está disponible solo para entregas locales en Ciudad Juárez.');
        return;
      }
      const {total}=totals();
      const attribution=typeof currentAttribution==='function'?currentAttribution():{};
      try{if(typeof trackMarketingEvent==='function')trackMarketingEvent('InitiateCheckout',{value:total,custom_data:{items:cart.length,channel:'whatsapp',payment_method:method}})}catch(_){}
      try{if(typeof submitBot==='function')submitBot('/api/leads',{source:'storefront_whatsapp',message:`Carrito con ${cart.length} producto(s); total ${moneySafe(total)}; pago ${paymentLabel()}`,attribution,payment_method:method})}catch(_){}
      const number=String((typeof STORE_CONFIG!=='undefined'&&STORE_CONFIG.whatsapp)||'5216567770986').replace(/\D/g,'');
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`,'_blank','noopener,noreferrer');
    };
  }

  function start(){injectStyles();injectPaymentBox();installCheckoutHandler()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
