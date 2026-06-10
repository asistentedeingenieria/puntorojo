# Catálogo de precios + OC automáticas — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Importar el Excel `DATOS_COMPRAS` a un catálogo editable (producto×proveedor→precio + datos de pago), con autorización para cambiar precios y manejo de compras eventuales; la OC automática por proveedor (más barato) ya existe.

**Architecture:** Parser puro (RECETA-PURE, testeable) → importador que hace merge en `state.proveedoresGlobales` (global). Autorización de precios vía `state.solicitudesPrecios` (patrón de solicitudes de pólizas). Eventuales: flag en el ítem de OC + promover vía solicitud de ALTA.

**Tech Stack:** PWA single-file, SheetJS (`XLSX`, ya cargado L56), jsPDF. Tests Node sin framework.

## Convenciones
- Pruebas puras entre `// ===RECETA-PURE-START===` y `// ===RECETA-PURE-END===`; exponer en `_recetatest/run.js` (`api.X=...`, local). Tests en `_recetatest/tests.js` (`t.eq`/`t.ok`).
- Verificación: `node _recetatest/valjs.js` → `blocks=26 errs=1`; `node _recetatest/run.js` → `FAIL=0`.
- Deploy: bump `sw.js` + chip footer; commit `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; push por fase (con OK del usuario ya dado: "dale de una vez todo").
- CRLF: re-Read antes de cada Edit.
- Anclajes: `_getProveedores()` L≈20650; catálogo modal `#modalCatalogoProveedores` L≈3281; `updateCatProvProducto` L≈21739; `deleteCatProvProducto` L≈21755; `verCatalogoPreciosReceta` L≈20885 / `setPrecioRecetaProducto`; `#modalAddProveedor` L≈3234 + `saveNewProveedor` L≈15405; OC: `generarOrdenCompra` L≈15490, `openOrdenCompra` L≈15168, `findBestProviderForItem` L≈15099, `updateOcItemProveedor` L≈15293, `updateOcPrecio` L≈15310, `#modalOrdenCompra` L≈3149; registro de permisos L≈4286-4322; helpers `matchKeyProducto`/`normOcName`, `requestDeletion`/solicitudes de pólizas como patrón.

---

## FASE 1 — Importador del Excel + datos de pago

### Task 1.1: Parser puro `parsePreciosExcel` + `parseProveedoresPago`

**Files:** `index.html` (RECETA-PURE), `_recetatest/run.js`, `_recetatest/tests.js`

