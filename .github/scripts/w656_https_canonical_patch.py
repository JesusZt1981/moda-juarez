from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
marker = "<!-- WOMAN656_HTTPS_CANONICAL_V1 -->"

if marker not in text:
    block = '''<head>
<!-- WOMAN656_HTTPS_CANONICAL_V1 -->
<script>
(()=>{try{
  const host=String(location.hostname||"").toLowerCase();
  if((host==="woman656.com"||host==="www.woman656.com") && (location.protocol!=="https:"||host!=="woman656.com")){
    location.replace("https://woman656.com"+location.pathname+location.search+location.hash);
  }
}catch(_){}})();
</script>
<link rel="canonical" href="https://woman656.com/">'''
    if "<head>" not in text:
        raise SystemExit("No se encontro <head> en index.html")
    text = text.replace("<head>", block, 1)

# El dominio publico nunca debe generarse o compartirse con HTTP desde el frontend.
text = text.replace("http://woman656.com", "https://woman656.com")
text = text.replace("http://www.woman656.com", "https://woman656.com")

path.write_text(text, encoding="utf-8")
print("WOMAN 656 HTTPS canonical patch listo")
