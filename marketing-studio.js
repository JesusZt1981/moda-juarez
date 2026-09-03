(() => {
  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`No se pudo cargar ${src}`));
      document.body.appendChild(script);
    });
  }
  loadScript('marketing-studio-original.js')
    .catch(error=>console.error(error))
    .finally(()=>loadScript('store-analytics.js').catch(error=>console.error(error)));
})();
