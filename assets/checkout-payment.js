/* WOMAN 656 · acceso al checkout separado */
(() => {
  'use strict';
  if(window.__W656_CHECKOUT_ROUTER__) return;
  window.__W656_CHECKOUT_ROUTER__=true;

  function openCheckout(){
    const target='checkout.html';
    if(window.matchMedia('(min-width:821px)').matches){
      window.open(target,'_blank','noopener,noreferrer');
    }else{
      window.location.href=target;
    }
  }

  function replaceDrawerAction(){
    const old=document.getElementById('whatsappBtn');
    if(!old || document.getElementById('checkoutPageBtn')) return;
    const btn=old.cloneNode(true);
    btn.id='checkoutPageBtn';
    btn.textContent='Revisar carrito y continuar';
    btn.classList.remove('w656-checkout-btn');
    btn.onclick=openCheckout;
    old.replaceWith(btn);
  }

  function routeCartButton(){
    const cart=document.getElementById('cartBtn');
    if(!cart) return;
    cart.onclick=openCheckout;
  }

  function removeLegacyPaymentUi(){
    document.getElementById('w656PaymentBox')?.remove();
    document.getElementById('w656CheckoutPaymentStyles')?.remove();
  }

  function start(){
    removeLegacyPaymentUi();
    routeCartButton();
    replaceDrawerAction();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();