- [ ] **Step 1: Tests (append a tests.js):**
```js
  // --- parsePreciosExcel ---
  const _aoa = [
    ['', '', ''],
    ['MATERIALES','PRECIOS','PROVEEDOR'],
    ['ACABADO FINO', 54.5, 'SISTEGUA, S.A.'],
    ['TORNILLO 1"', 8.5, 'SISTEGUA, S.A.'],
    ['ARENA DE RIO', 12.999, ''],
    ['', 10, 'X'],
    ['SIN PRECIO', 0, 'Y']
  ];
  const _pp = t.api.parsePreciosExcel(_aoa);
  eq('pp.count', _pp.items.length, 3);
  eq('pp.round', _pp.items[2].precio, 13);
  eq('pp.sinProv', _pp.items[2].proveedor, '');
  eq('pp.mat', _pp.items[0].material, 'ACABADO FINO');
  // --- parseProveedoresPago ---
  const _paoa = [['PROVEEDOR','N° CUENTA','TIPO CUENTA','BANCO'],['SISTEGUA, S.A.','123','MONETARIA','INDUSTRIAL'],['',' ',' ',' ']];
  const _pg = t.api.parseProveedoresPago(_paoa);
  eq('pg.count', _pg.length, 1);
  eq('pg.banco', _pg[0].banco, 'INDUSTRIAL');
```
- [ ] **Step 2: Exponer en run.js:** `api.parsePreciosExcel=typeof parsePreciosExcel!=="undefined"?parsePreciosExcel:undefined;api.parseProveedoresPago=typeof parseProveedoresPago!=="undefined"?parseProveedoresPago:undefined;`
- [ ] **Step 3: Correr → FALLA.**
- [ ] **Step 4: Implementar (antes de RECETA-PURE-END):**
```js
// Parsea AoA de la hoja PRECIOS_MATERIALES -> {items:[{material,precio,proveedor}], avisos}. Puro.
function parsePreciosExcel(aoa){
  const rows = Array.isArray(aoa) ? aoa : [];
  let hi=-1,cMat=-1,cPre=-1,cProv=-1;
  for(let i=0;i<rows.length && i<12;i++){
    const up=(rows[i]||[]).map(x=>String(x==null?'':x).trim().toUpperCase());
    const im=up.findIndex(x=>x.indexOf('MATERIAL')>=0);
    const ip=up.findIndex(x=>x.indexOf('PRECIO')>=0);
    if(im>=0 && ip>=0){ hi=i; cMat=im; cPre=ip; cProv=up.findIndex(x=>x.indexOf('PROVEEDOR')>=0); break; }
  }
  if(hi<0) return { items:[], avisos:['No se encontró el encabezado MATERIALES/PRECIOS/PROVEEDOR'] };
  const items=[], avisos=[];
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i]||[];
    const material=String(r[cMat]==null?'':r[cMat]).trim();
    if(!material) continue;
    const precio=Math.round((Number(r[cPre])||0)*100)/100;
    if(!(precio>0)){ avisos.push('Precio inválido: '+material); continue; }
    const proveedor=(cProv>=0)?String(r[cProv]==null?'':r[cProv]).trim():'';
    items.push({ material, precio, proveedor });
  }
  return { items, avisos };
}
// Parsea AoA de la hoja PROVEEDOR -> [{nombre,numeroCuenta,tipoCuenta,banco}]. Puro.
function parseProveedoresPago(aoa){
  const rows=Array.isArray(aoa)?aoa:[];
  let hi=-1,cN=-1,cCta=-1,cTipo=-1,cBanco=-1;
  for(let i=0;i<rows.length && i<12;i++){
    const up=(rows[i]||[]).map(x=>String(x==null?'':x).trim().toUpperCase());
    const iN=up.findIndex(x=>x.indexOf('PROVEEDOR')>=0);
    if(iN>=0){ hi=i; cN=iN; cTipo=up.findIndex(x=>x.indexOf('TIPO')>=0); cCta=up.findIndex(x=>x.indexOf('CUENTA')>=0 && up.indexOf(x)!==cTipo); cBanco=up.findIndex(x=>x.indexOf('BANCO')>=0); break; }
  }
  if(hi<0) return [];
  const out=[];
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i]||[];
    const nombre=String(r[cN]==null?'':r[cN]).trim();
    if(!nombre) continue;
    out.push({ nombre, numeroCuenta:cCta>=0?String(r[cCta]==null?'':r[cCta]).trim():'', tipoCuenta:cTipo>=0?String(r[cTipo]==null?'':r[cTipo]).trim():'', banco:cBanco>=0?String(r[cBanco]==null?'':r[cBanco]).trim():'' });
  }
  return out;
}
```
- [ ] **Step 5: Correr → PASA.** Commit `feat(materiales): parsers puros de precios y proveedores (import)`.

### Task 1.2: Importador `_importarPreciosExcel` + botón "SUBIR EXCEL DE PRECIOS"

**Files:** `index.html` (cerca del catálogo de proveedores + el modal `#modalCatalogoProveedores`)

