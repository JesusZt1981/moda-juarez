(() => {
  const byId = id => document.getElementById(id);
  const preview = byId('marketingPreview');
  if (!preview) return;

  const ctx = preview.getContext('2d');
  let selectedProducts = [];
  let lastPreviewProduct = null;

  const slug = value => String(value || 'promo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  function setStatus(message, type = 'info') {
    const el = byId('marketingStatus');
    el.textContent = message;
    el.style.color = type === 'error' ? '#ffb4b4' : type === 'ok' ? '#a8e8b8' : '#d7cbd0';
  }

  function campaignCopy() {
    return {
      title: byId('marketingTitle').value.trim() || 'Nuevos estilos en Moda Juárez',
      offer: byId('marketingOffer').value.trim() || 'Entrega local en Ciudad Juárez',
      cta: byId('marketingCta').value.trim() || 'Compra ahora',
      color: byId('marketingColor').value || '#7f1d3f'
    };
  }

  function selectProducts() {
    const catalogState = typeof state !== 'undefined' ? state : null;
    const all = Array.isArray(catalogState?.products) ? catalogState.products : [];
    const scope = byId('marketingScope').value;
    if (scope === 'all') selectedProducts = all.slice();
    else if (scope === 'filtered') selectedProducts = (catalogState.filtered?.length ? catalogState.filtered : all).slice();
    else {
      const wanted = new Set(byId('marketingSkus').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
      selectedProducts = all.filter(p => wanted.has(String(p.sku || '').toLowerCase()));
    }

    const summary = byId('marketingSelection');
    if (!all.length) summary.textContent = 'El catálogo todavía no contiene productos.';
    else if (!selectedProducts.length) summary.textContent = 'No se encontraron productos. Revisa los códigos SKU o cambia el origen.';
    else summary.textContent = `${selectedProducts.length} producto(s): ${selectedProducts.slice(0, 8).map(p => p.sku).join(', ')}${selectedProducts.length > 8 ? '…' : ''}`;
    return selectedProducts;
  }

  function imageUrl(product) {
    return product?.images?.find(Boolean) || product?.image_1 || '';
  }

  function loadImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 8000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = url;
    });
  }

  function roundedRect(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
  }

  function drawCover(context, image, x, y, w, h, zoom = 1) {
    if (!image) {
      const gradient = context.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, '#e8d9df'); gradient.addColorStop(1, '#c8aab7');
      context.fillStyle = gradient; context.fillRect(x, y, w, h);
      context.fillStyle = 'rgba(255,255,255,.7)'; context.font = `700 ${Math.round(w * .05)}px system-ui`;
      context.textAlign = 'center'; context.fillText('Agrega una foto al producto', x + w / 2, y + h / 2);
      return;
    }
    const scale = Math.max(w / image.width, h / image.height) * zoom;
    const sw = w / scale, sh = h / scale;
    const sx = (image.width - sw) / 2, sy = (image.height - sh) / 2;
    context.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  }

  function fitText(context, text, maxWidth, startSize, weight = 800) {
    let size = startSize;
    do { context.font = `${weight} ${size}px system-ui, sans-serif`; size -= 2; }
    while (size > 22 && context.measureText(text).width > maxWidth);
  }

  function renderPromo(canvas, product, image, options = {}) {
    const context = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const copy = campaignCopy();
    context.clearRect(0, 0, w, h);
    context.fillStyle = '#f4efeb'; context.fillRect(0, 0, w, h);
    drawCover(context, image, 0, 0, w, Math.round(h * .63), options.zoom || 1);

    const shade = context.createLinearGradient(0, h * .38, 0, h * .66);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.72)');
    context.fillStyle = shade; context.fillRect(0, h * .35, w, h * .31);
    context.fillStyle = copy.color; context.fillRect(0, h * .63, w, h * .37);

    context.textAlign = 'left'; context.fillStyle = '#fff';
    context.font = `800 ${Math.round(w * .035)}px system-ui`; context.fillText('MODA JUÁREZ', w * .06, h * .055);
    context.font = `700 ${Math.round(w * .025)}px system-ui`; context.fillText(String(product.sku || 'NUEVO'), w * .06, h * .58);
    fitText(context, String(product.name || 'Producto destacado'), w * .88, Math.round(w * .07));
    context.fillText(String(product.name || 'Producto destacado'), w * .06, h * .71);
    context.font = `800 ${Math.round(w * .055)}px system-ui`; context.fillText(money(product.price), w * .06, h * .79);
    context.font = `500 ${Math.round(w * .027)}px system-ui`; context.fillText(copy.offer, w * .06, h * .85);

    roundedRect(context, w * .06, h * .89, w * .42, h * .07, h * .035);
    context.fillStyle = '#fff'; context.fill(); context.fillStyle = copy.color;
    context.font = `800 ${Math.round(w * .027)}px system-ui`; context.textAlign = 'center';
    context.fillText(copy.cta.toUpperCase(), w * .27, h * .935);
    context.textAlign = 'right'; context.fillStyle = '#fff'; context.font = `600 ${Math.round(w * .021)}px system-ui`;
    context.fillText('@MODAJUAREZ', w * .94, h * .94);
  }

  async function updatePreview(product = selectedProducts[0]) {
    if (!product) {
      ctx.fillStyle = '#efe8eb'; ctx.fillRect(0, 0, preview.width, preview.height);
      ctx.fillStyle = '#765b66'; ctx.textAlign = 'center'; ctx.font = '700 24px system-ui';
      ctx.fillText('Selecciona un producto', preview.width / 2, preview.height / 2);
      return;
    }
    lastPreviewProduct = product;
    const image = await loadImage(imageUrl(product));
    renderPromo(preview, product, image);
  }

  function canvasBlob(canvas, type = 'image/png', quality = .94) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear el archivo.')), type, quality));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function generateImage() {
    const products = selectProducts();
    if (!products.length) throw new Error('Selecciona al menos un producto.');
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const image = await loadImage(imageUrl(products[0]));
    renderPromo(canvas, products[0], image);
    downloadBlob(await canvasBlob(canvas), `moda-juarez-${slug(products[0].sku)}.png`);
    await updatePreview(products[0]);
    setStatus('Imagen PNG generada y descargada en la laptop.', 'ok');
  }

  async function generateCarousel() {
    const products = selectProducts().slice(0, 10);
    if (!products.length) throw new Error('Selecciona productos para el carrusel.');
    if (!window.JSZip) throw new Error('No se cargó el componente ZIP. Revisa la conexión a internet.');
    const zip = new JSZip();
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    for (let i = 0; i < products.length; i++) {
      setStatus(`Generando lámina ${i + 1} de ${products.length}…`);
      const image = await loadImage(imageUrl(products[i]));
      renderPromo(canvas, products[i], image);
      zip.file(`${String(i + 1).padStart(2, '0')}-${slug(products[i].sku)}.png`, await canvasBlob(canvas));
    }
    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(blob, `moda-juarez-carrusel-${Date.now()}.zip`);
    await updatePreview(products[0]);
    setStatus(`Carrusel de ${products.length} productos descargado como ZIP.`, 'ok');
  }

  async function generateVideo() {
    const products = selectProducts().slice(0, 6);
    if (!products.length) throw new Error('Selecciona productos para el video.');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Este navegador no permite generar video. Usa Chrome o Edge actualizado.');
    setStatus('Preparando imágenes para el video…');
    const images = [];
    for (const product of products) images.push(await loadImage(imageUrl(product)));

    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 1280;
    const stream = canvas.captureStream(20);
    const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || '';
    const recorder = new MediaRecorder(stream, mime ? {mimeType: mime, videoBitsPerSecond: 5_000_000} : undefined);
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise(resolve => recorder.onstop = resolve);
    const secondsPerProduct = 2.6, totalMs = products.length * secondsPerProduct * 1000;
    recorder.start(500);
    const started = performance.now();

    await new Promise(resolve => {
      const frame = now => {
        const elapsed = now - started;
        const index = Math.min(products.length - 1, Math.floor(elapsed / (secondsPerProduct * 1000)));
        const local = (elapsed % (secondsPerProduct * 1000)) / (secondsPerProduct * 1000);
        renderPromo(canvas, products[index], images[index], {zoom: 1 + local * .08});
        setStatus(`Grabando video: ${Math.min(100, Math.round(elapsed / totalMs * 100))}%`);
        if (elapsed < totalMs) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    recorder.stop(); await finished;
    stream.getTracks().forEach(track => track.stop());
    downloadBlob(new Blob(chunks, {type: mime || 'video/webm'}), `moda-juarez-reel-${Date.now()}.webm`);
    await updatePreview(products[0]);
    setStatus(`Video vertical de ${products.length} producto(s) descargado. Puedes guardarlo y reutilizarlo.`, 'ok');
  }

  function popupConfig() {
    const products = selectProducts();
    const copy = campaignCopy();
    return {title: copy.title, text: `${copy.offer}${products[0] ? ` · ${products[0].name} desde ${money(products[0].price)}` : ''}`, cta: copy.cta, color: copy.color, active: true, savedAt: Date.now()};
  }

  function showPopup(config, previewMode = false) {
    const popup = byId('campaignPopup');
    byId('campaignPopupTitle').textContent = config.title;
    byId('campaignPopupText').textContent = config.text;
    byId('campaignPopupCta').textContent = config.cta;
    popup.style.background = `linear-gradient(145deg,#24131b,${config.color})`;
    popup.classList.remove('hidden');
    if (!previewMode) localStorage.setItem('moda_campaign_popup_seen', String(Date.now()));
  }

  byId('marketingCheckSelection').onclick = async () => { selectProducts(); await updatePreview(); };
  byId('generatePromoImage').onclick = () => generateImage().catch(e => setStatus(e.message, 'error'));
  byId('generateCarousel').onclick = () => generateCarousel().catch(e => setStatus(e.message, 'error'));
  byId('generatePromoVideo').onclick = () => generateVideo().catch(e => setStatus(e.message, 'error'));
  byId('previewMarketingPopup').onclick = () => showPopup(popupConfig(), true);
  byId('saveMarketingPopup').onclick = () => {
    const config = popupConfig(); localStorage.setItem('moda_campaign_popup', JSON.stringify(config));
    setStatus('Pop-up activado en este piloto. Se mostrará como máximo una vez cada 24 horas.', 'ok');
    showPopup(config, true);
  };
  byId('campaignPopupClose').onclick = () => byId('campaignPopup').classList.add('hidden');
  byId('campaignPopupCta').onclick = () => {
    byId('campaignPopup').classList.add('hidden');
    document.querySelector('.catalog-section')?.scrollIntoView({behavior: 'smooth'});
  };

  ['marketingTitle','marketingOffer','marketingCta','marketingColor'].forEach(id => byId(id).addEventListener('input', () => {
    if (lastPreviewProduct) updatePreview(lastPreviewProduct);
  }));

  const saved = JSON.parse(localStorage.getItem('moda_campaign_popup') || 'null');
  const seen = Number(localStorage.getItem('moda_campaign_popup_seen') || 0);
  if (saved?.active && Date.now() - seen > 24 * 60 * 60 * 1000) setTimeout(() => showPopup(saved), 1800);
  updatePreview();
})();
