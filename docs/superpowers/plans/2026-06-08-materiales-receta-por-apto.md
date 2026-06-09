# MATERIALES · Receta por apto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La receta guarda la cantidad por apto (modelo v3 `aptos:{aptoId:qty}`); el total del nivel = suma. Se ve/edita por chips de apto. Carga desde una plantilla por apto (una hoja por nivel).

**Architecture:** Todo en `index.html`. Funciones puras nuevas (`resolveAptoId`, `totalMaterialNivel`, `parseRecetaPorApto`) y `aplicarOperacionReceta` reescrita van entre las sentinelas `// ===RECETA-PURE-START/END===`, testeadas con el arnés Node `_recetatest/`. La vista (`renderRecetaV2`) gana un tercer nivel de chips (TORRE→NIVEL→APTO+TOTAL). El precio sigue saliendo del catálogo.

**Tech Stack:** HTML/JS vanilla; SheetJS (`XLSX`); Node 24 (tests puros + valjs). Spec: `docs/superpowers/specs/2026-06-08-materiales-receta-por-apto-design.md`.

**Convenciones (cada commit):** `node _recetatest/valjs.js` → `errs=1`; `node _recetatest/run.js` → pasa; bump `sw.js` CACHE_VERSION + chip `vNNN`; commits terminan con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; push solo cuando el usuario lo pida. Rama: `feat/materiales-receta-por-apto`. Dir: `C:\Users\Antonio Caravantes\Downloads\puntorojo-work`.

**Modelo (recordatorio):** `recetaV2 = { version:3, etapas:[...4], niveles: { [levelId]: [ [ {m,u,aptos:{aptoId:qty}} ], …4 etapas ] } }`. Total material = suma de `aptos`.

---

## Task 1: Generar la plantilla por apto (ejecuta el controlador, NO subagente)

El controlador genera el archivo `RECETA ESSENZA FASE 2 - POR APTO.xlsx` combinando el por-apto del PDF (individuales) con los nombres renombrados del usuario (mapeo por posición), renombrando `CIENTO DE…`→consumo, una hoja por nivel (`T4-N1`…`T3-N12`) con columnas de apto. Insumos en `C:\Users\Antonio Caravantes\Downloads\_pdfx\`: `perapto.json` (por-apto PDF), `recipe.json` (orden union), `user_xlsx.txt` (nombres del usuario). Validar abriendo con Excel COM. Entregable: el `.xlsx` para que el usuario lo cargue. **No toca `index.html`.**

- [ ] Generar y validar la plantilla; entregar la ruta al usuario. (Sin commit en repo.)

---

## Task 2: Puras — `resolveAptoId`, `totalMaterialNivel`, `parseRecetaPorApto`

**Files:** `index.html` (sentinelas), `_recetatest/run.js` (exponer), `_recetatest/tests.js`.

- [ ] **Step 1: Exponer en el arnés.** En `_recetatest/run.js`, en la cadena del `new Function('api', code + '...')`, agregar antes de `)(api);`:
```
api.resolveAptoId=typeof resolveAptoId!=="undefined"?resolveAptoId:undefined;api.totalMaterialNivel=typeof totalMaterialNivel!=="undefined"?totalMaterialNivel:undefined;api.parseRecetaPorApto=typeof parseRecetaPorApto!=="undefined"?parseRecetaPorApto:undefined;
```

- [ ] **Step 2: Tests que fallan.** En `_recetatest/tests.js`, antes del `};` final agregar:
```js
  // --- por apto ---
  const lvl = { id:'t4-n1', name:'NIVEL 1', aptos:[
    {id:'a101', name:'APARTAMENTO 101'}, {id:'a102', name:'APARTAMENTO 102'},
    {id:'acine', name:'CINE'}, {id:'apas', name:'PASILLO'}
  ]};
  eq('apto.num', t.api.resolveAptoId(lvl, '101'), 'a101');
  eq('apto.cine', t.api.resolveAptoId(lvl, 'CINE'), 'acine');
  eq('apto.pas', t.api.resolveAptoId(lvl, 'PASILLO'), 'apas');
  eq('apto.none', t.api.resolveAptoId(lvl, '999'), null);
  eq('apto.total', t.api.totalMaterialNivel({ m:'X', u:'U', aptos:{a101:26,a102:24,acine:0,apas:0} }), 50);
  // parseRecetaPorApto: hoja por nivel
  const towersA = [{ id:'t4', name:'TORRE IV', levels:[lvl] }];
  const hoja = [
    ['ETAPA','MATERIAL','UNIDAD','101','102','CINE','PASILLO','TOTAL'],
    ['1RA ETAPA','CANAL','U',26,24,0,0,50],
    ['2DA ETAPA','TABLA','U',10,5,0,0,15]
  ];
  const rp = t.api.parseRecetaPorApto({ 'T4-N1': hoja }, towersA);
  eq('pa.version', rp.recetaV2.version, 3);
  eq('pa.e1', rp.recetaV2.niveles['t4-n1'][0][0], { m:'CANAL', u:'U', aptos:{a101:26,a102:24} });
  eq('pa.e2', rp.recetaV2.niveles['t4-n1'][1][0].aptos.a101, 10);
  t.ok('pa.avisos', Array.isArray(rp.avisos));
