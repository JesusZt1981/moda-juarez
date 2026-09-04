from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
original = text


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

# 1) Conexiones críticas: resolver Supabase/CDN antes, sin bloquear el HTML.
needle = '<meta name="description" content="WOMAN 656 · Moda femenina con actitud.">'
insert = needle + '''\n<link rel="preconnect" href="https://snkuvxpddxcmbfhgabbx.supabase.co" crossorigin>\n<link rel="dns-prefetch" href="//snkuvxpddxcmbfhgabbx.supabase.co">\n<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>\n<link rel="dns-prefetch" href="//cdn.jsdelivr.net">\n<link rel="dns-prefetch" href="//cdnjs.cloudflare.com">'''
if 'dns-prefetch" href="//snkuvxpddxcmbfhgabbx.supabase.co"' not in text:
    replace_once(needle, insert, 'preconnect block')

# 2) Herramientas no críticas dejan de bloquear el primer pintado.
for src in [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
]:
    old = f'<script src="{src}"></script>'
    new = f'<script defer src="{src}"></script>'
    if new not in text:
        replace_once(old, new, f'defer {src}')

# 3) CSS de rendimiento al final del head para que sus reglas móviles prevalezcan.
perf_css = '<link rel="stylesheet" href="assets/client-performance.css?v=1">'
if perf_css not in text:
    replace_once('</head>', perf_css + '\n</head>', 'performance stylesheet')

# 4) Menos tarjetas simultáneas en móvil; el catálogo completo sigue disponible por páginas.
old = '  pageSize: 20\n};'
new = '  pageSize: window.matchMedia("(max-width:700px)").matches ? 12 : 20\n};'
if new not in text:
    replace_once(old, new, 'responsive page size')

# 5) Render del catálogo: primeras 2 imágenes prioritarias; las demás son lazy.
old = '  visible.forEach(product=>{'
new = '  visible.forEach((product,visibleIndex)=>{'
if new not in text:
    replace_once(old, new, 'visible product index')

old = '        <img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}">'
new = '        <img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="600" height="800" loading="${visibleIndex < 2 ? "eager" : "lazy"}" decoding="async" fetchpriority="${visibleIndex < 2 ? "high" : "low"}">'
if new not in text:
    replace_once(old, new, 'catalog image loading')

# Miniaturas de ficha: no competir con la imagen principal.
old = ': `<img src="${escapeHtml(item.url)}" alt="Miniatura ${index+1}">`;'
new = ': `<img src="${escapeHtml(item.url)}" alt="Miniatura ${index+1}" loading="lazy" decoding="async" fetchpriority="low">`;'
if new not in text:
    replace_once(old, new, 'quick view thumb lazy loading')

# 6) Nuevas imágenes se comprimen antes de subirlas, manteniendo originales existentes intactos.
helper_marker = 'async function optimizeProductImageForWeb(file)'
helper = r'''
async function optimizeProductImageForWeb(file){
  try{
    if(!file || !file.type?.startsWith("image/")) return file;
    if(file.type === "image/webp" && file.size <= 700 * 1024) return file;

    const url = URL.createObjectURL(file);
    const image = await new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = ()=>resolve(img);
      img.onerror = ()=>reject(new Error("No se pudo preparar la imagen para web."));
      img.src = url;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d",{alpha:true});
    ctx.drawImage(image,0,0,width,height);
    URL.revokeObjectURL(url);

    const blob = await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.82));
    if(!blob) return file;
    if(blob.size >= file.size && file.size <= 900 * 1024) return file;

    const baseName = String(file.name || "producto").replace(/\.[^.]+$/,'');
    return new File([blob],`${baseName}.webp`,{type:"image/webp",lastModified:Date.now()});
  }catch(error){
    console.warn("WOMAN 656: no se pudo optimizar la imagen; se conserva el archivo original.",error);
    return file;
  }
}

'''
if helper_marker not in text:
    replace_once('async function uploadProductImage(slot,file){', helper + 'async function uploadProductImage(slot,file){', 'image optimizer helper')

old = '''  if(file.size > 5 * 1024 * 1024){\n    throw new Error("La imagen supera el límite de 5 MB.");\n  }'''
new = '''  file = await optimizeProductImageForWeb(file);\n\n  if(file.size > 2500 * 1024){\n    throw new Error("La imagen sigue siendo demasiado pesada después de optimizarla. Usa una imagen menor a 2.5 MB.");\n  }'''
if new not in text:
    replace_once(old, new, 'optimize before upload')

# Archivos con nombre timestamp son inmutables: caché larga en CDN/navegador.
text = text.replace('cacheControl:"3600"', 'cacheControl:"31536000"')

# 7) Resiliencia de imágenes: se carga después del código principal, antes de módulos secundarios.
perf_js = '<script src="assets/client-performance.js?v=1"></script>'
if perf_js not in text:
    replace_once('<script src="marketing-studio.js"></script>', perf_js + '\n<script src="marketing-studio.js"></script>', 'performance js')

# Marcador para auditoría rápida del build.
if '<!-- WOMAN656_CLIENT_PERFORMANCE_V1 -->' not in text:
    replace_once('<body', '<!-- WOMAN656_CLIENT_PERFORMANCE_V1 -->\n<body', 'performance build marker')

if text == original:
    print('No changes needed.')
else:
    path.write_text(text, encoding='utf-8')
    print('WOMAN 656 client performance patch applied.')