- [ ] **Step 1:** Botón en el catálogo de proveedores (header del modal `#modalCatalogoProveedores` o junto a `+ AGREGAR PROVEEDOR`), solo admin/`precios.autorizar`:
```html
<label class="btn primary sm" style="cursor:pointer;margin:0" data-perm="users.manage">SUBIR EXCEL DE PRECIOS<input type="file" accept=".xlsx,.xls" style="display:none" onchange="_importarPreciosExcel(event)"></label>
```
- [ ] **Step 2:** Función importadora (usa `XLSX`, `_getProveedores`, `matchKeyProducto`/`normOcName`, `uid`, `saveState`, `CloudSync`, `window._prUploadShow/Hide`, `prAlert`, `showToast`):
```js
async function _importarPreciosExcel(event){
  if(!(can('users.manage')||can('precios.autorizar'))){ showToast('SOLO ADMIN / AUTORIZADOR','red'); event.target.value=''; return; }
  const file=event.target.files&&event.target.files[0]; if(!file){ return; }
  try{
    window._prUploadShow&&window._prUploadShow('PROCESANDO EXCEL…');
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const shPre=wb.Sheets['PRECIOS_MATERIALES']||wb.Sheets[wb.SheetNames.find(n=>/PRECIO/i.test(n))||wb.SheetNames[0]];
    const aoaPre=shPre?XLSX.utils.sheet_to_json(shPre,{header:1,defval:''}):[];
    const parsed=parsePreciosExcel(aoaPre);
    const shPrv=wb.Sheets['PROVEEDOR']||wb.Sheets[wb.SheetNames.find(n=>/PROVEEDOR/i.test(n))];
    const pagos=shPrv?parseProveedoresPago(XLSX.utils.sheet_to_json(shPrv,{header:1,defval:''})):[];
    const provs=_getProveedores();
    const findProv=nom=>{ const k=normOcName(nom); return provs.find(p=>normOcName(p.nombre)===k); };
    let creados=0, prodNuevos=0, prodUpd=0;
    const ensureProv=nom=>{ let pr=findProv(nom); if(!pr){ pr={id:'prv-'+uid(),nombre:String(nom).toUpperCase(),contacto:'',telefono:'',productos:[]}; provs.push(pr); creados++; } if(!pr.productos)pr.productos=[]; return pr; };
    const REF='SIN PROVEEDOR FIJO / REFERENCIA';
    parsed.items.forEach(it=>{
      const pr=ensureProv(it.proveedor? it.proveedor : REF);
      const k=matchKeyProducto(it.material);
      const ex=pr.productos.find(q=>matchKeyProducto(q.nombre)===k);
      if(ex){ ex.precio=it.precio; prodUpd++; } else { pr.productos.push({nombre:it.material.toUpperCase(),unidad:'',precio:it.precio,rendimiento:1}); prodNuevos++; }
    });
    let pagoSet=0;
    pagos.forEach(pg=>{ const pr=findProv(pg.nombre); if(pr){ pr.pago=Object.assign({},pr.pago,{numeroCuenta:pg.numeroCuenta,tipoCuenta:pg.tipoCuenta,banco:pg.banco}); pagoSet++; } });
    saveState(); try{ if(typeof CloudSync!=='undefined'&&CloudSync.uploadCurrent) await CloudSync.uploadCurrent(); }catch(e){}
    window._prUploadHide&&window._prUploadHide();
    if(typeof renderCatProvList==='function') renderCatProvList();
    await prAlert({ title:'IMPORTACIÓN COMPLETA', bodyHTML:'<div>Proveedores nuevos: <b>'+creados+'</b><br>Productos nuevos: <b>'+prodNuevos+'</b><br>Precios actualizados: <b>'+prodUpd+'</b><br>Datos de pago asignados: <b>'+pagoSet+'</b>'+(parsed.avisos.length?'<br><span style="color:#92400E;font-size:12px">Avisos: '+parsed.avisos.length+'</span>':'')+'</div>' });
  }catch(e){ window._prUploadHide&&window._prUploadHide(); console.error('[importPrecios]',e); showToast('ERROR AL IMPORTAR','red'); }
  finally{ event.target.value=''; }
}
```
- [ ] **Step 3:** Verificar (`valjs`/`run`). Commit `feat(materiales): importador de Excel de precios (merge en proveedores globales + datos de pago)`.

### Task 1.3: Ficha de proveedor con datos de pago

**Files:** `index.html` (`#modalAddProveedor` L≈3234, `saveNewProveedor` L≈15405, y el abridor de edición de proveedor `editCurrentProveedor`/`editProveedor`)

- [ ] **Step 1:** Agregar al modal `#modalAddProveedor` campos: `_provNumCuenta`, `_provTipoCuenta` (select: MONETARIA/AHORRO), `_provBanco`, `_provMetodoPago` (select: CHEQUE/EFECTIVO/TRANSFERENCIA/TC/TARJETA_DE_ABASTO), `_provTipoCompra` (select: CONTADO/CRÉDITO/CAJA_CHICA/TARJETA_DE_ABASTO).
- [ ] **Step 2:** En `saveNewProveedor` (y la edición), leer esos campos y guardarlos en `proveedor.pago={numeroCuenta,tipoCuenta,banco,metodoPago,tipoCompra}`. Al abrir editar, precargarlos desde `proveedor.pago`.
- [ ] **Step 3:** Verificar. Commit `feat(materiales): ficha de proveedor con datos de pago (cuenta/banco/metodo/tipo)`.

