# MATERIALES · Precios desde catálogo + limpieza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el precio de cada material de la receta salga del catálogo de proveedores (única fuente), el Excel cargue solo cantidades, y se quite la UI vieja de receta (IMPORTAR DESDE PDF, EDITAR RECETA, label "CANTIDAD POR APTO").

**Architecture:** Todo en `index.html`. Se agregan 2 funciones puras (`matchKeyProducto`, `precioDeProductoReceta`) al bloque con sentinelas `// ===RECETA-PURE-START/END===` (testeadas con el arnés Node de `_recetatest/`). La vista de receta y el panel de precios pasan a leer/escribir el catálogo `p.materiales.proveedores`. El mapa `p.materiales.precios` de Fase 1 queda sin uso. Se borra la card-hd vieja del HTML.

**Tech Stack:** HTML/JS vanilla; Node 24 solo para tests de lógica pura y validar JS. Spec: `docs/superpowers/specs/2026-06-08-materiales-precios-catalogo-design.md`.

**Convenciones (cada commit de código):**
- Validar: `node _recetatest/valjs.js` debe terminar `errs=1` (nunca más).
- Tests puros: `node _recetatest/run.js`.
- Versión: bump `CACHE_VERSION` en `sw.js` + chip `<span ...>vNNN</span>` en el footer de `index.html`.
- Commit termina con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. **Push solo cuando el usuario lo pida.**
- Rama actual: `feat/materiales-precios-catalogo`. Working dir: `C:\Users\Antonio Caravantes\Downloads\puntorojo-work`.

---

## Task 1: Funciones puras `matchKeyProducto` + `precioDeProductoReceta`

**Files:** Modify `index.html` (dentro de sentinelas), `_recetatest/run.js` (exponer), `_recetatest/tests.js` (tests).

- [ ] **Step 1: Exponer las nuevas funciones en el arnés.** En `_recetatest/run.js`, en la línea `new Function('api', code + '...')(api);`, agregar al final de la cadena de `code + '...'` (antes de `)(api);`) estas dos asignaciones:

```
api.matchKeyProducto=typeof matchKeyProducto!=="undefined"?matchKeyProducto:undefined;api.precioDeProductoReceta=typeof precioDeProductoReceta!=="undefined"?precioDeProductoReceta:undefined;
```

- [ ] **Step 2: Escribir los tests que fallan.** En `_recetatest/tests.js`, antes del `};` final del `module.exports`, agregar:

```js
  // --- precios desde catálogo ---
  const pFake = { materiales: { proveedores: [
    { id:'pr1', nombre:'SISTEGUA', productos:[{nombre:'PLANCHA ULTRA', unidad:'U', precio:78.5}] },
    { id:'pr2', nombre:'OTRO', productos:[{nombre:'CLAVO DE FIJACIÓN', unidad:'U', precio:2}] }
  ]}};
  eq('mk.basic', t.api.matchKeyProducto('Plancha ultra'), 'PLANCHA ULTRA');
  eq('mk.tab', t.api.matchKeyProducto('Plancha ultra / TABIQUES'), 'PLANCHA ULTRA');
  const pp = t.api.precioDeProductoReceta(pFake, 'Plancha ultra / TABIQUES');
  eq('pp.precio', pp.precio, 78.5);
  eq('pp.prov', pp.proveedor, 'SISTEGUA');
  const pc = t.api.precioDeProductoReceta(pFake, 'Clavos de fijación');
  eq('pp.clavo', pc.precio, 2);
  t.ok('pp.none', t.api.precioDeProductoReceta(pFake, 'Inexistente XYZ') === null);
```

- [ ] **Step 3: Correr para verlo fallar.** Run: `node _recetatest/run.js` → FAIL/exit (matchKeyProducto undefined).

- [ ] **Step 4: Implementar.** En `index.html`, dentro de las sentinelas, INMEDIATAMENTE ANTES de `// ===RECETA-PURE-END===`, agregar:

```js
function matchKeyProducto(nombre){ return normProducto(nombre).trim().toUpperCase(); }
function precioDeProductoReceta(p, materialNombre){
  const key = matchKeyProducto(materialNombre);
  const provs = (p && p.materiales && p.materiales.proveedores) || [];
  for (const prv of provs){
    for (const prod of (prv.productos||[])){
      if (matchKeyProducto(prod.nombre) === key)
        return { proveedorId: prv.id, proveedor: prv.nombre, precio: Number(prod.precio)||0, unidad: prod.unidad||'' };
    }
  }
  return null;
}
```

- [ ] **Step 5: Correr para verlo pasar.** Run: `node _recetatest/run.js` → `PASS=29 FAIL=0` (23 previos + 6 nuevos).

- [ ] **Step 6: Validar JS y commit.** Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): precioDeProductoReceta lee precio del catalogo de proveedores

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: La receta muestra el P.U. desde el catálogo

**Files:** Modify `index.html` (función `renderRecetaV2`).

- [ ] **Step 1: Cambiar el lookup de precio.** Grep para el bloque (dentro de `window.renderRecetaV2`):
```js
    lineas.forEach(l => {
      const prod = normProducto(l.m);
      const pu = precios[prod] && precios[prod].precio ? precios[prod].precio : 0;
```
Reemplazarlo por:
```js
    lineas.forEach(l => {
      const info = precioDeProductoReceta(p, l.m);
      const pu = info ? info.precio : 0;
```

- [ ] **Step 2: Quitar la variable `precios` ya sin uso.** Grep dentro de `renderRecetaV2` la línea:
```js
  const precios = p.materiales.precios || {};
```
y eliminarla (borrar esa línea).

- [ ] **Step 3: Validar.** Run: `node _recetatest/valjs.js` → `errs=1`. Run: `node _recetatest/run.js` → `PASS=29 FAIL=0`.

- [ ] **Step 4: Verificación funcional** (manual, post-deploy o navegador): con un producto en el catálogo cuyo nombre coincide con un material, la receta muestra su P.U. y subtotal; sin producto en catálogo muestra "—".

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(receta): P.U. de la receta sale del catalogo (no del mapa precios)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Panel "PRECIOS de la receta" (estado + asignar a proveedor)

Reescribe `verCatalogoPreciosReceta` y reemplaza `setPrecioReceta` (Fase 1) por dos funciones nuevas.

**Files:** Modify `index.html`.

- [ ] **Step 1: Reemplazar las funciones.** Grep `window.verCatalogoPreciosReceta = async function(){` y reemplazar ESA función completa Y la función `window.setPrecioReceta = function(...){...};` que le sigue, por este bloque:

```js
window.verCatalogoPreciosReceta = async function(){
  const p = activeProj();
  const rv = p.materiales && p.materiales.recetaV2;
  if (!rv || !rv.niveles) return showToast('CARGÁ UNA RECETA PRIMERO','red');
  const esAdmin = can('users.manage');
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money = n => 'Q' + (Number(n)||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const provs = (p.materiales.proveedores||[]);
  // productos distintos de la receta
  const set = new Map();
  Object.values(rv.niveles).forEach(etapas => etapas.forEach(lineas => lineas.forEach(l => {
    const key = matchKeyProducto(l.m);
    if (!set.has(key)) set.set(key, { nombre: normProducto(l.m), unidad: l.u||'' });
  })));
  const prods = [...set.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  const sinPrecio = prods.filter(x => !precioDeProductoReceta(p, x.nombre)).length;
  let body = '<div style="font-size:11.5px;color:#475569;margin-bottom:10px">Los precios salen del <strong>catálogo de proveedores</strong>. '+(sinPrecio?('<span style="color:#B45309">'+sinPrecio+' sin precio.</span>'):'Todos con precio.')+'</div>';
  if (esAdmin && !provs.length) body += '<div style="margin-bottom:10px;padding:10px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;color:#92400E;font-size:11px">No hay proveedores. Creá uno en el catálogo para poder asignar precios.</div>';
  body += '<div style="max-height:55vh;overflow:auto;border:1px solid #E5E7EB;border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="position:sticky;top:0;background:#374151;color:#fff;font-size:10px"><th style="text-align:left;padding:6px 8px">PRODUCTO</th><th style="padding:6px 4px">PROVEEDOR</th><th style="text-align:right;padding:6px 8px">PRECIO Q</th></tr></thead><tbody>';
  prods.forEach(x => {
    const info = precioDeProductoReceta(p, x.nombre);
    const pn = esc(x.nombre).replace(/'/g,"\\'");
    const un = esc(x.unidad).replace(/'/g,"\\'");
    let provCell, precioCell;
    if (esAdmin){
      const opts = '<option value="">— elegir —</option>' + provs.map(pr => '<option value="'+esc(pr.id)+'"'+(info && info.proveedorId===pr.id?' selected':'')+'>'+esc(pr.nombre)+'</option>').join('');
      provCell = '<select onchange="setProvRecetaProducto(\''+pn+'\',\''+un+'\',this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #D1D5DB;border-radius:5px;max-width:150px">'+opts+'</select>';
      precioCell = '<input type="number" step="0.01" value="'+(info?info.precio:0)+'" oninput="setPrecioRecetaProducto(\''+pn+'\',this.value)" style="width:90px;font-size:11px;padding:3px 6px;border:1px solid '+(info && info.precio>0?'#D1D5DB':'#FBBF24')+';border-radius:5px;text-align:right">';
    } else {
      provCell = '<span style="color:'+(info?'#374151':'#B45309')+'">'+(info?esc(info.proveedor):'SIN PRECIO')+'</span>';
      precioCell = info?money(info.precio):'—';
    }
    body += '<tr style="border-top:1px solid #F1F5F9"><td style="padding:5px 8px">'+esc(x.nombre)+'</td><td style="padding:3px 4px;text-align:center">'+provCell+'</td><td style="padding:3px 8px;text-align:right">'+precioCell+'</td></tr>';
  });
  body += '</tbody></table></div>';
  if (esAdmin) body += '<div style="margin-top:10px;text-align:right"><button class="btn ghost sm" onclick="openCatalogoProveedores()">ABRIR CATÁLOGO DE PROVEEDORES</button></div>';
  await window.prConfirm({ title:'PRECIOS DE LA RECETA', bodyHTML:body, okText:'CERRAR', cancelText:'', wide:true });
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  if (typeof renderRecetaV2==='function') renderRecetaV2();
};
// Encuentra el producto en el catálogo que matchea (devuelve {prv, idx} o null)
window._findCatProducto = function(p, nombre){
  const key = matchKeyProducto(nombre);
  for (const prv of (p.materiales.proveedores||[])){
    const arr = prv.productos||[];
    for (let i=0;i<arr.length;i++){ if (matchKeyProducto(arr[i].nombre)===key) return { prv, idx:i }; }
  }
  return null;
};
// Asigna/mueve el producto al proveedor elegido
window.setProvRecetaProducto = function(nombre, unidad, proveedorId){
  if (!can('users.manage')) return showToast('SOLO ADMIN','red');
  const p = activeProj();
  const target = (p.materiales.proveedores||[]).find(x => x.id===proveedorId);
  const cur = window._findCatProducto(p, nombre);
  if (!proveedorId){ return; }
  if (!target) return showToast('PROVEEDOR NO ENCONTRADO','red');
  if (!Array.isArray(target.productos)) target.productos = [];
  if (cur){
    if (cur.prv.id === target.id) return; // ya está ahí
    const prod = cur.prv.productos.splice(cur.idx,1)[0]; // mover
    target.productos.push(prod);
  } else {
    target.productos.push({ nombre: String(nombre), unidad: String(unidad||''), precio: 0 });
  }
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  showToast('PROVEEDOR ASIGNADO','green');
};
// Pone el precio en el producto del catálogo (debe existir; si no, pedir proveedor primero)
window.setPrecioRecetaProducto = function(nombre, valor){
  if (!can('users.manage')) return;
  const p = activeProj();
  const cur = window._findCatProducto(p, nombre);
  if (!cur){ showToast('ELEGÍ PROVEEDOR PRIMERO','red'); return; }
  cur.prv.productos[cur.idx].precio = Number(valor)||0;
  saveState();
};
```

