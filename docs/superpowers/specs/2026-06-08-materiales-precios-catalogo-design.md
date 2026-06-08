# MATERIALES · Precios desde catálogo + limpieza receta vieja (diseño)

**Proyecto:** PUNTO ROJO (`index.html` monolito). Refinamiento de Fase 1 (ya en producción, v514).
**Fecha:** 2026-06-08
**Decisiones del usuario (brainstorming):** Excel = solo cantidades; el catálogo de proveedores es la **única fuente** de precios; **1 producto = 1 proveedor**; **solo admin** edita precios/proveedores; **eliminar** los botones viejos de receta (IMPORTAR DESDE PDF, EDITAR RECETA, label "CANTIDAD POR APTO").

---

## 1. Objetivo

Que el precio de cada material de la receta salga del **catálogo de proveedores** (que ya existe en la app), no del Excel. El admin gestiona proveedores, productos y precios dentro de la app; la receta (y la futura OC) leen de ahí. Además, quitar la UI vieja de receta que quedó obsoleta.

---

## 2. Contexto (qué existe)

- **Catálogo de proveedores** (ya existe, botón `CATÁLOGO DE PRECIOS`): `p.materiales.proveedores[] = {id, nombre, contacto, telefono, productos:[{nombre, unidad, precio}]}`. Funciones: `openCatalogoProveedores()` (gate `users.manage`), `renderCatProvList/selectCatProv/renderCatProvProductos/addProductoToProveedor/updateCatProvProducto/deleteCatProvProducto`. Ya permite agregar productos por proveedor, editar nombre/unidad/precio y buscar. **No se toca su comportamiento** (sigue admin-only).
- **Fase 1:** `p.materiales.precios` (mapa producto→{proveedor,precio,unidad}) sembrado desde la hoja PRECIOS del Excel; `renderRecetaV2` lee el P.U. de ese mapa; `verCatalogoPreciosReceta()` lo edita. **Esto se reemplaza** por lectura desde el catálogo.
- **HTML viejo de receta** (`#mat-receta` → primera `.card` → `.card-hd`, ~L2713-2726): `<h3>RECETA DE MATERIAL POR ETAPA</h3>`, `#recetaModeLabel` ("CANTIDAD POR APTO…"), label **IMPORTAR DESDE PDF** (`importRecetaFromPDF`), `#btnRecetaLimpiar` (LIMPIAR RECETA), `#btnRecetaEdit` (EDITAR RECETA), y `.receta-intro` (texto que describe el flujo viejo + PDF).

---

## 3. Cambios

### 3.1 Importar = solo cantidades
- `importarRecetaExcel`: no escribir `p.materiales.precios`. El resumen del modal ya no menciona "productos en precios".
- `parseRecetaWorkbook`: dejar de construir `precios` (o construirlo pero ignorarlo). La hoja `PRECIOS` del Excel se ignora si viene. La validación de "torre/nivel" se mantiene.
- `p.materiales.precios` queda **deprecado** (no se escribe ni se lee). No se borra el campo (compatibilidad), simplemente no se usa.

### 3.2 Precio en la receta = lookup en el catálogo (por nombre)
Nuevo helper puro:
```js
function matchKeyProducto(nombre){ return normProducto(nombre).trim().toUpperCase(); }
// Devuelve {proveedorId, proveedor, precio, unidad} o null
function precioDeProductoReceta(p, materialNombre){
  const key = matchKeyProducto(materialNombre);
  for (const prv of (p.materiales.proveedores||[])){
    for (const prod of (prv.productos||[])){
      if (matchKeyProducto(prod.nombre) === key)
        return { proveedorId: prv.id, proveedor: prv.nombre, precio: Number(prod.precio)||0, unidad: prod.unidad||'' };
    }
  }
  return null;
}
```
- `renderRecetaV2`: el P.U. y subtotal por línea salen de `precioDeProductoReceta(p, l.m)` (antes `precios[prod]`). Sin match → "—".
- **1 producto = 1 proveedor:** la primera coincidencia es la válida. Si el admin creara duplicados en el catálogo, se usa el primero (caso evitado por el flujo de §3.3).

### 3.3 Panel "Precios de la receta" (reemplaza `verCatalogoPreciosReceta`)
Botón **PRECIOS** del encabezado de la receta abre un modal que:
- Lista los **productos distintos de la receta** (`recetaV2`, normalizados con `normProducto`, deduplicados, ordenados).
- Por cada producto: muestra **PROVEEDOR + PRECIO** desde el catálogo (`precioDeProductoReceta`), o **"SIN PRECIO"** (resaltado).
- **Admin** (`users.manage`):
  - Productos **SIN PRECIO** → botón **"Asignar a proveedor"**: modal con (a) selector de proveedor de `p.materiales.proveedores` —si no hay proveedores, avisa "creá un proveedor en el catálogo primero" y ofrece abrirlo— y (b) precio. Al confirmar: **crea** `{nombre: <nombre del producto de la receta>, unidad: <unidad de la receta>, precio}` en `prv.productos` (nombre idéntico al material → match garantizado), `saveState()` + `forceUploadNow()`.
  - Productos **con precio** → editar el precio inline (escribe en el producto del catálogo) y link **"editar en catálogo"** (abre `openCatalogoProveedores` en ese proveedor) para cambiar proveedor/nombre/borrar.