---

## FASE 2 — Autorización de cambios de precio

### Task 2.1: Permiso + estado + funciones de solicitud

**Files:** `index.html` (registro de permisos L≈4286; helpers de solicitudes)

- [ ] **Step 1:** Registrar permiso (grupo EDICIÓN MATERIALES, junto a `compras.autorizar`): `{ key:'precios.autorizar', label:'Autorizar cambios de precio del catálogo', group:'EDICIÓN MATERIALES' }`.
- [ ] **Step 2:** Estado: asegurar `state.solicitudesPrecios = state.solicitudesPrecios || []` (donde se inicializa el state global, junto a otras listas globales).
- [ ] **Step 3:** Funciones (patrón de solicitudes de pólizas; usar `currentUser`/`me`, `saveState`, `CloudSync`, `_notifyByPerm`, `uid`):
```js
function _crearSolicitudPrecio(tipo, proveedorId, productoNombre, unidad, precioActual, precioNuevo, motivo){
  const list=(state.solicitudesPrecios=state.solicitudesPrecios||[]);
  const prov=(_getProveedores().find(p=>p.id===proveedorId)||{});
  const u=(typeof currentUser==='function'?currentUser():(window.me||{}))||{};
  const s={ id:'sp-'+uid(), tipo:tipo, proveedorId, proveedorNombre:prov.nombre||'', productoNombre, unidad:unidad||'', precioActual:(precioActual==null?null:Number(precioActual)), precioNuevo:Number(precioNuevo), motivo:motivo||'', solicitadoPor:(u.username||u.uid||''), solicitadoNombre:(u.name||u.nombre||u.username||''), ts:Date.now(), estado:'PENDIENTE' };
  list.push(s); saveState(); try{ if(typeof CloudSync!=='undefined'&&CloudSync.uploadCurrent) CloudSync.uploadCurrent(); }catch(e){}
  try{ _notifyByPerm('precios.autorizar', { title:'SOLICITUD DE PRECIO', body:(tipo==='ALTA'?'Alta':'Cambio')+' de "'+productoNombre+'" a Q'+s.precioNuevo }); }catch(e){}
  return s;
}
function autorizarSolicitudPrecio(id){
  if(!(can('precios.autorizar')||can('users.manage'))) return showToast('SIN PERMISO','red');
  const s=(state.solicitudesPrecios||[]).find(x=>x.id===id); if(!s||s.estado!=='PENDIENTE') return;
  const prov=_getProveedores().find(p=>p.id===s.proveedorId); if(!prov){ s.estado='RECHAZADA'; saveState(); return; }
  prov.productos=prov.productos||[];
  const k=matchKeyProducto(s.productoNombre);
  const ex=prov.productos.find(q=>matchKeyProducto(q.nombre)===k);
  if(ex){ ex.precio=Number(s.precioNuevo); } else { prov.productos.push({nombre:String(s.productoNombre).toUpperCase(),unidad:s.unidad||'',precio:Number(s.precioNuevo),rendimiento:1}); }
  s.estado='AUTORIZADA'; s.resueltoTs=Date.now();
  saveState(); try{ if(typeof CloudSync!=='undefined'&&CloudSync.uploadCurrent) CloudSync.uploadCurrent(); }catch(e){}
  showToast('PRECIO AUTORIZADO','green'); if(typeof renderCatProvList==='function') renderCatProvList(); _renderSolicitudesPrecio&&_renderSolicitudesPrecio();
}
function rechazarSolicitudPrecio(id){
  if(!(can('precios.autorizar')||can('users.manage'))) return showToast('SIN PERMISO','red');
  const s=(state.solicitudesPrecios||[]).find(x=>x.id===id); if(!s||s.estado!=='PENDIENTE') return;
  s.estado='RECHAZADA'; s.resueltoTs=Date.now(); saveState(); try{ if(typeof CloudSync!=='undefined'&&CloudSync.uploadCurrent) CloudSync.uploadCurrent(); }catch(e){}
  showToast('SOLICITUD RECHAZADA',''); _renderSolicitudesPrecio&&_renderSolicitudesPrecio();
}
```
- [ ] **Step 4:** Verificar. Commit `feat(materiales): solicitudes de cambio/alta de precio (permiso + estado + funciones)`.

