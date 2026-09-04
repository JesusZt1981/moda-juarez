(() => {
  const loaded=new Map();

  function loadScript(src){
    if(loaded.has(src)) return loaded.get(src);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(script);
    });
    loaded.set(src,promise);
    return promise;
  }

  function idle(callback,timeout=1400){
    if('requestIdleCallback' in window){
      window.requestIdleCallback(callback,{timeout});
    }else{
      window.setTimeout(callback,Math.min(timeout,700));
    }
  }

  function start(){
    /* El pulido visual es pequeño y se aplica primero. */
    loadScript('ui-polish.js').catch(error=>console.error(error));

    /* Analítica/cuenta no bloquean el primer render del catálogo. */
    window.setTimeout(()=>{
      loadScript('store-analytics.js').catch(error=>console.error(error));
    },250);

    /* El estudio de marketing (canvas/QR/ZIP) es pesado y no es crítico para
       una clienta que sólo entra a comprar. Se carga cuando el navegador ya
       tuvo oportunidad de pintar e interactuar con el catálogo. */
    idle(()=>{
      loadScript('marketing-studio-original.js').catch(error=>console.error(error));
    },1600);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
