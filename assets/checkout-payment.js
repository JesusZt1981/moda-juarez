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

  const ICONS={
    spei_prepaid:'↗',
    cash_delivery:'$',
    spei_delivery:'✓'
  };

  function moneySafe(value){
    try{return typeof money==='function'?money(value):new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value)||0)}catch(_){return `$${Number(value||0).toFixed(2)}`}
  }

  function injectStyles(){
    if(document.getElementById('w656CheckoutPaymentStyles')) return;
    const style=document.createElement('style');
    style.id='w656CheckoutPaymentStyles';
    style.textContent=`
      .w656-payment-box{
        margin:16px 0 8px;
        padding:0;
        border:0;
        background:transparent;
      }
      .w656-payment-heading{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin:0 0 10px;
      }
      .w656-payment-heading strong{
        font-size:13px;
        font-weight:800;
        color:var(--text,#303638);
        letter-spacing:.01em;
      }
      .w656-payment-heading span{
        font-size:9.5px;
        font-weight:700;
        color:var(--muted,#6d7474);
        letter-spacing:.03em;
        text-transform:uppercase;
      }
      .w656-payment-options{
        display:grid;
        grid-template-columns:1fr;
        gap:8px;
      }
      .w656-payment-option{
        position:relative;
        display:block;
        cursor:pointer;
        min-width:0;
      }
      .w656-payment-option input{
        position:absolute;
        opacity:0;
        pointer-events:none;
      }
      .w656-payment-card{
        display:grid;
        grid-template-columns:34px minmax(0,1fr) 18px;
        align-items:center;
        gap:10px;
        min-height:58px;
        padding:10px 12px;
        border:1px solid rgba(115,135,122,.18);
        border-radius:14px;
        background:rgba(255,255,255,.82);
        box-shadow:0 5px 16px rgba(36,39,38,.045);
        transition:border-color .18s ease,box-shadow .18s ease,background .18s ease,transform .18s ease;
      }
      .w656-payment-option:hover .w656-payment-card{
        border-color:rgba(115,135,122,.38);
        transform:translateY(-1px);
        box-shadow:0 8px 18px rgba(36,39,38,.07);
      }
      .w656-payment-option input:checked + .w656-payment-card{
        border-color:rgba(176,113,139,.58);
        background:linear-gradient(180deg,rgba(255,248,251,.98),rgba(255,255,255,.96));
        box-shadow:0 8px 20px rgba(176,113,139,.10);
      }
      .w656-payment-icon{
        width:34px;
        height:34px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:10px;
        background:#f6f1f3;
        color:#7d6670;
        font-size:14px;
        font-weight:900;
      }
      .w656-payment-option input:checked + .w656-payment-card .w656-payment-icon{
        background:#f5e8ee;
        color:#8f5870;
      }
      .w656-payment-copy{
        min-width:0;
      }
      .w656-payment-title{
        display:block;
        margin:0;
        font-size:12px;
        line-height:1.25;
        font-weight:850;
        color:var(--text,#303638);
      }
      .w656-payment-subtitle{
        display:block;
        margin-top:3px;
        font-size:10px;
        line-height:1.32;
        font-weight:600;
        color:var(--muted,#6d7474);
      }
      .w656-payment-radio{
        width:17px;
        height:17px;
        border:1.5px solid #c9cfcc;
        border-radius:50%;
        background:#fff;
        position:relative;
      }
      .w656-payment-option input:checked + .w656-payment-card .w656-payment-radio{
        border-color:#b0718b;
      }
      .w656-payment-option input:checked + .w656-payment-card .w656-payment-radio::after{
        content:'';
        position:absolute;
        inset:3px;
        border-radius:50%;
        background:#b0718b;
      }
      .w656-payment-option.disabled{
        cursor:not-allowed;
      }
      .w656-payment-option.disabled .w656-payment-card{
        opacity:.42;
        box-shadow:none;
        transform:none;
      }
      .w656-payment-note{
        margin:9px 0 0;
        padding:9px 11px;
        border-radius:11px;
        background:#f8f7f5;
        color:var(--muted,#6d7474);
        font-size:9.8px;
        line-height:1.4;
        border:1px solid rgba(115,135,122,.10);
      }
      .w656-payment-note strong{
        color:var(--text,#303638);
      }
      #whatsappBtn.w656-checkout-btn{
        width:100%;
        min-height:44px;
        margin-top:10px;
        border:0;
        border-radius:13px;
        background:linear-gradient(135deg,#c78ca5,#b77a94);
        color:#fff;
        font-size:12px;
        font-weight:850;
        letter-spacing:.01em;
        box-shadow:0 8px 18px rgba(183,122,148,.18);
      }
      #whatsappBtn.w656-checkout-btn:hover{
        filter:brightness(.985);
        transform:translateY(-1px);
      }
      @media(max-width:560px){
        .w656-payment-box{margin-top:14px}
        .w656-payment-heading{margin-bottom:8px}
        .w656-payment-heading strong{font-size:12.5px}
        .w656-payment-heading span{font-size:9px}
        .w656-payment-card{
          grid-template-columns:31px minmax(0,1fr) 17px;
          min-height:54px;
          padding:9px 10px;
          border-radius:13px;
          gap:9px;
        }
        .w656-payment-icon{width:31px;height:31px;border-radius:9px;font-size:13px}
        .w656-payment-title{font-size:11.5px}
        .w656-payment-subtitle{font-size:9.5px}
        .w656-payment-note{font-size:9.4px;padding:8px 10px}
        #whatsappBtn.w656-checkout-btn{min-height:43px;border-radius:12px;font-size:11.5px}
      }
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
      note.innerHTML='<strong>SPEI · Santander</strong><br>Pago anticipado. Los datos bancarios aparecerán al confirmar el pedido cuando configuremos la CLABE.';
    }else if(!hasCompleteCp){
      note.textContent='Ingresa tu código postal para validar la disponibilidad de contraentrega.';
    }else if(local){
      note.textContent=method==='cash_delivery'?'Pagas en efectivo al momento de recibir tu pedido.':'Realizas la transferencia SPEI al momento de recibir tu pedido.';
    }else{
      note.textContent='La contraentrega está disponible únicamente para entregas locales en Ciudad Juárez.';
    }
    saveSelection();
  }

  function paymentOption({value,title,subtitle,local=false,saved}){
    return `
      <label class="w656-payment-option" ${local?'data-w656-local-payment="1"':''}>
        <input type="radio" name="w656PaymentMethod" value="${value}" ${saved===value?'checked':''}>
        <span class="w656-payment-card">
          <span class="w656-payment-icon" aria-hidden="true">${ICONS[value]||'•'}</span>
          <span class="w656-payment-copy">
            <span class="w656-payment-title">${title}</span>
            <span class="w656-payment-subtitle">${subtitle}</span>
          </span>
          <span class="w656-payment-radio" aria-hidden="true"></span>
        </span>
      </label>`;
  }

  function injectPaymentBox(){
    const btn=document.getElementById('whatsappBtn');
    if(!btn||document.getElementById('w656PaymentBox')) return;
    const box=document.createElement('div');
    box.id='w656PaymentBox';
    box.className='w656-payment-box';
    const saved=(()=>{try{return localStorage.getItem(PAYMENT_KEY)||'spei_prepaid'}catch(_){return 'spei_prepaid'}})();
    box.innerHTML=`
      <div class="w656-payment-heading">
        <strong>Forma de pago</strong>
        <span>Selecciona una opción</span>
      </div>
      <div class="w656-payment-options">
        ${paymentOption({value:'spei_prepaid',title:'Transferencia SPEI',subtitle:'Pago anticipado por transferencia',saved})}
        ${paymentOption({value:'cash_delivery',title:'Contraentrega · Efectivo',subtitle:'Pagas al recibir · Entrega local',local:true,saved})}
        ${paymentOption({value:'spei_delivery',title:'Contraentrega · SPEI',subtitle:'Transfiere al momento de la entrega',local:true,saved})}
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