```

- [ ] **Step 3: Correr → falla.** `node _recetatest/run.js` (funciones undefined).

- [ ] **Step 4: Implementar.** Dentro de las sentinelas, antes de `// ===RECETA-PURE-END===`:
```js
function _aptoNorm(s){ return String(s==null?'':s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }
function resolveAptoId(level, label){
  const lab = String(label==null?'':label).trim();
  if (!level || !Array.isArray(level.aptos)) return null;
  if (/^\d+$/.test(lab)){
    const a = level.aptos.find(x => new RegExp('\\b'+lab+'\\b').test(String(x.name||'')));
    return a ? a.id : null;
  }
  const key = _aptoNorm(lab);
  if (!key) return null;
  const a = level.aptos.find(x => _aptoNorm(x.name).indexOf(key) !== -1);
  return a ? a.id : null;
}
function totalMaterialNivel(item){
  if (!item || !item.aptos) return 0;
  let s = 0; for (const k in item.aptos) s += Number(item.aptos[k])||0; return s;
}
function parseRecetaPorApto(sheets, towers){
  const ETAPAS = ['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'];
  const recetaV2 = { version:3, etapas:ETAPAS.slice(), niveles:{} };
  const avisos = [];
  const etapaIdxDe = txt => { const s=String(txt||'').toUpperCase().replace(/\s+/g,' ').trim();
    if(/^1\s*RA/.test(s))return 0; if(/^2\s*(DA|NDA)/.test(s))return 1; if(/^3\s*(RA|ERA)/.test(s))return 2; if(/^4\s*TA/.test(s))return 3; return -1; };
  Object.keys(sheets||{}).forEach(name => {
    const mm = String(name).trim().match(/^T(\d+)-N(\d+)$/i);
    if (!mm) return;
    const aoa = sheets[name] || [];
    const towerId = torreSheetToTowerId('T'+mm[1], towers);
    const tower = (towers||[]).find(t => t.id===towerId);
    if (!tower){ avisos.push('Hoja "'+name+'": torre no existe.'); return; }
    const nivelNum = parseInt(mm[2],10);
    const level = (tower.levels||[]).find(l => _aptoNorm(l.name)===('NIVEL '+nivelNum)) ||
                  (tower.levels||[]).find(l => { const x=String(l.name||'').match(/(\d+)/); return x && parseInt(x[1],10)===nivelNum; });
    if (!level){ avisos.push('Hoja "'+name+'": nivel '+nivelNum+' no existe.'); return; }
    const lid = level.id;
    const header = aoa[0] || [];
    const aptoCols = [];
    header.forEach((h,c) => { const hh=_aptoNorm(h); if(['ETAPA','MATERIAL','UNIDAD','TOTAL','TOTAL NIVEL'].indexOf(hh)!==-1) return;
      const aid = resolveAptoId(level, h); if(aid) aptoCols.push({col:c, aptoId:aid}); else if(String(h||'').trim()) avisos.push(name+': apto "'+h+'" sin equivalente.'); });
    if (!recetaV2.niveles[lid]) recetaV2.niveles[lid] = [[],[],[],[]];
    for (let i=1;i<aoa.length;i++){
      const row = aoa[i]||[];
      const eIdx = etapaIdxDe(row[0]); const material=String(row[1]||'').trim(); const unidad=String(row[2]||'U').trim()||'U';
      if (eIdx<0 || !material) continue;
      const aptos = {};
      aptoCols.forEach(ac => { const v=Number(row[ac.col]); if(v>0) aptos[ac.aptoId]=v; });
      recetaV2.niveles[lid][eIdx].push({ m:material, u:unidad, aptos });
    }
  });
  return { recetaV2, avisos };
}
```

