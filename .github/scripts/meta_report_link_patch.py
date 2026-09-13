from pathlib import Path

path=Path('estadisticas.html')
text=path.read_text(encoding='utf-8')
marker='W656_META_REPORT_LINK_V1'
if marker not in text:
    old='<button id="refresh">Actualizar</button></div></div>'
    new='<button id="refresh">Actualizar</button><a href="meta-reporte.html" style="padding:10px 12px;border-radius:9px;background:#4267b2;color:#fff;text-decoration:none;font-weight:800" data-marker="W656_META_REPORT_LINK_V1">Informe Meta completo</a></div></div>'
    if old not in text:
        raise SystemExit('No se encontró el punto de inserción del enlace Meta')
    text=text.replace(old,new,1)
    path.write_text(text,encoding='utf-8')
