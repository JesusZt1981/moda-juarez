(() => {
  const byId = id => document.getElementById(id);
  const preview = byId('marketingPreview');
  if (!preview) return;

  const ctx = preview.getContext('2d');
  let selectedProducts = [];
  let lastPreviewProduct = null;
  const MEDIA_BUCKET = 'campaign-media';

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
      title: byId('marketingTitle').value.trim() || 'Nuevos estilos en WOMAN 656',
      offer: byId('marketingOffer').value.trim() || 'Entrega local en Ciudad Juárez',
      cta: byId('marketingCta').value.trim() || 'Compra ahora',
      color: byId('marketingColor').value || '#7f1d3f'
    };
  }

  function validLandingUrl() {
    const raw = byId('marketingLandingUrl').value.trim();
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return url;
    } catch (_) {
      throw new Error('Escribe un enlace válido que comience con https://');
    }
  }

  function trackedLandingUrl(campaignId = 'preview') {
    const url = validLandingUrl();
    url.searchParams.set('utm_source', 'woman656');
    url.searchParams.set('utm_medium', 'reel');
    url.searchParams.set('utm_campaign', campaignId);
    return url.toString();
  }

  async function qrCanvas(text) {
    if (typeof window.qrcode !== 'function') return null;
    const code = window.qrcode(0, 'M');
    code.addData(text); code.make();
    const modules = code.getModuleCount(), margin = 2, cell = 4;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = (modules + margin * 2) * cell;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#111';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (code.isDark(row, col)) context.fillRect((col + margin) * cell, (row + margin) * cell, cell, cell);
      }
    }
    return canvas;
  }

  async function adminSession() {
    if (!window.shopSupabase && typeof shopSupabase === 'undefined') return null;
    const client = window.shopSupabase || shopSupabase;
    if (!client || typeof state === 'undefined' || !state.admin) return null;
    const {data: {session}} = await client.auth.getSession();
    return session || null;
  }

  async function createCampaign(products, assetType) {
    const session = await adminSession();
    if (!session) return null;
    const copy = campaignCopy();
    const baseUrl = validLandingUrl().toString();
    const name = `${copy.title} · ${new Date().toLocaleDateString('es-MX')}`;
    const {data, error} = await shopSupabase.from('marketing_campaigns').insert({
      name,
      title: copy.title,
      offer: copy.offer,
      cta: copy.cta,
      landing_url: baseUrl,
      platform: 'manual',
      status: 'draft',
      product_skus: products.map(product => String(product.sku || '')).filter(Boolean)
    }).select('id').single();
    if (error) {
      setStatus(`El contenido se descargará localmente. Biblioteca pendiente: ${error.message}`, 'error');
      return null;
    }
    return {id: data.id, assetType};
  }

  function datedStoragePath(campaignId, filename) {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${campaignId}/${filename}`;
  }

  async function persistAsset(campaign, blob, details) {
    if (!campaign) return {saved: false, reason: 'Inicia sesión como ADMIN para guardar en la biblioteca.'};
    const filename = details.filename;
    const path = datedStoragePath(campaign.id, filename);
    const {error: uploadError} = await shopSupabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
      contentType: details.mimeType || blob.type,
      upsert: false,
      cacheControl: '3600'
    });
    if (uploadError) throw new Error(`El archivo se descargó, pero no pudo guardarse en Supabase: ${uploadError.message}. Ejecuta la migración 004.`);
    const {error: rowError} = await shopSupabase.from('marketing_assets').insert({
      campaign_id: campaign.id,
      asset_type: details.assetType,
      generator_mode: 'template',
      storage_path: path,
      filename,
      mime_type: details.mimeType || blob.type || 'application/octet-stream',
      size_bytes: blob.size,
      width: details.width || null,
      height: details.height || null,
      duration_seconds: details.duration || null,
      settings: details.settings || {}
    });
    if (rowError) {
      await shopSupabase.storage.from(MEDIA_BUCKET).remove([path]);
      throw new Error(`El archivo se descargó, pero no se registró en la biblioteca: ${rowError.message}`);
    }
    return {saved: true, path};
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
    context.font = `800 ${Math.round(w * .035)}px system-ui`; context.fillText('WOMAN 656', w * .06, h * .055);
    context.font = `700 ${Math.round(w * .025)}px system-ui`; context.fillText(String(product.sku || 'NUEVO'), w * .06, h * .58);
    fitText(context, String(product.name || 'Producto destacado'), w * .88, Math.round(w * .07));
    context.fillText(String(product.name || 'Producto destacado'), w * .06, h * .71);
    context.font = `800 ${Math.round(w * .055)}px system-ui`; context.fillText(money(product.price), w * .06, h * .79);
    context.font = `500 ${Math.round(w * .027)}px system-ui`; context.fillText(copy.offer, w * .06, h * .85);

    roundedRect(context, w * .06, h * .885, w * .42, h * .065, h * .035);
    context.fillStyle = '#fff'; context.fill(); context.fillStyle = copy.color;
    context.font = `800 ${Math.round(w * .027)}px system-ui`; context.textAlign = 'center';
    context.fillText(copy.cta.toUpperCase(), w * .27, h * .927);

    const displayUrl = options.displayUrl || validLandingUrl().hostname.replace(/^www\./, '');
    context.textAlign = 'left'; context.fillStyle = '#fff'; context.font = `700 ${Math.round(w * .018)}px system-ui`;
    context.fillText(displayUrl, w * .06, h * .98);
    if (options.qrCanvas) {
      const qrSize = Math.round(w * .14);
      context.fillStyle = '#fff'; context.fillRect(w * .80, h * .845, qrSize, qrSize);
      context.drawImage(options.qrCanvas, w * .80, h * .845, qrSize, qrSize);
    } else {
      context.textAlign = 'right'; context.font = `600 ${Math.round(w * .018)}px system-ui`;
      context.fillText('@WOMAN656', w * .94, h * .94);
    }
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
    const landing = trackedLandingUrl();
    renderPromo(preview, product, image, {qrCanvas: await qrCanvas(landing), displayUrl: new URL(landing).hostname});
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
    const campaign = await createCampaign(products.slice(0, 1), 'image');
    const landing = trackedLandingUrl(campaign?.id || 'image');
    const qr = await qrCanvas(landing);
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const image = await loadImage(imageUrl(products[0]));
    renderPromo(canvas, products[0], image, {qrCanvas: qr, displayUrl: new URL(landing).hostname});
    const blob = await canvasBlob(canvas);
    const filename = `woman656-${slug(products[0].sku)}-${Date.now()}.png`;
    downloadBlob(blob, filename);
    const saved = await persistAsset(campaign, blob, {filename, assetType: 'image', mimeType: 'image/png', width: 1080, height: 1350, settings: {landingUrl: landing}});
    await updatePreview(products[0]);
    setStatus(`Imagen PNG descargada${saved.saved ? ' y guardada en la biblioteca privada' : ''}.`, 'ok');
    if (saved.saved) await loadMediaLibrary();
  }

  async function generateCarousel() {
    const products = selectProducts().slice(0, 10);
    if (!products.length) throw new Error('Selecciona productos para el carrusel.');
    if (!window.JSZip) throw new Error('No se cargó el componente ZIP. Revisa la conexión a internet.');
    const campaign = await createCampaign(products, 'carousel');
    const landing = trackedLandingUrl(campaign?.id || 'carousel');
    const qr = await qrCanvas(landing);
    const zip = new JSZip();
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    for (let i = 0; i < products.length; i++) {
      setStatus(`Generando lámina ${i + 1} de ${products.length}…`);
      const image = await loadImage(imageUrl(products[i]));
      renderPromo(canvas, products[i], image, {qrCanvas: qr, displayUrl: new URL(landing).hostname});
      zip.file(`${String(i + 1).padStart(2, '0')}-${slug(products[i].sku)}.png`, await canvasBlob(canvas));
    }
    const blob = await zip.generateAsync({type: 'blob'});
    const filename = `woman656-carrusel-${Date.now()}.zip`;
    downloadBlob(blob, filename);
    const saved = await persistAsset(campaign, blob, {filename, assetType: 'carousel', mimeType: 'application/zip', width: 1080, height: 1350, settings: {landingUrl: landing, slides: products.length}});
    await updatePreview(products[0]);
    setStatus(`Carrusel de ${products.length} productos descargado${saved.saved ? ' y guardado en la biblioteca' : ''}.`, 'ok');
    if (saved.saved) await loadMediaLibrary();
  }

  async function generateVideo() {
    const products = selectProducts().slice(0, 6);
    if (!products.length) throw new Error('Selecciona productos para el video.');
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Este navegador no permite generar video. Usa Chrome o Edge actualizado.');
    const campaign = await createCampaign(products, 'reel');
    const landing = trackedLandingUrl(campaign?.id || 'reel');
    const qr = await qrCanvas(landing);
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
    const requestedDuration = Number(byId('marketingDuration').value || 9);
    const secondsPerProduct = requestedDuration / products.length, totalMs = requestedDuration * 1000;
    recorder.start(500);
    const started = performance.now();

    await new Promise(resolve => {
      const frame = now => {
        const elapsed = now - started;
        const index = Math.min(products.length - 1, Math.floor(elapsed / (secondsPerProduct * 1000)));
        const local = (elapsed % (secondsPerProduct * 1000)) / (secondsPerProduct * 1000);
        renderPromo(canvas, products[index], images[index], {zoom: 1 + local * .08, qrCanvas: qr, displayUrl: new URL(landing).hostname});
        setStatus(`Grabando video: ${Math.min(100, Math.round(elapsed / totalMs * 100))}%`);
        if (elapsed < totalMs) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    recorder.stop(); await finished;
    stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, {type: mime || 'video/webm'});
    const filename = `woman656-reel-${Date.now()}.webm`;
    downloadBlob(blob, filename);
    const saved = await persistAsset(campaign, blob, {filename, assetType: 'reel', mimeType: 'video/webm', width: 720, height: 1280, duration: requestedDuration, settings: {landingUrl: landing, recordedMimeType: mime || 'video/webm', fps: 20, productCount: products.length}});
    await updatePreview(products[0]);
    setStatus(`Reel de ${requestedDuration} s descargado${saved.saved ? ' y guardado en la biblioteca privada' : ''}.`, 'ok');
    if (saved.saved) await loadMediaLibrary();
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  async function signedAssetUrl(path, expiresIn = 900) {
    const {data, error} = await shopSupabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }

  async function downloadStoredAsset(assetId) {
    const {data: asset, error} = await shopSupabase.from('marketing_assets').select('storage_path,filename').eq('id', assetId).single();
    if (error) throw error;
    const response = await fetch(await signedAssetUrl(asset.storage_path));
    if (!response.ok) throw new Error('No se pudo descargar el archivo guardado.');
    downloadBlob(await response.blob(), asset.filename);
  }

  async function deleteStoredAsset(assetId) {
    if (!confirm('¿Eliminar este archivo de la biblioteca? Esta acción no afecta el catálogo.')) return;
    const {data: asset, error} = await shopSupabase.from('marketing_assets').select('storage_path').eq('id', assetId).single();
    if (error) throw error;
    const {error: storageError} = await shopSupabase.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
    if (storageError) throw storageError;
    const {error: rowError} = await shopSupabase.from('marketing_assets').delete().eq('id', assetId);
    if (rowError) throw rowError;
    await loadMediaLibrary();
  }

  function reuseCampaign(campaign) {
    byId('marketingTitle').value = campaign?.title || '';
    byId('marketingOffer').value = campaign?.offer || '';
    byId('marketingCta').value = campaign?.cta || '';
    byId('marketingLandingUrl').value = campaign?.landing_url || location.origin;
    byId('marketingScope').value = 'sku';
    byId('marketingSkus').value = (campaign?.product_skus || []).join(', ');
    selectProducts();
    updatePreview();
    byId('marketingStudio').scrollIntoView({behavior: 'smooth'});
    setStatus('Campaña copiada al editor. Ajusta el mensaje y crea una nueva versión.', 'ok');
  }

  async function loadMediaLibrary() {
    const grid = byId('mediaLibraryGrid');
    const status = byId('mediaLibraryStatus');
    if (!grid || !status) return;
    if (!(await adminSession())) {
      grid.innerHTML = '<div class="media-library-empty">La biblioteca es privada. Inicia sesión como ADMIN.</div>';
      status.textContent = 'Sin sesión administrativa.';
      return;
    }
    status.textContent = 'Cargando biblioteca privada…';
    const {data: assets, error} = await shopSupabase.from('marketing_assets')
      .select('id,asset_type,storage_path,filename,mime_type,size_bytes,width,height,duration_seconds,version,created_at,settings,campaign:marketing_campaigns(id,name,title,offer,cta,landing_url,product_skus,status)')
      .order('created_at', {ascending: false}).limit(48);
    if (error) {
      grid.innerHTML = '<div class="media-library-empty">Ejecuta las migraciones 004 y 005 en Supabase para activar la biblioteca.</div>';
      status.textContent = `Biblioteca pendiente: ${error.message}`;
      return;
    }
    if (!assets.length) {
      grid.innerHTML = '<div class="media-library-empty">Aún no hay archivos. Crea tu primer reel, imagen o carrusel.</div>';
      status.textContent = 'Biblioteca lista: 0 archivos.';
      return;
    }
    const items = await Promise.all(assets.map(async asset => {
      let previewUrl = '';
      if (asset.mime_type.startsWith('image/') || asset.mime_type.startsWith('video/')) {
        try { previewUrl = await signedAssetUrl(asset.storage_path, 1800); } catch (_) {}
      }
      const previewMarkup = asset.mime_type.startsWith('image/') && previewUrl
        ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(asset.filename)}">`
        : asset.mime_type.startsWith('video/') && previewUrl
          ? `<video src="${escapeHtml(previewUrl)}" muted controls preload="metadata"></video>`
          : `<strong>${asset.asset_type === 'carousel' ? '▦' : '▶'}</strong>`;
      const date = new Date(asset.created_at).toLocaleDateString('es-MX');
      const sizeMb = (Number(asset.size_bytes || 0) / 1048576).toFixed(1);
      return `<article class="media-item">
        <div class="media-item-preview">${previewMarkup}</div>
        <div class="media-item-body">
          <h4>${escapeHtml(asset.campaign?.name || asset.filename)}</h4>
          <div class="media-item-meta"><span>${escapeHtml(asset.asset_type)}</span><span>${date}</span><span>${sizeMb} MB</span>${asset.duration_seconds ? `<span>${asset.duration_seconds} s</span>` : ''}</div>
          <div class="media-item-actions">
            <button class="primary-btn" data-media-download="${asset.id}">Descargar</button>
            <button class="secondary-btn" data-media-reuse="${asset.id}">Reutilizar</button>
            <button class="danger-btn" data-media-delete="${asset.id}">Eliminar</button>
          </div>
        </div>
      </article>`;
    }));
    grid.innerHTML = items.join('');
    status.textContent = `Biblioteca lista: ${assets.length} archivo(s) reciente(s).`;
    grid.querySelectorAll('[data-media-download]').forEach(button => button.onclick = () => downloadStoredAsset(button.dataset.mediaDownload).catch(error => setStatus(error.message, 'error')));
    grid.querySelectorAll('[data-media-delete]').forEach(button => button.onclick = () => deleteStoredAsset(button.dataset.mediaDelete).catch(error => setStatus(error.message, 'error')));
    grid.querySelectorAll('[data-media-reuse]').forEach(button => {
      const asset = assets.find(item => item.id === button.dataset.mediaReuse);
      button.onclick = () => reuseCampaign(asset?.campaign);
    });
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
  byId('refreshMediaLibrary').onclick = () => loadMediaLibrary().catch(error => setStatus(error.message, 'error'));
  byId('campaignPopupClose').onclick = () => byId('campaignPopup').classList.add('hidden');
  byId('campaignPopupCta').onclick = () => {
    byId('campaignPopup').classList.add('hidden');
    document.querySelector('.catalog-section')?.scrollIntoView({behavior: 'smooth'});
  };

  ['marketingTitle','marketingOffer','marketingCta','marketingColor','marketingLandingUrl'].forEach(id => byId(id).addEventListener('input', () => {
    if (lastPreviewProduct) updatePreview(lastPreviewProduct);
  }));

  const saved = JSON.parse(localStorage.getItem('moda_campaign_popup') || 'null');
  const seen = Number(localStorage.getItem('moda_campaign_popup_seen') || 0);
  if (saved?.active && Date.now() - seen > 24 * 60 * 60 * 1000) setTimeout(() => showPopup(saved), 1800);
  updatePreview();
  setTimeout(() => loadMediaLibrary().catch(() => {}), 800);
})();