- [ ] **Step 2: Validar.** Run: `node _recetatest/valjs.js` → `errs=1`. Run: `node _recetatest/run.js` → `PASS=29 FAIL=0`.

- [ ] **Step 3: Verificación funcional** (post-deploy/navegador): admin abre PRECIOS → ve productos con SIN PRECIO; elige proveedor en el select (crea/mueve el producto en el catálogo) → escribe precio → cierra → la receta muestra el precio; el producto aparece en CATÁLOGO DE PRECIOS de ese proveedor. No-admin ve solo lectura.

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(receta): panel PRECIOS lee/escribe el catalogo de proveedores

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Importar = solo cantidades (no escribir precios)

**Files:** Modify `index.html` (función `importarRecetaExcel`).

- [ ] **Step 1: No escribir el mapa precios.** Grep la línea exacta dentro de `importarRecetaExcel`:
```js
    p.materiales.precios = precios;
```
y eliminarla.

- [ ] **Step 2: No destructurar `precios` y filtrar el aviso de precios.** Grep:
```js
    const { recetaV2, precios, avisos } = parseRecetaWorkbook(sheets, p.towers || []);
```
Reemplazar por:
```js
    const { recetaV2, avisos } = parseRecetaWorkbook(sheets, p.towers || []);
    const avisosShow = avisos.filter(a => !/sin precio/i.test(a));
```

- [ ] **Step 3: Ajustar el resumen del modal.** Grep la línea:
```js
      + '<div>Productos en precios: <strong>'+Object.keys(precios).length+'</strong></div>';
```
Reemplazar por (cierra el string sin la fila de precios):
```js
      + '';
```
Y Grep la línea que usa `avisos` para el resumen:
```js
    if (avisos.length) body += '<div style="margin-top:10px;padding:10px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;color:#92400E;font-size:11px">'+avisos.map(a=>'• '+a.replace(/[&<>]/g,'')).join('<br>')+'</div>';
```
Reemplazar `avisos` por `avisosShow` en esa línea (ambas ocurrencias: `if (avisosShow.length)` y `avisosShow.map`).

- [ ] **Step 4: Validar.** Run: `node _recetatest/valjs.js` → `errs=1`. Run: `node _recetatest/run.js` → `PASS=29 FAIL=0`.

