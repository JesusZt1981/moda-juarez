(() => {
  const originalApplyFilters = typeof applyFilters === "function" ? applyFilters : null;
  const originalOpenNewProductEditor = typeof openNewProductEditor === "function" ? openNewProductEditor : null;
  const originalOpenAdminEditor = typeof openAdminEditor === "function" ? openAdminEditor : null;
  if(!originalApplyFilters || !originalOpenNewProductEditor || !originalOpenAdminEditor) return;

  function adminAwareApplyFilters(){
    const search = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";
    const category = document.getElementById("filterCategory")?.value || "Todos";
    const size = document.getElementById("filterSize")?.value || "";
    const maxPrice = Number(document.getElementById("filterPrice")?.value || Infinity);

    let products = state.products.filter(product=>{
      const text = `${product.name} ${product.sku} ${product.category} ${product.description}`.toLowerCase();
      const visibleForRole = state.admin ? true : (product.active !== false && Number(product.totalStock || 0) > 0);
      return (
        visibleForRole &&
        (!search || text.includes(search)) &&
        (category === "Todos" || product.category === category) &&
        (!size || product.sizes.includes(size)) &&
        (!state.favoritesOnly || state.favorites.includes(product.sku)) &&
        Number(product.price) <= maxPrice
      );
    });

    const sort = document.getElementById("sortSelect")?.value || "featured";
    if(sort === "priceAsc") products.sort((a,b)=>a.price-b.price);
    if(sort === "priceDesc") products.sort((a,b)=>b.price-a.price);
    if(sort === "nameAsc") products.sort((a,b)=>a.name.localeCompare(b.name,"es"));
    if(sort === "nameDesc") products.sort((a,b)=>b.name.localeCompare(a.name,"es"));

    state.filtered = products;
    state.page = 1;
    renderProducts();
    if(typeof updateCatalogDiagnostic === "function") updateCatalogDiagnostic();
  }

  applyFilters = adminAwareApplyFilters;

  function ensureDeleteButton(){
    const actions = document.querySelector(".admin-modal-actions");
    if(!actions || document.getElementById("deleteAdminProduct")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "deleteAdminProduct";
    button.className = "danger-btn hidden";
    button.textContent = "🗑 Eliminar producto";
    button.style.background = "#b92f45";
    button.style.color = "#fff";
    const cancel = document.getElementById("cancelAdminProduct");
    actions.insertBefore(button,cancel || null);
    button.addEventListener("click",deleteCurrentProduct);
  }

  function setDeleteVisibility(show){
    ensureDeleteButton();
    document.getElementById("deleteAdminProduct")?.classList.toggle("hidden",!show);
  }

  openNewProductEditor = function(){
    originalOpenNewProductEditor();
    setDeleteVisibility(false);
  };

  openAdminEditor = function(product){
    originalOpenAdminEditor(product);
    setDeleteVisibility(true);
  };

  async function removeProductMedia(product){
    if(!product) return;
    const urls = [
      ...(Array.isArray(product.images) ? product.images : []),
      ...(typeof productVideoUrls === "function" ? productVideoUrls(product) : [])
    ].filter(Boolean);
    const paths = urls.map(url=>typeof storagePathFromPublicUrl === "function" ? storagePathFromPublicUrl(url) : null).filter(Boolean);
    if(!paths.length) return;
    const {error} = await shopSupabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
    if(error) console.warn("WOMAN 656: producto eliminado, pero algunos archivos no pudieron borrarse de Storage:",error.message);
  }

  async function deleteCurrentProduct(){
    try{
      await requireShopAdmin();
      const dbId = Number(document.getElementById("adminProductDbId")?.value);
      if(!dbId) throw new Error("No se encontró el ID del producto.");
      const product = state.products.find(p=>Number(p.dbId)===dbId);
      const sku = product?.sku || document.getElementById("adminSku")?.value || `ID ${dbId}`;
      const name = product?.name || document.getElementById("adminName")?.value || "Producto";

      const first = confirm(`Vas a ELIMINAR definitivamente este producto del catálogo:\n\n${sku}\n${name}\n\nEl historial contable de compras se conservará, pero el producto, sus variantes y su inventario se eliminarán.\n\n¿Continuar?`);
      if(!first) return;
      const typed = prompt(`Confirmación final. Escribe exactamente el SKU para eliminarlo:\n\n${sku}`);
      if(String(typed||"").trim() !== String(sku).trim()){
        alert("No se eliminó. El SKU de confirmación no coincide.");
        return;
      }

      if(typeof setAdminEditorStatus === "function") setAdminEditorStatus("Eliminando producto…");
      const {error} = await shopSupabase.from("shop_products").delete().eq("id",dbId);
      if(error) throw error;

      await removeProductMedia(product);
      await loadCatalogFromSupabase();
      if(typeof closeAdminEditor === "function") closeAdminEditor();
      alert(`✅ ${sku} fue eliminado del catálogo.\n\nLas partidas históricas de Contabilidad se conservaron.`);
    }catch(error){
      console.error(error);
      if(typeof setAdminEditorStatus === "function") setAdminEditorStatus(`❌ ${error.message||error}`,"error");
    }
  }

  function addAdminStatusStyles(){
    if(document.getElementById("w656AdminVisibilityStyles")) return;
    const style = document.createElement("style");
    style.id = "w656AdminVisibilityStyles";
    style.textContent = `
      body.admin-mode .product-card{position:relative}
      body.admin-mode .product-card .badge{z-index:3}
      #deleteAdminProduct{font-weight:900}
    `;
    document.head.appendChild(style);
  }

  addAdminStatusStyles();
  ensureDeleteButton();
  if(typeof state !== "undefined" && state.admin) applyFilters();
})();