### Task 2.2: Gatear la edición de precio del catálogo

**Files:** `index.html` (`updateCatProvProducto` L≈21739, `setPrecioRecetaProducto`)

- [ ] **Step 1:** En `updateCatProvProducto(idx,field,value)`: si `field==='precio'` y NO `(can('precios.autorizar')||can('users.manage'))` → en vez de aplicar, abrir un prompt de motivo (prAlert/prompt modal) y llamar `_crearSolicitudPrecio('CAMBIO', proveedorId, producto.nombre, producto.unidad, producto.precio, value, motivo)`; NO modificar el precio; toast "SOLICITUD ENVIADA". Si es admin/autorizador → aplica directo (comportamiento actual).
- [ ] **Step 2:** Igual en `setPrecioRecetaProducto` (la vista de precios por receta).
- [ ] **Step 3:** Verificar. Commit `feat(materiales): cambiar precio sin permiso genera solicitud (no aplica directo)`.

### Task 2.3: UI "SOLICITUDES DE PRECIO"

**Files:** `index.html` (catálogo de proveedores + un modal nuevo)

- [ ] **Step 1:** Botón "SOLICITUDES DE PRECIO (N)" en el header del catálogo, visible solo si hay pendientes y el usuario es `precios.autorizar`/admin → abre modal.
- [ ] **Step 2:** `_renderSolicitudesPrecio()` + modal: lista de pendientes (proveedor, producto, precio actual→nuevo, motivo, solicitante) con botones AUTORIZAR / RECHAZAR (llaman a las funciones de 2.1).
- [ ] **Step 3:** Verificar. Commit `feat(materiales): UI de solicitudes de precio (autorizar/rechazar)`.

---

## FASE 3 — Compras eventuales + promover

### Task 3.1: Marcar ítems eventuales en la OC

**Files:** `index.html` (`#modalOrdenCompra` L≈3149, donde se agregan ítems manuales / `updateOcItemProveedor`/`updateOcPrecio` / el render de filas de OC)

- [ ] **Step 1:** Cuando un ítem de la OC se agrega manualmente o no matchea el catálogo (proveedor `SIN PROVEEDOR`/precio manual), marcar `item.eventual=true`. En el render de la fila, mostrar una etiqueta "EVENTUAL" (estilo `oc-row-warn` ya existente).
- [ ] **Step 2:** Verificar. Commit `feat(materiales): marcar items de compra eventual en la OC`.

### Task 3.2: Promover eventual al catálogo

**Files:** `index.html` (render de fila de OC + función)

- [ ] **Step 1:** Botón "PROMOVER AL CATÁLOGO" en filas con `item.eventual` → `_promoverEventual(ocId, itemIdx)`: toma nombre+precio+proveedor del ítem y llama `_crearSolicitudPrecio('ALTA', proveedorId|nuevo, item.name, item.unidad||'', null, item.precio, 'Promoción de compra eventual')`. Si el proveedor del ítem no existe en el catálogo, crear/usar `SIN PROVEEDOR FIJO / REFERENCIA` o el proveedor tipeado. Toast "SOLICITUD DE ALTA ENVIADA".
- [ ] **Step 2:** Verificar. Commit `feat(materiales): promover compra eventual al catalogo (solicitud de alta)`.

---

## Verificación final + deploy
- [ ] `node _recetatest/valjs.js` → `blocks=26 errs=1`; `node _recetatest/run.js` → `FAIL=0`.
- [ ] Bump `sw.js` + chip a `vNNN-catalogo-precios-oc` (un deploy por fase).
- [ ] Prueba de aceptación: importar `DATOS_COMPRAS` (verificar conteos); editar precio como no-admin → solicitud; autorizar → aplica; generar OC desde pedido → por proveedor más barato; agregar eventual + promover.