- [ ] **Step 5: Correr → pasa.** `node _recetatest/run.js` → `PASS=N FAIL=0` (N = previos + 8).
- [ ] **Step 6: valjs + commit.** `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): puras por apto (parseRecetaPorApto, resolveAptoId, totalMaterialNivel)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Reescribir `aplicarOperacionReceta` para por apto

**Files:** `index.html` (sentinelas), `_recetatest/tests.js`.

- [ ] **Step 1: Reemplazar los tests viejos de `aplicarOperacionReceta`.** En `_recetatest/tests.js`, localizar el bloque `// --- aplicarOperacionReceta ---` y reemplazarlo (desde ese comentario hasta justo antes del siguiente comentario `// ---`) por:
```js
  // --- aplicarOperacionReceta (por apto) ---
  const rv = { version:3, etapas:['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'], niveles:{ 't4-n1':[ [ {m:'CANAL', u:'U', aptos:{a101:26,a102:24}} ], [], [], [] ] } };
  const px = {};
  t.api.aplicarOperacionReceta(rv, px, { tipo:'cantidad', levelId:'t4-n1', etapaIdx:0, material:'CANAL', aptoId:'a101', cantidadNueva:30 });
  eq('op.aptoqty', rv.niveles['t4-n1'][0][0].aptos.a101, 30);
  t.api.aplicarOperacionReceta(rv, px, { tipo:'agregar', levelId:'t4-n1', etapaIdx:0, material:'POSTE', unidad:'U', aptoId:'a101', cantidadNueva:40 });
  eq('op.agregar.len', rv.niveles['t4-n1'][0].length, 2);
  eq('op.agregar.apto', rv.niveles['t4-n1'][0][1].aptos.a101, 40);
  eq('op.agregar.precio0', px['POSTE'].precio, 0);
  t.api.aplicarOperacionReceta(rv, px, { tipo:'quitar', levelId:'t4-n1', etapaIdx:0, material:'CANAL' });
  eq('op.quitar.len', rv.niveles['t4-n1'][0].length, 1);
  eq('op.quitar.resto', rv.niveles['t4-n1'][0][0].m, 'POSTE');
```

- [ ] **Step 2: Correr → falla** (el `aplicarOperacionReceta` viejo opera sobre `c`). `node _recetatest/run.js`.

