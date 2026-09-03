(() => {
  function installStyles(){
    if(document.getElementById('w656UiPolishStyles')) return;
    const s=document.createElement('style');
    s.id='w656UiPolishStyles';
    s.textContent=`
      /* Buscador + beneficios en una sola franja */
      .search-panel.w656-search-hidden{display:none!important}
      .trust-strip.w656-compact-trust{grid-template-columns:minmax(300px,2.1fr) repeat(4,minmax(135px,1fr));margin-top:10px;padding:0 28px;border-radius:12px}
      .trust-strip.w656-compact-trust>div{min-width:0;padding:11px 14px;justify-content:center}
      .trust-strip .w656-search-benefit{padding:8px 12px!important;background:var(--surface,#fff)}
      .w656-search-benefit input{width:100%;height:42px;border:1px solid var(--border,#d9dfdc);border-radius:999px;padding:0 16px;background:var(--surface-soft,#eef2ef);color:var(--text,#303638);outline:none}
      .w656-search-benefit input:focus{border-color:var(--sage-dark,#73877a);box-shadow:0 0 0 3px color-mix(in srgb,var(--sage-dark,#73877a) 13%,transparent)}
      .page-shell{padding-top:16px!important}

      /* Un solo filtro rápido */
      #sortSelect{display:none!important}
      .w656-quick-filter{display:flex;align-items:center;gap:9px;padding:7px 9px 7px 13px;border:1px solid var(--border,#d9dfdc);border-radius:12px;background:var(--surface,#fff);box-shadow:0 5px 16px rgba(44,52,52,.05)}
      .w656-quick-filter-label{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#6d7474);white-space:nowrap}
      .w656-quick-filter #customSortShell{margin:0!important}
      .w656-quick-filter .sort-trigger{border:0!important;background:var(--surface-soft,#eef2ef)!important;border-radius:9px!important;min-width:150px!important;padding:9px 11px!important}

      /* Galería de ficha: miniaturas verticales junto a foto */
      @media(min-width:761px){
        .quick-view-gallery{display:grid!important;grid-template-columns:76px minmax(0,1fr)!important;grid-template-rows:1fr!important;grid-template-areas:'thumbs stage'!important;min-height:390px!important;overflow:hidden!important}
        .quick-view-thumbs{grid-area:thumbs!important;display:flex!important;flex-direction:column!important;gap:7px!important;padding:10px 7px!important;overflow-y:auto!important;overflow-x:hidden!important;height:100%!important;background:var(--surface,#fff)!important;border-right:1px solid var(--border,#d9dfdc)!important}
        .quick-view-thumb{flex:0 0 58px!important;width:58px!important;height:72px!important;margin:0 auto!important}
        .quick-view-media-stage{grid-area:stage!important;min-height:390px!important;max-height:none!important;height:100%!important;padding:10px!important;cursor:zoom-in!important}
        .quick-view-media-stage img,.quick-view-media-stage video{min-height:0!important;max-height:100%!important;height:100%!important;width:100%!important;object-fit:contain!important}
      }
      .quick-view-media-stage img{cursor:zoom-in}
      .quick-view-media-stage::after{content:'🔍 Clic para ampliar';position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.64);color:#fff;font-size:10px;font-weight:800;opacity:0;pointer-events:none;transition:.2s;white-space:nowrap}
      .quick-view-media-stage{position:relative}
      .quick-view-media-stage:has(img):hover::after{opacity:1}

      /* Lightbox */
      .w656-image-lightbox{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;overflow:auto;padding:54px 24px 24px}
      .w656-image-lightbox.hidden{display:none!important}
      .w656-image-lightbox img{display:block;max-width:94vw;max-height:90vh;width:auto;height:auto;object-fit:contain;cursor:zoom-in;transition:.15s}
      .w656-image-lightbox img.actual{max-width:none;max-height:none;cursor:zoom-out}
      .w656-lightbox-close{position:fixed;right:22px;top:18px;width:42px;height:42px;border:0;border-radius:50%;background:#fff;color:#111;font-size:27px;font-weight:700;z-index:2}
      .w656-lightbox-hint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(255,255,255,.92);color:#222;padding:7px 12px;border-radius:999px;font-size:11px;font-weight:800;pointer-events:none}

      @media(max-width:900px){
        .trust-strip.w656-compact-trust{grid-template-columns:minmax(250px,1.8fr) repeat(4,minmax(120px,1fr));padding:0 12px;overflow-x:auto}
        .trust-strip.w656-compact-trust>div{min-width:120px}
        .trust-strip.w656-compact-trust>.w656-search-benefit{min-width:280px}
      }
      @media(max-width:760px){
        .trust-strip.w656-compact-trust{display:flex!important;margin:8px 10px 0!important;padding:0!important;overflow-x:auto!important}
        .trust-strip.w656-compact-trust>.w656-search-benefit{flex:0 0 min(72vw,330px)!important;min-width:min(72vw,330px)!important}
        .trust-strip.w656-compact-trust>div:not(.w656-search-benefit){flex:0 0 132px!important}
        .page-shell{padding-top:12px!important}
        .w656-quick-filter{padding:5px 7px}.w656-quick-filter-label{display:none}.w656-quick-filter .sort-trigger{min-width:135px!important}
        .quick-view-media-stage::after{display:none}
      }
    `;
    document.head.appendChild(s);
  }

  function compactSearchAndTrust(){
    const trust=document.querySelector('.trust-strip');
    const panel=document.querySelector('.search-panel');
    const input=document.getElementById('searchInput');
    if(!trust||!panel||!input||trust.querySelector('.w656-search-benefit')) return;
    const cell=document.createElement('div');
    cell.className='w656-search-benefit';
    cell.appendChild(input);
    trust.insertBefore(cell,trust.firstChild);
    panel.classList.add('w656-search-hidden');
    trust.classList.add('w656-compact-trust');
  }

  function prettifySort(){
    const shell=document.getElementById('customSortShell');
    if(!shell||shell.closest('.w656-quick-filter')) return;
    const wrap=document.createElement('div');
    wrap.className='w656-quick-filter';
    const label=document.createElement('span');
    label.className='w656-quick-filter-label';
    label.textContent='Filtro rápido';
    shell.parentNode.insertBefore(wrap,shell);
    wrap.append(label,shell);
  }

  function ensureLightbox(){
    let box=document.getElementById('w656ImageLightbox');
    if(box) return box;
    box=document.createElement('div');
    box.id='w656ImageLightbox';
    box.className='w656-image-lightbox hidden';
    box.innerHTML='<button class="w656-lightbox-close" type="button" aria-label="Cerrar">×</button><img alt="Vista ampliada del producto"><div class="w656-lightbox-hint">Clic en la imagen: ajustar / tamaño completo</div>';
    document.body.appendChild(box);
    const img=box.querySelector('img');
    const close=()=>{box.classList.add('hidden');img.classList.remove('actual');img.removeAttribute('src')};
    box.querySelector('.w656-lightbox-close').onclick=close;
    box.addEventListener('click',e=>{if(e.target===box)close()});
    img.addEventListener('click',e=>{e.stopPropagation();img.classList.toggle('actual')});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.classList.contains('hidden'))close()});
    return box;
  }

  function openLightbox(src,alt='Producto WOMAN 656'){
    if(!src) return;
    const box=ensureLightbox();
    const img=box.querySelector('img');
    img.src=src;
    img.alt=alt;
    img.classList.remove('actual');
    box.classList.remove('hidden');
  }

  function installGalleryZoom(){
    document.addEventListener('click',e=>{
      const img=e.target?.closest?.('#quickViewMediaStage img');
      if(!img) return;
      e.preventDefault();
      e.stopPropagation();
      openLightbox(img.currentSrc||img.src,img.alt||document.getElementById('quickViewTitle')?.textContent||'Producto WOMAN 656');
    },true);
  }

  function run(){
    installStyles();
    compactSearchAndTrust();
    prettifySort();
    ensureLightbox();
    installGalleryZoom();
    const observer=new MutationObserver(()=>{compactSearchAndTrust();prettifySort()});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