- **No admin:** solo ve (proveedor + precio o SIN PRECIO), sin acciones.
- Encabezado: contador "N sin precio".

### 3.4 Eliminar UI vieja de receta
En `#mat-receta`, la **primera `.card-hd`** (la que tiene `<h3>RECETA DE MATERIAL POR ETAPA</h3>`, `#recetaModeLabel`, IMPORTAR DESDE PDF, `#btnRecetaLimpiar`, `#btnRecetaEdit`) y la `.receta-intro` que le sigue se **eliminan por completo** del HTML. El encabezado de la sección pasa a ser el del `#recetaV2Wrap` (su título "RECETA DE MATERIAL" + los botones CARGAR/PRECIOS/SOLICITUDES), evitando títulos duplicados.
- Como esos elementos desaparecen del DOM, `_recetaV2LegacyEls()` (Fase 1) debe **dejar de referenciarlos**: quitar de su lista `card-hd`, `receta-intro`, `recetaModeLabel` y `btnRecetaLimpiar`. Sigue ocultando `recetaStageTabs`, `recetaContent` y la card "PEDIR ETAPA COMPLETA POR NIVEL" (esta última se rehace en Fase 2).
- Seguridad: los consumidores viejos guardan null (`renderReceta` hace `if (lblMode)` y `if (btnLimpiar)`), y `toggleRecetaEditMode`/`importRecetaFromPDF`/`limpiarRecetaImportada` ya no tienen botón que los invoque. Por eso quitar los elementos no rompe nada.
- Las funciones JS viejas (`importRecetaFromPDF`, `toggleRecetaEditMode`, `limpiarRecetaImportada`, `renderReceta`) **no se borran** (otro código podría referenciarlas); solo se quita su UI. (Limpieza profunda de código muerto = fuera de alcance.)

---

## 4. Permisos
- Editar/asignar precios y gestionar el catálogo: **admin** (`users.manage`).
- Ver precios en la receta y en el panel: cualquiera con acceso a materiales (`view.materiales`).
- El botón **PRECIOS** se muestra a todos (solo lectura para no-admin); las acciones de asignar/editar van gateadas por `users.manage` dentro del modal.

---

## 5. Persistencia y errores
- Todo escribe en `p.materiales.proveedores` vía `saveState()` + `CloudSync.forceUploadNow()` (igual que el catálogo actual).
- Si no hay proveedores al asignar → mensaje claro + atajo a abrir el catálogo.
- Match insensible a mayúsculas/espacios vía `matchKeyProducto`. El catálogo guarda nombres en MAYÚSCULA (convención actual); el normalizado los compara bien.

---

## 6. Pruebas
1. **`matchKeyProducto` / `precioDeProductoReceta` (Node, puras):** "Plancha ultra" matchea "PLANCHA ULTRA"; "Plancha ultra / TABIQUES" matchea "PLANCHA ULTRA"; "Clavos de fijación" matchea "CLAVO DE FIJACIÓN"; sin match → null; toma proveedor+precio del catálogo.
2. **Import:** cargar plantilla (con o sin hoja PRECIOS) → `recetaV2` se llena, `p.materiales.precios` NO se escribe; el resumen no menciona precios.
3. **Receta:** material con producto en catálogo muestra P.U./subtotal; sin producto muestra "—".
4. **Panel precios:** SIN PRECIO → asignar a proveedor → crea el producto en el catálogo → la receta ya muestra el precio; el producto aparece en `CATÁLOGO DE PRECIOS` del proveedor.
5. **Permisos:** no-admin ve precios pero no puede asignar/editar.
6. **Limpieza:** los 3 botones/label viejos ya no aparecen; con receta cargada o sin cargar la sección se ve limpia; `errs=1` en valjs.

---

## 7. Fuera de alcance
- Fase 2 (pedir por etapa+nivel → compras) y Fase 3 (OC automática). La OC de Fase 3 usará `precioDeProductoReceta` como fuente.
- Rehacer la card "PEDIR ETAPA COMPLETA POR NIVEL" (Fase 2).
- Borrar el código muerto del sistema viejo de receta (solo se quitan los botones de la UI).