- [ ] **Step 5: Verificación funcional:** cargar la plantilla → el modal NO muestra "Productos en precios" ni avisos de "sin precio"; `p.materiales.precios` no se escribe; la receta carga las cantidades.

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(receta): el importador carga solo cantidades (precios van por catalogo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Eliminar la UI vieja de receta

**Files:** Modify `index.html` (HTML de `#mat-receta` + función `_recetaV2LegacyEls`).

- [ ] **Step 1: Borrar la card-hd vieja + el intro.** Grep `<h3>RECETA DE MATERIAL POR ETAPA</h3>`. Eliminar el bloque exacto (la `.card-hd` completa y la `.receta-intro` que le sigue). old_string a reemplazar:

```html
          <div class="card-hd"><h3>RECETA DE MATERIAL POR ETAPA</h3>
            <span id="recetaModeLabel" style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mute);font-weight:600">Cantidad POR APTO · se multiplica al pedir el nivel completo</span>
            <label class="btn primary sm" style="cursor:pointer;margin-right:6px" data-perm="receta.edit" title="Subir un PDF tabular con la receta y la app extrae los datos automáticamente">
              IMPORTAR DESDE PDF
              <input type="file" accept="application/pdf,.pdf" style="display:none" onchange="importRecetaFromPDF(event)">
            </label>
            <button class="btn ghost sm hidden-no-pdf" onclick="limpiarRecetaImportada()" data-perm="receta.edit" id="btnRecetaLimpiar" title="Borrar la receta actual y volver a las 6 etapas vacías">LIMPIAR RECETA</button>
            <button class="btn ghost sm" onclick="toggleRecetaEditMode()" data-perm="receta.edit" id="btnRecetaEdit">EDITAR RECETA</button>
          </div>

          <div class="receta-intro">
            <p>ESTA RECETA DEFINE CUÁNTO MATERIAL LLEVA UN APARTAMENTO EN CADA ETAPA. AL PEDIR UNA ETAPA DE UN NIVEL, LA APP MULTIPLICA AUTOMÁTICAMENTE LOS MATERIALES POR LA CANTIDAD DE APTOS DEL NIVEL. UNA VEZ PEDIDA UNA ETAPA, NO SE PUEDE PEDIR DE NUEVO.</p>
            <p style="margin-top:8px"><strong>O subí un PDF</strong> con la receta tabular del cliente (formato: TORRE X, NIVEL Y, columnas por apto, filas por material agrupadas en etapas). La app detecta TODOS los datos automáticamente y los carga aquí.</p>
          </div>

```
new_string (deja un comentario en su lugar):
```html
          <!-- receta vieja (importar PDF / editar / por apto) eliminada — el header es #recetaV2Wrap -->
```

- [ ] **Step 2: Actualizar `_recetaV2LegacyEls` para no referenciar la card-hd/intro borradas.** Grep `function _recetaV2LegacyEls(){` y reemplazar la función completa por:

```js
function _recetaV2LegacyEls(){
  const els = [document.getElementById('recetaStageTabs'), document.getElementById('recetaContent')];
  const pedir = document.getElementById('recetaPedirContent');
  if (pedir){ const pc = pedir.closest('.card'); if (pc) els.push(pc); }
  return els.filter(Boolean);
}
```

- [ ] **Step 3: Validar.** Run: `node _recetatest/valjs.js` → `errs=1`. Run: `node _recetatest/run.js` → `PASS=29 FAIL=0`.

- [ ] **Step 4: Verificación funcional:** en MATERIALES → RECETA ya NO aparecen IMPORTAR DESDE PDF, EDITAR RECETA, LIMPIAR RECETA ni el texto "CANTIDAD POR APTO"; el encabezado es el del bloque nuevo (RECETA DE MATERIAL + botones). Sin receta cargada se ve el estado vacío; con receta cargada, la card "PEDIR ETAPA COMPLETA" sigue oculta.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "chore(receta): eliminar UI vieja (importar PDF, editar receta, por apto)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Verificación integral + versión + deploy

**Files:** Modify `sw.js`, `index.html` (chip de versión).

- [ ] **Step 1: Tests + validación final.** Run: `node _recetatest/run.js` → `PASS=29 FAIL=0`. Run: `node _recetatest/valjs.js` → `errs=1`.

- [ ] **Step 2: Bump de versión.** En `sw.js`: `const CACHE_VERSION = 'v515-precios-catalogo';`. En `index.html`, el chip del footer `<span style="opacity:.5;font-size:9px">v514</span>` → `v515`.

- [ ] **Step 3: Commit.**
```bash
git add index.html sw.js
git commit -m "release: v515 precios desde catalogo + limpieza receta vieja

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Merge + push (SOLO cuando el usuario lo pida).**
```bash
git checkout main && git merge --ff-only feat/materiales-precios-catalogo && git push origin main
```

---

## Cobertura del spec
- §3.1 (import solo cantidades) → Task 4. §3.2 (precio desde catálogo) → Tasks 1, 2. §3.3 (panel precios) → Task 3. §3.4 (limpieza) → Task 5. §4 (permisos) → gates `users.manage` en Task 3. §5 (persistencia) → `saveState()`+`forceUploadNow()` en Task 3. §6 (pruebas) → Tasks 1-5.
