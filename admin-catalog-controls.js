(() => {
  const originalApplyFilters = typeof applyFilters === "function" ? applyFilters : null;
  const originalOpenNewProductEditor = typeof openNewProductEditor === "function" ? openNewProductEditor : null;
  const originalOpenAdminEditor = typeof openAdminEditor === "function" ? openAdminEditor : null;
  const originalRenderProducts = typeof renderProducts === "function" ? renderProducts : null;
  const originalRefreshSupabaseStatus = typeof refreshSupabaseStatus === "function" ? refreshSupabaseStatus : null;
  const originalCreateAdminProduct = typeof createAdminProduct === "function" ? createAdminProduct : null;
  const originalClearProductImage = typeof clearProductImage === "function" ? clearProductImage : null;
  const originalClearProductVideo = typeof clearProductVideo === "function" ? clearProductVideo : null;
  if(!originalApplyFilters || !originalOpenNewProductEditor || !originalOpenAdminEditor || !originalRenderProducts || !originalCreateAdminProduct) return;

  let duplicateSourceProduct = null;

  function skuCompare(a,b){
    return String(a?.sku || "").localeCompare(
      String(b?.sku || ""),
      "es",
      {numeric:true,sensitivity:"base"}
    );
  }

  function productMediaUrls(product){
    return [
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(typeof productVideoUrls === "function" ? productVideoUrls(product) : [])
    ].filter(Boolean);
  }

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
    if(state.admin && sort === "featured") products.sort(skuCompare);
    if(sort === "priceAsc") products.sort((a,b)=>a.price-b.price);
    if(sort === "priceDesc") products.sort((a,b)=>b.price-a.price);
    if(sort === "nameAsc") products.sort((a,b)=>a.name.localeCompare(b.name,"es"));
    if(sort === "nameDesc") products.sort((a,b)=>b.name.localeCompare(a.name,"es"));

    state.filtered = products;
    state.page = 1;
    renderProducts();
    if(typeof updateCatalogDiagnostic === "function") updateCatalogDiagnostic();
  }

  function addDuplicateButton(card,product){
    const info = card.querySelector(".product-info");
    if(!info || card.querySelector(".admin-duplicate-btn")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-duplicate-btn";
    button.textContent = "⧉ Duplicar producto";
    button.title = `Duplicar ${product.sku || "producto"}`;

    const editButton = card.querySelector(".admin-edit-btn");
    if(editButton){
      editButton.insertAdjacentElement("afterend",button);
    }else{
      info.appendChild(button);
    }

    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      openDuplicateProductEditor(product);
    });
  }

  function decorateAdminCards(){
    if(!state.admin) return;
    const visibleProducts = state.filtered.slice((state.page-1)*state.pageSize, state.page*state.pageSize);
    const cards = [...document.querySelectorAll("#productGrid .product-card")];
    cards.forEach((card,index)=>{
      const product = visibleProducts[index];
      if(!product) return;
      const status = card.querySelector(".product-info .stock-line b");
      const stock = Number(product.totalStock || 0);
      if(status){
        if(product.active === false){
          status.textContent = "⚠️ Oculto al público";
        }else if(stock <= 0){
          status.textContent = "⚠️ Sin existencias · oculto a clientes";
        }else{
          status.textContent = "✅ Visible para clientes";
        }
      }
      if(stock <= 0){
        let badge = card.querySelector(".badge");
        if(!badge){
          badge = document.createElement("span");
          badge.className = "badge";
          card.querySelector(".image-wrap")?.appendChild(badge);
        }
        if(product.active !== false) badge.textContent = "SIN STOCK";
      }
      addDuplicateButton(card,product);
    });
  }

  renderProducts = function(){
    originalRenderProducts();
    decorateAdminCards();
  };

  applyFilters = adminAwareApplyFilters;

  if(originalRefreshSupabaseStatus){
    refreshSupabaseStatus = async function(){
      const result = await originalRefreshSupabaseStatus();
      if(typeof state !== "undefined" && state.admin) applyFilters();
      return result;
    };
  }

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
    duplicateSourceProduct = null;
    originalOpenNewProductEditor();
    setDeleteVisibility(false);
  };

  openAdminEditor = function(product){
    duplicateSourceProduct = null;
    originalOpenAdminEditor(product);
    setDeleteVisibility(true);
  };

  function duplicateVariantRows(product){
    const existingVariants = Array.isArray(product?.variants) ? product.variants : [];
    const productSizes = Array.isArray(product?.sizes) ? product.sizes : [];
    const standardSizes = typeof STANDARD_PRODUCT_SIZES !== "undefined"
      ? STANDARD_PRODUCT_SIZES
      : ["XS","S","M","G","XG"];
    const sizeNames = [...new Set([
      ...standardSizes,
      ...productSizes,
      ...existingVariants.map(variant=>variant.size).filter(Boolean)
    ])];

    return sizeNames.map(size=>{
      const variant = existingVariants.find(item=>item.size===size);
      const quantity = variant
        ? Number(variant.quantity || 0)
        : Number(product?.stock?.[size] || 0);
      return {size,quantity:Math.max(0,Math.floor(quantity))};
    });
  }

  function openDuplicateProductEditor(product){
    if(!state.admin){
      alert("Solo ADMIN puede duplicar productos.");
      return;
    }

    duplicateSourceProduct = product;
    originalOpenAdminEditor(product);

    document.getElementById("adminProductDbId").value = "";
    document.getElementById("adminEditorMode").value = "new";
    document.getElementById("adminModalTitle").textContent = "Duplicar producto";
    document.getElementById("saveAdminProduct").textContent = "Crear copia";
    document.getElementById("disableAdminProduct")?.classList.add("hidden");
    document.getElementById("existingStockEditor")?.classList.add("hidden");
    document.getElementById("newVariantBuilder")?.classList.remove("hidden");

    newProductVariants = duplicateVariantRows(product);
    renderNewVariantRows();
    setDeleteVisibility(false);

    const skuInput = document.getElementById("adminSku");
    if(skuInput){
      skuInput.readOnly = false;
      skuInput.focus();
      skuInput.select();
    }

    if(typeof setAdminEditorStatus === "function"){
      setAdminEditorStatus(
        `Copia de ${product.sku || "producto"} preparada. Cambia el SKU y cualquier precio o dato que necesites; el original no se modificará.`,
        "ok"
      );
    }
  }

  async function copySourceMediaToNewSku(){
    if(!duplicateSourceProduct) return;

    await requireShopAdmin();

    const skuInput = document.getElementById("adminSku");
    const targetSku = skuInput?.value.trim() || "";
    const sourceSku = String(duplicateSourceProduct.sku || "").trim();

    if(!targetSku){
      throw new Error("Falta el SKU de la copia.");
    }

    if(targetSku === sourceSku){
      skuInput?.focus();
      skuInput?.select();
      throw new Error("Cambia el SKU antes de crear la copia.");
    }

    const {data:matches,error:checkError} = await shopSupabase
      .from("shop_products")
      .select("id")
      .eq("sku",targetSku)
      .limit(1);

    if(checkError) throw checkError;
    if(matches?.length){
      skuInput?.focus();
      skuInput?.select();
      throw new Error("Ese SKU ya existe. Escribe uno diferente.");
    }

    const sourceUrls = new Set(productMediaUrls(duplicateSourceProduct));
    if(!sourceUrls.size) return;

    const cloneInput = async (input,label)=>{
      if(!input) return;
      const currentUrl = input.value.trim();
      if(!currentUrl || !sourceUrls.has(currentUrl)) return;

      const sourcePath = typeof storagePathFromPublicUrl === "function"
        ? storagePathFromPublicUrl(currentUrl)
        : null;

      if(!sourcePath) return;

      const extensionMatch = sourcePath.match(/\.([a-z0-9]+)$/i);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "bin";
      const unique = Math.random().toString(36).slice(2,8);
      const targetPath = `${safeFilePart(targetSku)}/${Date.now()}-${label}-${unique}.${safeFilePart(extension)}`;

      const {error:copyError} = await shopSupabase
        .storage
        .from(PRODUCT_IMAGE_BUCKET)
        .copy(sourcePath,targetPath);

      if(copyError){
        throw new Error(`No se pudo duplicar ${label} en Storage: ${copyError.message}`);
      }

      const {data:urlData} = shopSupabase
        .storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(targetPath);

      if(!urlData?.publicUrl){
        throw new Error(`No se pudo obtener la URL de ${label} duplicado.`);
      }

      input.value = urlData.publicUrl;
    };

    if(typeof setAdminEditorStatus === "function"){
      setAdminEditorStatus("Duplicando fotos y videos para que la copia sea independiente…");
    }

    for(let slot=1;slot<=5;slot++){
      await cloneInput(document.getElementById(`adminImage${slot}`),`imagen-${slot}`);
    }

    for(let slot=1;slot<=3;slot++){
      await cloneInput(document.getElementById(`adminVideoUrl${slot}`),`video-${slot}`);
    }

    if(typeof refreshAllImagePreviews === "function") refreshAllImagePreviews();
    if(typeof refreshAllVideoPreviews === "function") refreshAllVideoPreviews();
  }

  createAdminProduct = async function(){
    if(!duplicateSourceProduct){
      return originalCreateAdminProduct();
    }

    await copySourceMediaToNewSku();
    const result = await originalCreateAdminProduct();
    duplicateSourceProduct = null;
    return result;
  };

  if(originalClearProductImage){
    clearProductImage = async function(slot){
      if(duplicateSourceProduct){
        const input = typeof imageInput === "function"
          ? imageInput(slot)
          : document.getElementById(`adminImage${slot}`);
        const currentUrl = input?.value.trim() || "";
        if(currentUrl && productMediaUrls(duplicateSourceProduct).includes(currentUrl)){
          input.value = "";
          if(typeof refreshImagePreview === "function") refreshImagePreview(slot);
          if(typeof setAdminEditorStatus === "function"){
            setAdminEditorStatus(`Imagen ${slot} quitada de la copia. El archivo del producto original se conserva.`,"ok");
          }
          return;
        }
      }
      return originalClearProductImage(slot);
    };
  }

  if(originalClearProductVideo){
    clearProductVideo = async function(slot){
      if(duplicateSourceProduct){
        const input = typeof videoInput === "function"
          ? videoInput(slot)
          : document.getElementById(`adminVideoUrl${slot}`);
        const currentUrl = input?.value.trim() || "";
        if(currentUrl && productMediaUrls(duplicateSourceProduct).includes(currentUrl)){
          input.value = "";
          if(typeof refreshVideoPreview === "function") refreshVideoPreview(slot);
          if(typeof setAdminEditorStatus === "function"){
            setAdminEditorStatus(`Video ${slot} quitado de la copia. El archivo del producto original se conserva.`,"ok");
          }
          return;
        }
      }
      return originalClearProductVideo(slot);
    };
  }

  async function removeProductMedia(product){
    if(!product) return;
    const urls = productMediaUrls(product);
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

  function resetDuplicateState(){
    duplicateSourceProduct = null;
  }

  function installDuplicateCancelGuards(){
    ["closeAdminModal","cancelAdminProduct"].forEach(id=>{
      document.getElementById(id)?.addEventListener("click",resetDuplicateState);
    });
    document.getElementById("adminModal")?.addEventListener("click",event=>{
      if(event.target === event.currentTarget) resetDuplicateState();
    });
  }

  function addAdminStatusStyles(){
    if(document.getElementById("w656AdminVisibilityStyles")) return;
    const style = document.createElement("style");
    style.id = "w656AdminVisibilityStyles";
    style.textContent = `
      body.admin-mode .product-card{position:relative}
      body.admin-mode .product-card .badge{z-index:3}
      .admin-duplicate-btn{
        width:100%;
        margin-top:8px;
        padding:9px 10px;
        border:1px solid var(--blue-dark);
        border-radius:9px;
        background:#eef2f6;
        color:#31404a;
        font-weight:800
      }
      .admin-duplicate-btn:hover{background:var(--blue);color:#27333a}
      #deleteAdminProduct{font-weight:900}
    `;
    document.head.appendChild(style);
  }

  addAdminStatusStyles();
  ensureDeleteButton();
  installDuplicateCancelGuards();
  if(typeof state !== "undefined" && state.admin) applyFilters();
})();