- [ ] **Step 3: Reemplazar la función.** En `index.html`, dentro de las sentinelas, reemplazar la función `function aplicarOperacionReceta(recetaV2, precios, op){ … }` completa por:
```js
function aplicarOperacionReceta(recetaV2, precios, op){
  if (!recetaV2 || !recetaV2.niveles) return { ok:false, error:'SIN RECETA' };
  if (!op || op.etapaIdx == null || !op.levelId) return { ok:false, error:'DATOS INCOMPLETOS' };
  if (!recetaV2.niveles[op.levelId]) recetaV2.niveles[op.levelId] = [[],[],[],[]];
  const lista = recetaV2.niveles[op.levelId][op.etapaIdx];
  if (!Array.isArray(lista)) return { ok:false, error:'ETAPA INVÁLIDA' };
  const material = String(op.material||'').trim();
  if (op.tipo === 'cantidad'){
    if (!op.aptoId) return { ok:false, error:'FALTA APTO' };
    const line = lista.find(l => l.m === material);
    if (!line) return { ok:false, error:'MATERIAL NO ESTÁ EN LA ETAPA' };
    if (!line.aptos) line.aptos = {};
    line.aptos[op.aptoId] = Number(op.cantidadNueva)||0;
    return { ok:true };
  }
  if (op.tipo === 'agregar'){
    if (!material) return { ok:false, error:'MATERIAL VACÍO' };
    const unidad = String(op.unidad||'U').trim() || 'U';
    let line = lista.find(l => l.m === material);
    if (!line){ line = { m:material, u:unidad, aptos:{} }; lista.push(line); }
    if (op.aptoId) line.aptos[op.aptoId] = Number(op.cantidadNueva)||0;
    if (precios){ const prod = normProducto(material); if (!precios[prod]) precios[prod] = { proveedor:'', precio:0, unidad, proveedorId:'' }; }
    return { ok:true };
  }
  if (op.tipo === 'quitar'){
    const before = lista.length;
    recetaV2.niveles[op.levelId][op.etapaIdx] = lista.filter(l => l.m !== material);
    return { ok: recetaV2.niveles[op.levelId][op.etapaIdx].length < before };
  }
  return { ok:false, error:'TIPO DESCONOCIDO' };
}
```

- [ ] **Step 4: Correr → pasa.** `node _recetatest/run.js` → `FAIL=0`.
- [ ] **Step 5: valjs + commit.** `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): aplicarOperacionReceta opera por apto

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Init de datos v3

**Files:** `index.html` (loop de migración, ancla la línea de Fase 1 `if (!Array.isArray(p.solicitudesReceta)) p.solicitudesReceta = [];`).

- [ ] **Step 1: Implementar.** Inmediatamente DESPUÉS de esa línea agregar:
```js
    // v3: si la receta es de un modelo viejo (sin aptos), marcarla para recarga
    if (p.materiales.recetaV2 && typeof p.materiales.recetaV2 === 'object' && (p.materiales.recetaV2.version||2) < 3) {
      p.materiales.recetaV2._needsReimport = true;
    }
```

- [ ] **Step 2: valjs + run.** `errs=1`; `run.js` pasa. Commit:
```bash
git add index.html
git commit -m "feat(receta): marcar recetaV2 vieja (v<3) para recarga por apto

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Importar la plantilla por apto

**Files:** `index.html` (`importarRecetaExcel`).

- [ ] **Step 1: Reemplazar el cuerpo del parseo + resumen.** En `importarRecetaExcel`, localizar desde `const tieneTorre = wb.SheetNames.some(...)` hasta `if (typeof renderRecetaV2==='function') renderRecetaV2();` y reemplazar por:
```js
    const tieneApto = wb.SheetNames.some(sn => /^T\d+-N\d+$/i.test(String(sn).trim()));
    if (!tieneApto) {
      return window.prAlert({ title:'ARCHIVO NO VÁLIDO', body:'El archivo no parece la plantilla por apto (faltan hojas T#-N#).' });
    }
    const { recetaV2, avisos } = parseRecetaPorApto(sheets, p.towers || []);
    const nNiv = Object.keys(recetaV2.niveles).length;
    let nLineas = 0; Object.values(recetaV2.niveles).forEach(et => et.forEach(l => nLineas += l.length));
    let body = '<div style="font-size:12px;line-height:1.6;color:#1F2937">'
      + '<div>Niveles con receta: <strong>'+nNiv+'</strong></div>'
      + '<div>Líneas de material: <strong>'+nLineas+'</strong></div>';
    if (avisos.length) body += '<div style="margin-top:10px;padding:10px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;color:#92400E;font-size:11px">'+avisos.slice(0,12).map(a=>'• '+a.replace(/[&<>]/g,'')).join('<br>')+(avisos.length>12?'<br>… (+'+(avisos.length-12)+')':'')+'</div>';
    body += '<div style="margin-top:10px;color:#991B1B;font-size:11px">Esto REEMPLAZA la receta actual del proyecto.</div></div>';
    const ok = await window.prConfirm({ title:'CARGAR RECETA POR APTO', bodyHTML:body, okText:'CARGAR', cancelText:'CANCELAR' });
    if (!ok) return;
    recetaV2.fuente = file.name.replace(/\.(xlsx|xls)$/i,'');
    recetaV2.importadoTs = Date.now();
    recetaV2.importadoPor = (typeof window._getUserEmail==='function' ? (window._getUserEmail()||'') : '');
    p.materiales.recetaV2 = recetaV2;
    try { if (typeof logActivity==='function') logActivity('update','Receta por apto cargada', p.name+' · '+nNiv+' niveles · '+nLineas+' líneas'); } catch(e){}
    saveState();
    try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
    showToast('RECETA CARGADA','green');
    if (typeof renderRecetaV2==='function') renderRecetaV2();
```

- [ ] **Step 2: Confirmar que no quedan referencias a `parseRecetaWorkbook`/`avisosShow`/`sheets` rotas.** Grep `parseRecetaWorkbook` dentro de `importarRecetaExcel` → debe quedar 0. (El `const sheets = {}; wb.SheetNames.forEach(...)` de arriba se mantiene igual.)

- [ ] **Step 3: valjs + run + commit.** `errs=1`; run pasa.
```bash
git add index.html
git commit -m "feat(receta): importar plantilla por apto (hoja por nivel)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Vista `renderRecetaV2` con chips de apto

**Files:** `index.html` (`renderRecetaV2` + estado de selección).

- [ ] **Step 1: Reemplazar el estado de selección y `renderRecetaV2`.** Grep `let recetaV2TorreSel` y reemplazar desde esa línea hasta el cierre `};` de `window.renderRecetaV2 = function(){ … };` por:
```js
let recetaV2TorreSel = null, recetaV2NivelSel = null, recetaV2AptoSel = 'TOTAL';
window.setRecetaV2Sel = function(torreId, levelId, aptoSel){ recetaV2TorreSel=torreId; recetaV2NivelSel=levelId; recetaV2AptoSel=(aptoSel===undefined?'TOTAL':aptoSel); renderRecetaV2(); };
window.renderRecetaV2 = function(){
  const p = activeProj();
  const wrap = document.getElementById('recetaV2Wrap');
  const cont = document.getElementById('recetaV2Content');
  if (!wrap || !cont) return;
  const rv = p.materiales && p.materiales.recetaV2;
  const legacyEls = _recetaV2LegacyEls();
  const pend = (p.solicitudesReceta||[]).filter(s => s.estado==='PENDIENTE').length;
  const bSol = document.getElementById('btnVerSolReceta');
  if (bSol){ bSol.style.display = pend>0 ? '' : 'none'; bSol.textContent = 'SOLICITUDES ('+pend+')'; }
  const hayApto = rv && rv.version>=3 && rv.niveles && Object.keys(rv.niveles).length;
  if (!hayApto){
    legacyEls.forEach(el => { el.style.display=''; });
    const msg = (rv && (rv._needsReimport || (rv.version||2)<3))
      ? 'La receta de este proyecto es de un formato anterior. Cargá la <strong>plantilla por apto</strong> para activar el desglose por apartamento.'
      : 'No hay receta cargada. Usá <strong>CARGAR RECETA (EXCEL)</strong> con la plantilla por apto del proyecto.';
    cont.innerHTML = '<div style="padding:18px;text-align:center;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;color:#64748B;font-size:12px">'+msg+'</div>';
    return;
  }
  legacyEls.forEach(el => { el.style.display='none'; });
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money = n => 'Q' + (Number(n)||0).toLocaleString('es-GT',{minimumFractionDigits:2, maximumFractionDigits:2});
  const torres = (p.towers||[]).filter(t => (t.levels||[]).some(l => rv.niveles[l.id]));
  if (!recetaV2TorreSel || !torres.some(t=>t.id===recetaV2TorreSel)) recetaV2TorreSel = torres[0] ? torres[0].id : null;
  const torre = torres.find(t => t.id===recetaV2TorreSel);
  const niveles = torre ? (torre.levels||[]).filter(l => rv.niveles[l.id]) : [];
  if (!recetaV2NivelSel || !niveles.some(l=>l.id===recetaV2NivelSel)) recetaV2NivelSel = niveles[0] ? niveles[0].id : null;
  const level = niveles.find(l => l.id===recetaV2NivelSel);
  const etapas = rv.niveles[recetaV2NivelSel] || [[],[],[],[]];
  // aptos presentes en la receta de este nivel
  const aptoIdsEnReceta = new Set();
  etapas.forEach(lineas => lineas.forEach(l => { for (const k in (l.aptos||{})) aptoIdsEnReceta.add(k); }));
  const aptosNivel = (level && level.aptos || []).filter(a => aptoIdsEnReceta.has(a.id));
  if (recetaV2AptoSel !== 'TOTAL' && !aptosNivel.some(a=>a.id===recetaV2AptoSel)) recetaV2AptoSel = 'TOTAL';
  const chip = (label, active, onclick) => '<button class="btn ghost sm" style="font-size:11px;'+(active?'background:var(--cafe);color:#fff;border-color:var(--cafe)':'')+'" onclick="'+onclick+'">'+esc(label)+'</button>';
  let html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
    + torres.map(t => chip(t.name, t.id===recetaV2TorreSel, "setRecetaV2Sel('"+t.id+"', null)")).join(' ') + '</div>';
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
    + niveles.map(l => chip(l.name, l.id===recetaV2NivelSel, "setRecetaV2Sel('"+recetaV2TorreSel+"','"+l.id+"','TOTAL')")).join(' ') + '</div>';
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'
    + chip('TOTAL', recetaV2AptoSel==='TOTAL', "setRecetaV2Sel('"+recetaV2TorreSel+"','"+recetaV2NivelSel+"','TOTAL')")
    + ' ' + aptosNivel.map(a => chip(a.name.replace(/^APARTAMENTO\s+/i,''), a.id===recetaV2AptoSel, "setRecetaV2Sel('"+recetaV2TorreSel+"','"+recetaV2NivelSel+"','"+a.id+"')")).join(' ') + '</div>';
  const esTotal = recetaV2AptoSel==='TOTAL';
  const puedeEditar = can('receta.edit') || can('users.manage');
  const precios = p.materiales.precios || {};
  const fills = ['#FDE9E7','#E7F0FD','#E9F7E9','#FBF4E1'];
  let totalNivel = 0;
  etapas.forEach((lineas, ei) => {
    let totalEtapa = 0;
    html += '<div style="border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px;overflow:hidden">';
    html += '<div style="padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:.5px;background:'+fills[ei]+';color:#374151">'+esc(rv.etapas[ei])
      + (puedeEditar ? '<button class="btn ghost sm" style="float:right;font-size:10px;padding:2px 8px" onclick="'+(puedeEditar?'recetaV2Op':'recetaV2Solicitar')+'(\''+recetaV2NivelSel+'\','+ei+',\'agregar\')">+ AGREGAR</button>' : '')
      + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="color:#6B7280;font-size:10px"><th style="text-align:left;padding:6px 12px">MATERIAL</th><th style="padding:6px 6px">U</th><th style="text-align:right;padding:6px 6px">'+(esTotal?'TOTAL':'CANT')+'</th><th style="text-align:right;padding:6px 6px">P.U.</th><th style="text-align:right;padding:6px 12px">SUBTOTAL</th><th></th></tr></thead><tbody>';
    if (!lineas.length) html += '<tr><td colspan="6" style="padding:10px 12px;color:#9CA3AF">— sin materiales —</td></tr>';
    lineas.forEach(l => {
      const qty = esTotal ? totalMaterialNivel(l) : (Number((l.aptos||{})[recetaV2AptoSel])||0);
      const info = precioDeProductoReceta(p, l.m);
      const pu = info ? info.precio : 0;
      const sub = pu * qty;
      totalEtapa += sub;
      const matArg = esc(l.m).replace(/'/g,"\\'");
      const accion = puedeEditar ? 'recetaV2Op' : 'recetaV2Solicitar';
      html += '<tr style="border-top:1px solid #F1F5F9">'
        + '<td style="padding:6px 12px">'+esc(l.m)+'</td>'
        + '<td style="text-align:center;color:#6B7280">'+esc(l.u)+'</td>'
        + '<td style="text-align:right;font-variant-numeric:tabular-nums">'+qty.toLocaleString('es-GT')+'</td>'
        + '<td style="text-align:right;color:'+(pu?'#374151':'#D1D5DB')+'">'+(pu?money(pu):'—')+'</td>'
        + '<td style="text-align:right;font-variant-numeric:tabular-nums">'+(pu?money(sub):'—')+'</td>'
        + '<td style="text-align:right;white-space:nowrap;padding-right:8px">'
          + (esTotal ? '' : '<button class="btn-icon" title="Editar cantidad del apto" onclick="'+accion+'(\''+recetaV2NivelSel+'\','+ei+',\'cantidad\',\''+matArg+'\',\''+recetaV2AptoSel+'\')">✎</button>')
          + '<button class="btn-icon danger" title="Quitar material del nivel" onclick="'+accion+'(\''+recetaV2NivelSel+'\','+ei+',\'quitar\',\''+matArg+'\')">✕</button>'
        + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="text-align:right;padding:6px 12px;font-size:11px;color:#6B7280;background:#FAFAFA">Subtotal etapa: <strong style="color:#374151">'+money(totalEtapa)+'</strong></div></div>';
    totalNivel += totalEtapa;
  });
  html += '<div style="text-align:right;font-size:13px;font-weight:700;color:var(--cafe);padding:6px 4px">'+(esTotal?'TOTAL NIVEL':'SUBTOTAL APTO')+': '+money(totalNivel)+'</div>';
  cont.innerHTML = html;
  if (typeof applyPermissions==='function') applyPermissions();
};
```

- [ ] **Step 2: Verificación funcional** (post-deploy): TORRE/NIVEL/APTO chips; TOTAL muestra sumas; elegir apto muestra sus cantidades; P.U./subtotales del catálogo.
- [ ] **Step 3: valjs + run + commit.** `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): vista por apto (chips TORRE/NIVEL/APTO + TOTAL)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Editar por apto (wiring)

**Files:** `index.html` (`_recetaV2PedirDatos`, `recetaV2Op`, `recetaV2Solicitar`, `autorizarReceta`).

- [ ] **Step 1: `_recetaV2PedirDatos` recibe `aptoId`.** Grep `window._recetaV2PedirDatos = async function(levelId, etapaIdx, tipo, material){` y reemplazar su firma + el caso `cantidad` por:
```js
window._recetaV2PedirDatos = async function(levelId, etapaIdx, tipo, material, aptoId){
  const p = activeProj();
  const lista = (p.materiales.recetaV2.niveles[levelId] || [[],[],[],[]])[etapaIdx] || [];
  if (tipo === 'cantidad'){
    const line = lista.find(l => l.m === material);
    const actual = line && line.aptos ? (Number(line.aptos[aptoId])||0) : 0;
    const v = await window.prPrompt({ title:'CAMBIAR CANTIDAD (APTO)', body:material, placeholder:'nueva cantidad', defaultValue:String(actual), required:true });
    if (v === null) return null;
    const c = Number(String(v).replace(/[^\d.]/g,''));
    if (!(c >= 0)) { showToast('CANTIDAD INVÁLIDA','red'); return null; }
    return { material, unidad: line ? line.u : 'U', cantidadNueva: c, cantidadActual: actual, aptoId };
  }
```
(El resto de la función —`quitar` y `agregar`— queda igual; en `agregar` devolvé también `aptoId: aptoId||null`.)

- [ ] **Step 2: `recetaV2Op` pasa `aptoId`.** Grep `window.recetaV2Op = async function(levelId, etapaIdx, tipo, material){` y reemplazar firma + cuerpo por:
```js
window.recetaV2Op = async function(levelId, etapaIdx, tipo, material, aptoId){
  if (!(can('receta.edit') || can('users.manage'))) return showToast('SIN PERMISO','red');
  const p = activeProj();
  const datos = await window._recetaV2PedirDatos(levelId, etapaIdx, tipo, material, aptoId);
  if (!datos) return;
  const res = aplicarOperacionReceta(p.materiales.recetaV2, p.materiales.precios, { tipo, levelId, etapaIdx, material:datos.material, unidad:datos.unidad, aptoId:datos.aptoId, cantidadNueva:datos.cantidadNueva });
  if (!res.ok) return showToast('NO SE PUDO: '+(res.error||''),'red');
  try { if (typeof logActivity==='function') logActivity('update','Receta editada', p.name+' · '+tipo+' · '+datos.material); } catch(e){}
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  showToast('RECETA ACTUALIZADA','green');
  renderRecetaV2();
};
```

- [ ] **Step 3: `recetaV2Solicitar` pasa `aptoId` y lo guarda.** Grep `window.recetaV2Solicitar = async function(levelId, etapaIdx, tipo, material){` y reemplazar firma + el cuerpo, agregando `aptoId` al `prPedirDatos`, al objeto solicitud y al resumen. Reemplazar la firma por `window.recetaV2Solicitar = async function(levelId, etapaIdx, tipo, material, aptoId){`, la llamada por `const datos = await window._recetaV2PedirDatos(levelId, etapaIdx, tipo, material, aptoId);`, agregar `aptoId: datos.aptoId||'',` dentro del objeto `p.solicitudesReceta.push({...})`, y en `verbo` (cantidad) anteponer el nombre del apto:
```js
  const aptoNom = (() => { const lv=(p.towers||[]).flatMap(t=>t.levels||[]).find(l=>l.id===levelId); const a=lv&&(lv.aptos||[]).find(x=>x.id===datos.aptoId); return a?a.name:''; })();
  const verbo = tipo==='cantidad' ? ((aptoNom?aptoNom+' · ':'')+datos.cantidadActual+' → '+datos.cantidadNueva) : (tipo==='agregar' ? ('AGREGAR · '+(datos.cantidadNueva||0)) : 'QUITAR');
```

- [ ] **Step 4: `autorizarReceta` pasa `aptoId` de la solicitud.** Grep `const res = aplicarOperacionReceta(p.materiales.recetaV2, p.materiales.precios, { tipo:sol.tipo, levelId:sol.levelId, etapaIdx:sol.etapaIdx, material:sol.material, unidad:sol.unidad, cantidadNueva:sol.cantidadNueva });` y agregar `aptoId:sol.aptoId,` dentro del objeto.

- [ ] **Step 5: valjs + run + commit.** `errs=1`; run pasa.
```bash
git add index.html
git commit -m "feat(receta): editar/solicitar por apto (aptoId en op y solicitud)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Verificación + versión + deploy

**Files:** `sw.js`, `index.html` (chip).

- [ ] **Step 1: Tests + valjs.** `node _recetatest/run.js` → `FAIL=0`. `node _recetatest/valjs.js` → `errs=1`.
- [ ] **Step 2: Repaso funcional** (post-deploy): cargar la plantilla por apto; ver TOTAL y por apto; editar un apto (admin) y ver el TOTAL reajustar; solicitud de un no-admin; precios del catálogo.
- [ ] **Step 3: Bump.** `sw.js`: `const CACHE_VERSION = 'v516-receta-por-apto';`. `index.html` chip `vNNN` → `v516`.
- [ ] **Step 4: Commit + (push SOLO si el usuario lo pide).**
```bash
git add index.html sw.js
git commit -m "release: v516 receta por apto

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git checkout main && git merge --ff-only feat/materiales-receta-por-apto && git push origin main
```

---

## Cobertura del spec
- §3 modelo v3 → Tasks 2,3,4. §4 plantilla → Task 1. §5 import → Task 5. §6 mapeo apto → Task 2 (`resolveAptoId`). §7 vista chips → Task 6. §8 editar/solicitud por apto → Tasks 3,7. §9 precios/OC → sin cambio (Task 6 usa `precioDeProductoReceta`). §10 permisos/persistencia → gates en Tasks 6,7. §11 pruebas → Tasks 2,3 (Node) + funcional. §12/§13 fuera de alcance/decisiones → respetado (yield = Fase 3).
