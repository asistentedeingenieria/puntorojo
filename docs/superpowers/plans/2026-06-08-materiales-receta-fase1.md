# MATERIALES · Fase 1 (Receta + Precios) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cargar la receta de material (Excel plantilla) a la app, guardarla por nivel × 4 etapas + un catálogo de precios, verla, y editarla (agregar/quitar/cambiar cantidad) con autorización (admin/gerente directo; los demás por solicitud).

**Architecture:** Todo vive en el monolito `index.html`. Se separa la **lógica pura** (parser de la plantilla, normalización de producto, aplicar operación) en funciones globales sin DOM, marcadas con sentinelas `// ===RECETA-PURE-START/END===`, testeadas con un arnés Node que las extrae del HTML. La UI (importar, ver, editar, solicitudes, precios) se construye con los patrones existentes (`solicitudesMover`, `prConfirm`, `applyPermissions`, CloudSync) y se verifica funcionalmente. Se usan los datos `p.materiales.recetaV2`, `p.materiales.precios`, `p.solicitudesReceta`.

**Tech Stack:** HTML/JS vanilla en un solo archivo; SheetJS (`XLSX`) ya cargado; Firebase + `CloudSync`; Node 24 (solo para correr los tests de lógica pura y validar JS). Spec de referencia: `docs/superpowers/specs/2026-06-08-materiales-receta-fase1-design.md`.

**Convenciones del repo (OBLIGATORIO en cada commit de código):**
- Validar JS: `node _recetatest/valjs.js` debe terminar con `errs=1` (la línea base es un bloque `type="text/plain"`; **nunca** debe subir de 1).
- Subir versión: bump `CACHE_VERSION` en `sw.js` y el chip de versión en `index.html` (`<footer class="foot"><span ...>vNNN</span></footer>`).
- Deploy: `git add index.html sw.js && git commit && git push origin main` (Cloudflare publica ~30s después). **Solo cuando el usuario lo pida.**
- Mensaje de commit termina con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Ruta de trabajo:** `C:\Users\Antonio Caravantes\Downloads\puntorojo-work\`

---

## Task 0: Arnés de tests Node (dev-only, no se deploya)

**Files:**
- Create: `_recetatest/valjs.js` (extractor/validador de JS — copia del validador del repo)
- Create: `_recetatest/run.js` (extrae las funciones puras de `index.html` y corre asserts)
- Create: `_recetatest/.gitignore` con `*` (la carpeta NO se commitea ni deploya)

- [ ] **Step 1: Crear `_recetatest/.gitignore`**

```
*
```

- [ ] **Step 2: Crear `_recetatest/valjs.js`** (valida que todos los `<script>` de index.html parsean)

```js
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
let errs = 0, n = 0;
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  if (/\bsrc=/.test(attrs)) continue;                 // external scripts: skip
  if (/type\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(attrs)) {
    // non-JS script blocks (e.g. type="text/plain") still counted as parse target → baseline err
  }
  n++;
  try { new Function(m[2]); } catch (e) { errs++; console.log('PARSE ERR block#' + n + ': ' + e.message); }
}
console.log('blocks=' + n + ' errs=' + errs);
```

- [ ] **Step 3: Crear `_recetatest/run.js`** (extrae funciones puras entre sentinelas y las prueba)

```js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const A = '// ===RECETA-PURE-START===', B = '// ===RECETA-PURE-END===';
const i = html.indexOf(A), j = html.indexOf(B);
if (i < 0 || j < 0) { console.log('NO SENTINELS FOUND — Task 1 not done yet'); process.exit(2); }
const code = html.slice(i + A.length, j);
const api = {};
new Function('api', code + '\napi.normProducto=normProducto;api.torreSheetToTowerId=torreSheetToTowerId;api.parseRecetaWorkbook=parseRecetaWorkbook;api.aplicarOperacionReceta=aplicarOperacionReceta;')(api);

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log('FAIL ' + name + '\n  got=' + g + '\n  exp=' + e); }
}
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + name); } }

module.exports = { api, eq, ok, done: () => { console.log('PASS=' + pass + ' FAIL=' + fail); process.exit(fail ? 1 : 0); } };

// ---- requires the per-task test files appended below ----
require('./tests')(module.exports);
```

- [ ] **Step 4: Crear `_recetatest/tests.js`** (vacío por ahora; cada task agrega asserts)

```js
module.exports = function (t) {
  // tasks añaden bloques aquí
};
```

- [ ] **Step 5: Verificar que el arnés corre (aún sin sentinelas → exit 2)**

Run: `cd "C:\Users\Antonio Caravantes\Downloads\puntorojo-work" && node _recetatest/run.js`
Expected: imprime `NO SENTINELS FOUND — Task 1 not done yet` y sale con código 2.

No hay commit en esta task (todo es dev-only ignorado por git).

---

## Task 1: Lógica pura — `normProducto` y `torreSheetToTowerId`

**Files:**
- Modify: `index.html` — agregar un bloque `<script>` nuevo cerca del resto de helpers de materiales (buscar el ancla `function renderReceta(){` y colocar el bloque ANTES de esa función). El bloque empieza con `// ===RECETA-PURE-START===`.
- Modify: `_recetatest/tests.js`

- [ ] **Step 1: Escribir el test que falla** — en `_recetatest/tests.js`, reemplazar el body por:

```js
module.exports = function (t) {
  const { eq } = t;
  // normProducto
  eq('norm.tabiques', t.api.normProducto('Plancha ultra / TABIQUES'), 'Plancha ultra');
  eq('norm.enchapes', t.api.normProducto('Plancha RH / ENCHAPES'), 'Plancha RH');
  eq('norm.clavos', t.api.normProducto('Clavos de fijación'), 'Clavo de fijación');
  eq('norm.clavo', t.api.normProducto('Clavo de fijación'), 'Clavo de fijación');
  eq('norm.poste388', t.api.normProducto('Poste de 2 1/2" calibre 26 -- H=3.88'), 'Poste de 2 1/2" calibre 26 -- H=3.88');
  // torreSheetToTowerId
  const towers = [{ id: 't3', name: 'TORRE III', levels: [] }, { id: 't4', name: 'TORRE IV', levels: [] }];
  eq('torre.T4', t.api.torreSheetToTowerId('T4', towers), 't4');
  eq('torre.T3', t.api.torreSheetToTowerId('T3', towers), 't3');
  eq('torre.miss', t.api.torreSheetToTowerId('T9', towers), null);
};
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node _recetatest/run.js`
Expected: `NO SENTINELS FOUND — Task 1 not done yet` (exit 2) — aún no existen las funciones.

- [ ] **Step 3: Implementar** — en `index.html`, inmediatamente ANTES de la línea `function renderReceta(){` (buscar ese texto), insertar:

```html
<script>
// ===RECETA-PURE-START===
// Lógica pura de la receta de material (Fase 1). SIN DOM ni globals — testeable en Node.
function normProducto(nombre){
  let n = String(nombre == null ? '' : nombre).replace(/\s*\/\s*(TABIQUES|ENCHAPES)\s*$/i, '').trim();
  if (/^Clavos de fijaci/i.test(n)) n = 'Clavo de fijación';
  return n;
}
function torreSheetToTowerId(sheetName, towers){
  const mm = String(sheetName || '').match(/(\d+)/);
  if (!mm) return null;
  const num = parseInt(mm[1], 10);
  const byId = (towers || []).find(t => t.id === ('t' + num));
  if (byId) return byId.id;
  // fallback: por número romano/dígito dentro del nombre de la torre
  const roman = { 1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI' };
  const byName = (towers || []).find(t => {
    const nm = String(t.name || '').toUpperCase();
    return nm.indexOf(' ' + (roman[num] || '###')) !== -1 || new RegExp('\\b' + num + '\\b').test(nm);
  });
  return byName ? byName.id : null;
}
// ===RECETA-PURE-END===
</script>
```

(Las funciones `parseRecetaWorkbook` y `aplicarOperacionReceta` se agregan DENTRO de estas sentinelas en las Tasks 2 y 3 — colocar sus definiciones justo antes de `// ===RECETA-PURE-END===`.)

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `node _recetatest/run.js`
Expected: `PASS=8 FAIL=0` (exit 0).

- [ ] **Step 5: Validar JS y commit**

Run: `node _recetatest/valjs.js` → debe imprimir `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): funciones puras normProducto + torreSheetToTowerId (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Lógica pura — `parseRecetaWorkbook`

Convierte las hojas de la plantilla (ya parseadas a arrays-de-filas) en `{recetaV2, precios, avisos}`.

**Files:**
- Modify: `index.html` — agregar `parseRecetaWorkbook` dentro de las sentinelas (antes de `// ===RECETA-PURE-END===`).
- Modify: `_recetatest/tests.js`

- [ ] **Step 1: Escribir el test que falla** — añadir al final del body de `module.exports` en `_recetatest/tests.js`:

```js
  // --- parseRecetaWorkbook ---
  const towers = [{ id: 't4', name: 'TORRE IV', levels: [{ id: 't4-n1' }, { id: 't4-n2' }] }];
  const hojaT4 = [
    ['ETAPA', 'MATERIAL', 'UNIDAD', 'NIVEL 1', 'NIVEL 2'],
    ['1RA ETAPA', 'Canal de 2 1/2" calibre 26', 'U', 120, 137],
    ['1RA ETAPA', 'Plancha ultra / TABIQUES', 'U', 234, 201],
    ['2DA ETAPA', 'Plancha ultra', 'U', 176, 99],
    ['4TA ETAPA', 'Reborde J', 'U', 24, 21]
  ];
  const hojaPrecios = [
    ['PRODUCTO', 'UNIDAD', 'PROVEEDOR', 'PRECIO UNITARIO (Q)'],
    ['Plancha ultra', 'U', 'SISTEGUA, S.A.', 78.5],
    ['Canal de 2 1/2" calibre 26', 'U', '', 0]
  ];
  const r = t.api.parseRecetaWorkbook({ T4: hojaT4, PRECIOS: hojaPrecios }, towers);
  eq('parse.version', r.recetaV2.version, 2);
  eq('parse.n1.e1.len', r.recetaV2.niveles['t4-n1'][0].length, 2);
  eq('parse.n1.e1.canal', r.recetaV2.niveles['t4-n1'][0][0], { m: 'Canal de 2 1/2" calibre 26', u: 'U', c: 120 });
  eq('parse.n2.e1.canal.c', r.recetaV2.niveles['t4-n2'][0][0].c, 137);
  eq('parse.n1.e2.plancha', r.recetaV2.niveles['t4-n1'][1][0], { m: 'Plancha ultra', u: 'U', c: 176 });
  eq('parse.n1.e4.reborde', r.recetaV2.niveles['t4-n1'][3][0].m, 'Reborde J');
  eq('parse.precio.plancha', r.precios['Plancha ultra'].precio, 78.5);
  // 'Reborde J' no estaba en PRECIOS → debe crearse con precio 0
  eq('parse.precio.reborde0', r.precios['Reborde J'].precio, 0);
  t.ok('parse.avisos.array', Array.isArray(r.avisos));
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node _recetatest/run.js`
Expected: FAIL en `parse.*` (porque `parseRecetaWorkbook` aún no existe → el `new Function` arrojará `parseRecetaWorkbook is not defined` o exit 2). Si sale exit 2, es porque falta; continuar.

- [ ] **Step 3: Implementar** — dentro de las sentinelas en `index.html`, justo antes de `// ===RECETA-PURE-END===`, agregar:

```js
function parseRecetaWorkbook(sheets, towers){
  const ETAPAS = ['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'];
  const recetaV2 = { version:2, etapas: ETAPAS.slice(), niveles:{} };
  const precios = {};
  const avisos = [];
  const etapaIdxDe = txt => {
    const s = String(txt||'').toUpperCase().replace(/\s+/g,' ').trim();
    if (/^1\s*RA/.test(s)) return 0;
    if (/^2\s*(DA|NDA)/.test(s)) return 1;
    if (/^3\s*(RA|ERA)/.test(s)) return 2;
    if (/^4\s*TA/.test(s)) return 3;
    return -1;
  };
  const ensureNivel = lid => { if (!recetaV2.niveles[lid]) recetaV2.niveles[lid] = [[],[],[],[]]; return recetaV2.niveles[lid]; };
  const nivelExiste = (towers, lid) => (towers||[]).some(t => (t.levels||[]).some(l => l.id === lid));

  Object.keys(sheets || {}).forEach(name => {
    const aoa = sheets[name] || [];
    if (/^PRECIOS$/i.test(name)){
      for (let i = 1; i < aoa.length; i++){
        const row = aoa[i] || [];
        const prodRaw = String(row[0]||'').trim();
        if (!prodRaw) continue;
        const prod = normProducto(prodRaw);
        precios[prod] = { proveedor: String(row[2]||'').trim(), precio: Number(row[3])||0, unidad: String(row[1]||'U').trim()||'U', proveedorId:'' };
      }
      return;
    }
    if (!/^T\d+$/i.test(String(name).trim())) return; // hoja que no es torre ni precios → ignorar
    const towerId = torreSheetToTowerId(name, towers);
    if (!towerId){ avisos.push('Hoja "'+name+'": no existe esa torre en el proyecto; se ignoró.'); return; }
    const header = aoa[0] || [];
    const nivelCols = []; // {col, nivel}
    header.forEach((h, c) => { const mm = String(h||'').toUpperCase().match(/NIVEL\s*(\d+)/); if (mm) nivelCols.push({ col:c, nivel: parseInt(mm[1],10) }); });
    const nivelesFaltantes = {};
    for (let i = 1; i < aoa.length; i++){
      const row = aoa[i] || [];
      const eIdx = etapaIdxDe(row[0]);
      const material = String(row[1]||'').trim();
      const unidad = String(row[2]||'U').trim() || 'U';
      if (eIdx < 0 || !material) continue;
      nivelCols.forEach(nc => {
        const val = Number(row[nc.col]);
        if (!val || val <= 0) return;
        const lid = towerId + '-n' + nc.nivel;
        if (!nivelExiste(towers, lid)){ nivelesFaltantes[lid] = true; return; }
        ensureNivel(lid)[eIdx].push({ m: material, u: unidad, c: val });
        const prod = normProducto(material);
        if (!precios[prod]) precios[prod] = { proveedor:'', precio:0, unidad, proveedorId:'' };
      });
    }
    const falt = Object.keys(nivelesFaltantes);
    if (falt.length) avisos.push('Torre '+name+': niveles sin equivalente en el proyecto (ignorados): '+falt.join(', '));
  });

  // avisar materiales sin precio
  const sinPrecio = Object.keys(precios).filter(k => !(precios[k].precio > 0));
  if (sinPrecio.length) avisos.push(sinPrecio.length+' producto(s) sin precio (se pueden llenar en el catálogo).');
  return { recetaV2, precios, avisos };
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `node _recetatest/run.js`
Expected: `PASS=18 FAIL=0` (8 de Task 1 + 10 de Task 2).

- [ ] **Step 5: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): parseRecetaWorkbook plantilla -> recetaV2 + precios (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Lógica pura — `aplicarOperacionReceta`

Aplica una operación (cantidad / agregar / quitar) a `recetaV2`. La usan tanto la edición directa como `autorizarReceta`.

**Files:**
- Modify: `index.html` (dentro de sentinelas, antes de `// ===RECETA-PURE-END===`)
- Modify: `_recetatest/tests.js`

- [ ] **Step 1: Escribir el test que falla** — añadir al final del body en `_recetatest/tests.js`:

```js
  // --- aplicarOperacionReceta ---
  const rv = { version:2, etapas:['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'], niveles:{ 't4-n1': [ [ {m:'Canal', u:'U', c:120} ], [], [], [] ] } };
  const px = {};
  // cambiar cantidad
  t.api.aplicarOperacionReceta(rv, px, { tipo:'cantidad', levelId:'t4-n1', etapaIdx:0, material:'Canal', cantidadNueva:130 });
  eq('op.cantidad', rv.niveles['t4-n1'][0][0].c, 130);
  // agregar (producto nuevo → crea precio 0)
  t.api.aplicarOperacionReceta(rv, px, { tipo:'agregar', levelId:'t4-n1', etapaIdx:0, material:'Poste X', unidad:'U', cantidadNueva:40 });
  eq('op.agregar.len', rv.niveles['t4-n1'][0].length, 2);
  eq('op.agregar.precio0', px['Poste X'].precio, 0);
  // quitar
  t.api.aplicarOperacionReceta(rv, px, { tipo:'quitar', levelId:'t4-n1', etapaIdx:0, material:'Canal' });
  eq('op.quitar.len', rv.niveles['t4-n1'][0].length, 1);
  eq('op.quitar.resto', rv.niveles['t4-n1'][0][0].m, 'Poste X');
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `node _recetatest/run.js`
Expected: FAIL/exit por `aplicarOperacionReceta is not defined`.

- [ ] **Step 3: Implementar** — dentro de sentinelas, antes de `// ===RECETA-PURE-END===`:

```js
function aplicarOperacionReceta(recetaV2, precios, op){
  if (!recetaV2 || !recetaV2.niveles) return { ok:false, error:'SIN RECETA' };
  if (!op || op.etapaIdx == null || !op.levelId) return { ok:false, error:'DATOS INCOMPLETOS' };
  if (!recetaV2.niveles[op.levelId]) recetaV2.niveles[op.levelId] = [[],[],[],[]];
  const lista = recetaV2.niveles[op.levelId][op.etapaIdx];
  if (!Array.isArray(lista)) return { ok:false, error:'ETAPA INVÁLIDA' };
  const material = String(op.material||'').trim();
  if (op.tipo === 'cantidad'){
    const line = lista.find(l => l.m === material);
    if (!line) return { ok:false, error:'MATERIAL NO ESTÁ EN LA ETAPA' };
    line.c = Number(op.cantidadNueva) || 0;
    return { ok:true };
  }
  if (op.tipo === 'agregar'){
    if (!material) return { ok:false, error:'MATERIAL VACÍO' };
    const unidad = String(op.unidad||'U').trim() || 'U';
    const existing = lista.find(l => l.m === material);
    if (existing) existing.c = Number(op.cantidadNueva) || 0;
    else lista.push({ m: material, u: unidad, c: Number(op.cantidadNueva) || 0 });
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

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `node _recetatest/run.js`
Expected: `PASS=23 FAIL=0`.

- [ ] **Step 5: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): aplicarOperacionReceta (cantidad/agregar/quitar) (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Init de datos (`recetaV2`, `precios`, `solicitudesReceta`)

**Files:**
- Modify: `index.html` — en el loop de migración de proyectos. Ancla: la línea `if (!p.materiales.etapasPedidas) p.materiales.etapasPedidas = {};` (≈L7139).

- [ ] **Step 1: Implementar** — inmediatamente DESPUÉS de esa línea, agregar:

```js
    // Fase 1 receta v2 + precios + solicitudes de cambio de receta
    if (p.materiales.recetaV2 !== null && (typeof p.materiales.recetaV2 !== 'object')) p.materiales.recetaV2 = null;
    if (p.materiales.recetaV2 === undefined) p.materiales.recetaV2 = null;
    if (!p.materiales.precios || typeof p.materiales.precios !== 'object' || Array.isArray(p.materiales.precios)) p.materiales.precios = {};
    if (!Array.isArray(p.solicitudesReceta)) p.solicitudesReceta = [];
```

- [ ] **Step 2: Verificar en consola del navegador** (cargar app local o `puntorojo.app`):

Abrir la consola y correr: `JSON.stringify(window.state.projects.find(x=>x.id==='essenza-f2').materiales.recetaV2)` → debe devolver `null` (no `undefined`), y `...solicitudesReceta` → `[]`.

- [ ] **Step 3: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): init recetaV2/precios/solicitudesReceta por proyecto (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Importar la plantilla (.xlsx → recetaV2 + precios)

**Files:**
- Modify: `index.html` — agregar `<input type="file">` oculto + botón en la sección RECETA de MATERIALES, y la función `importarRecetaExcel(ev)` (global). Buscar el ancla `id="recetaStageTabs"` (contenedor de la receta vieja) e insertar el botón/contenedor nuevo JUSTO ANTES.

- [ ] **Step 1: Agregar el contenedor + botón** — antes del elemento con `id="recetaStageTabs"`, insertar:

```html
<div id="recetaV2Wrap" style="margin-bottom:14px">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.5px;color:var(--cafe)">RECETA DE MATERIAL</div>
    <div style="display:flex;gap:8px">
      <button class="btn ghost sm" id="btnVerSolReceta" onclick="verSolicitudesReceta()" style="display:none">SOLICITUDES (0)</button>
      <button class="btn cafe sm" id="btnCargarReceta" data-perm="receta.edit" onclick="document.getElementById('inpRecetaExcel').click()">CARGAR RECETA (EXCEL)</button>
    </div>
  </div>
  <input type="file" id="inpRecetaExcel" accept=".xlsx,.xls" style="display:none" onchange="importarRecetaExcel(event)">
  <div id="recetaV2Content"></div>
</div>
```

- [ ] **Step 2: Implementar `importarRecetaExcel`** — agregar como función global (junto a las otras funciones de materiales, p.ej. después de `renderReceta`'s cierre o en el bloque de receta). Usa SheetJS ya cargado:

```js
window.importarRecetaExcel = async function(ev){
  const file = ev && ev.target && ev.target.files && ev.target.files[0];
  if (ev && ev.target) ev.target.value = '';
  if (!file) return;
  if (!(can('receta.edit') || can('users.manage'))) return showToast('SIN PERMISO PARA CARGAR RECETA','red');
  if (typeof XLSX === 'undefined' || !XLSX.read) return showToast('NO SE PUDO LEER EL EXCEL (XLSX no disponible)','red');
  const p = activeProj();
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type:'array' });
    const sheets = {};
    wb.SheetNames.forEach(sn => { sheets[sn] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header:1, defval:'', raw:true, blankrows:false }); });
    const tieneTorre = wb.SheetNames.some(sn => /^T\d+$/i.test(sn.trim()));
    if (!tieneTorre && !wb.SheetNames.some(sn => /^PRECIOS$/i.test(sn))) {
      return window.prAlert({ title:'ARCHIVO NO VÁLIDO', body:'El archivo no parece la plantilla de receta (faltan hojas T1/T2/... y PRECIOS).' });
    }
    const { recetaV2, precios, avisos } = parseRecetaWorkbook(sheets, p.towers || []);
    const nNiv = Object.keys(recetaV2.niveles).length;
    let nLineas = 0; Object.values(recetaV2.niveles).forEach(et => et.forEach(l => nLineas += l.length));
    let body = '<div style="font-size:12px;line-height:1.6;color:#1F2937">'
      + '<div>Niveles con receta: <strong>'+nNiv+'</strong></div>'
      + '<div>Líneas de material: <strong>'+nLineas+'</strong></div>'
      + '<div>Productos en precios: <strong>'+Object.keys(precios).length+'</strong></div>';
    if (avisos.length) body += '<div style="margin-top:10px;padding:10px;background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;color:#92400E;font-size:11px">'+avisos.map(a=>'• '+a.replace(/[&<>]/g,'')).join('<br>')+'</div>';
    body += '<div style="margin-top:10px;color:#991B1B;font-size:11px">Esto REEMPLAZA la receta y los precios actuales del proyecto.</div></div>';
    const ok = await window.prConfirm({ title:'CARGAR RECETA', bodyHTML:body, okText:'CARGAR', cancelText:'CANCELAR' });
    if (!ok) return;
    p.materiales.recetaV2 = recetaV2;
    recetaV2.fuente = file.name.replace(/\.(xlsx|xls)$/i,'');
    recetaV2.importadoTs = Date.now();
    recetaV2.importadoPor = (typeof window._getUserEmail==='function' ? (window._getUserEmail()||'') : '');
    p.materiales.precios = precios;
    try { if (typeof logActivity==='function') logActivity('update','Receta de material cargada', p.name+' · '+nNiv+' niveles · '+nLineas+' líneas'); } catch(e){}
    saveState();
    try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
    showToast('RECETA CARGADA','green');
    if (typeof renderRecetaV2==='function') renderRecetaV2();
  } catch(err){
    console.error('importarRecetaExcel:', err);
    window.prAlert({ title:'ERROR AL LEER EL EXCEL', body:String(err && err.message ? err.message : err) });
  }
};
```

- [ ] **Step 3: Verificación funcional**

1. Cargar la app (con usuario admin). Ir a MATERIALES → RECETA.
2. Clic en **CARGAR RECETA (EXCEL)** → elegir `C:\Users\Antonio Caravantes\Downloads\RECETA ESSENZA FASE 2 - PLANTILLA APP.xlsx`.
3. El modal debe decir **Niveles con receta: 24**, **Líneas: ~960**, **Productos: 27** (y avisos si hay sin precio).
4. Confirmar → toast verde "RECETA CARGADA".
5. En consola: `window.state.projects.find(x=>x.id==='essenza-f2').materiales.recetaV2.niveles['t4-n1'][0][0]` → `{m:'Canal de 2 1/2" calibre 26', u:'U', c:120}`.

- [ ] **Step 4: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): importador Excel de la plantilla -> recetaV2 + precios (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Ver la receta (`renderRecetaV2`)

**Files:**
- Modify: `index.html` — función global `renderRecetaV2()` + llamada desde `renderMateriales()`.

- [ ] **Step 1: Implementar `renderRecetaV2`** — agregar función global:

```js
let recetaV2TorreSel = null, recetaV2NivelSel = null;
window.setRecetaV2Sel = function(torreId, levelId){ recetaV2TorreSel = torreId; recetaV2NivelSel = levelId; renderRecetaV2(); };
window.renderRecetaV2 = function(){
  const p = activeProj();
  const wrap = document.getElementById('recetaV2Wrap');
  const cont = document.getElementById('recetaV2Content');
  if (!wrap || !cont) return;
  const rv = p.materiales && p.materiales.recetaV2;
  const legacy = ['recetaStageTabs','recetaContent','recetaModeLabel','btnRecetaLimpiar'];
  // botón solicitudes (n)
  const pend = (p.solicitudesReceta||[]).filter(s => s.estado==='PENDIENTE').length;
  const bSol = document.getElementById('btnVerSolReceta');
  if (bSol){ bSol.style.display = pend>0 ? '' : 'none'; bSol.textContent = 'SOLICITUDES ('+pend+')'; }

  if (!rv || !rv.niveles || !Object.keys(rv.niveles).length){
    // sin receta v2: mostrar legacy (compat) y estado vacío arriba
    legacy.forEach(id => { const el=document.getElementById(id); if (el) el.style.display=''; });
    cont.innerHTML = '<div style="padding:18px;text-align:center;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;color:#64748B;font-size:12px">No hay receta cargada. Usá <strong>CARGAR RECETA (EXCEL)</strong> con la plantilla del proyecto.</div>';
    return;
  }
  // hay receta v2: ocultar legacy
  legacy.forEach(id => { const el=document.getElementById(id); if (el) el.style.display='none'; });

  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money = n => 'Q' + (Number(n)||0).toLocaleString('es-GT',{minimumFractionDigits:2, maximumFractionDigits:2});
  const precios = p.materiales.precios || {};
  // niveles por torre
  const torres = (p.towers||[]).filter(t => (t.levels||[]).some(l => rv.niveles[l.id]));
  if (!recetaV2TorreSel || !torres.some(t=>t.id===recetaV2TorreSel)) recetaV2TorreSel = torres[0] ? torres[0].id : null;
  const torre = torres.find(t => t.id===recetaV2TorreSel);
  const niveles = torre ? (torre.levels||[]).filter(l => rv.niveles[l.id]) : [];
  if (!recetaV2NivelSel || !niveles.some(l=>l.id===recetaV2NivelSel)) recetaV2NivelSel = niveles[0] ? niveles[0].id : null;

  const chips = arr => arr.map(it => '<button class="btn ghost sm" style="font-size:11px;'+(it.active?'background:var(--cafe);color:#fff;border-color:var(--cafe)':'')+'" onclick="'+it.onclick+'">'+esc(it.label)+'</button>').join(' ');
  let html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'
    + chips(torres.map(t => ({ label:t.name, active:t.id===recetaV2TorreSel, onclick:"setRecetaV2Sel('"+t.id+"', null)" }))) + '</div>';
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'
    + chips(niveles.map(l => ({ label:l.name, active:l.id===recetaV2NivelSel, onclick:"setRecetaV2Sel('"+recetaV2TorreSel+"','"+l.id+"')" }))) + '</div>';

  const puedeEditar = can('receta.edit') || can('users.manage');
  const fills = ['#FDE9E7','#E7F0FD','#E9F7E9','#FBF4E1'];
  const etapas = rv.niveles[recetaV2NivelSel] || [[],[],[],[]];
  let totalNivel = 0;
  etapas.forEach((lineas, ei) => {
    let totalEtapa = 0;
    html += '<div style="border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px;overflow:hidden">';
    html += '<div style="padding:8px 12px;font-size:11px;font-weight:700;letter-spacing:.5px;background:'+fills[ei]+';color:#374151">'+esc(rv.etapas[ei])
      + (puedeEditar ? '<button class="btn ghost sm" style="float:right;font-size:10px;padding:2px 8px" onclick="recetaV2Op(\''+recetaV2NivelSel+'\','+ei+',\'agregar\')">+ AGREGAR</button>' : '')
      + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="color:#6B7280;font-size:10px"><th style="text-align:left;padding:6px 12px">MATERIAL</th><th style="padding:6px 6px">U</th><th style="text-align:right;padding:6px 6px">CANT</th><th style="text-align:right;padding:6px 6px">P.U.</th><th style="text-align:right;padding:6px 12px">SUBTOTAL</th><th></th></tr></thead><tbody>';
    if (!lineas.length) html += '<tr><td colspan="6" style="padding:10px 12px;color:#9CA3AF">— sin materiales —</td></tr>';
    lineas.forEach(l => {
      const prod = normProducto(l.m);
      const pu = precios[prod] && precios[prod].precio ? precios[prod].precio : 0;
      const sub = pu * (Number(l.c)||0);
      totalEtapa += sub;
      const accion = puedeEditar ? 'recetaV2Op' : 'recetaV2Solicitar';
      html += '<tr style="border-top:1px solid #F1F5F9">'
        + '<td style="padding:6px 12px">'+esc(l.m)+'</td>'
        + '<td style="text-align:center;color:#6B7280">'+esc(l.u)+'</td>'
        + '<td style="text-align:right;font-variant-numeric:tabular-nums">'+(Number(l.c)||0).toLocaleString('es-GT')+'</td>'
        + '<td style="text-align:right;color:'+(pu?'#374151':'#D1D5DB')+'">'+(pu?money(pu):'—')+'</td>'
        + '<td style="text-align:right;font-variant-numeric:tabular-nums">'+(pu?money(sub):'—')+'</td>'
        + '<td style="text-align:right;white-space:nowrap;padding-right:8px">'
          + '<button class="btn-icon" title="Editar cantidad" onclick="'+accion+'(\''+recetaV2NivelSel+'\','+ei+',\'cantidad\',\''+esc(l.m).replace(/'/g,"\\'")+'\')">✎</button>'
          + '<button class="btn-icon danger" title="Quitar" onclick="'+accion+'(\''+recetaV2NivelSel+'\','+ei+',\'quitar\',\''+esc(l.m).replace(/'/g,"\\'")+'\')">✕</button>'
        + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="text-align:right;padding:6px 12px;font-size:11px;color:#6B7280;background:#FAFAFA">Subtotal etapa: <strong style="color:#374151">'+money(totalEtapa)+'</strong></div>';
    html += '</div>';
    totalNivel += totalEtapa;
  });
  html += '<div style="text-align:right;font-size:13px;font-weight:700;color:var(--cafe);padding:6px 4px">TOTAL NIVEL: '+money(totalNivel)+'</div>';
  cont.innerHTML = html;
  if (typeof applyPermissions==='function') applyPermissions();
};
```

- [ ] **Step 2: Llamar a `renderRecetaV2` desde `renderMateriales`** — en `renderMateriales()`, ancla la línea `try { if (typeof renderReceta === 'function') renderReceta(); } catch(e) { console.warn('renderReceta failed:', e); }` (≈L13672). Agregar JUSTO DESPUÉS:

```js
  try { if (typeof renderRecetaV2 === 'function') renderRecetaV2(); } catch(e) { console.warn('renderRecetaV2 failed:', e); }
```

- [ ] **Step 3: Verificación funcional**

1. Con receta cargada (Task 5), ir a MATERIALES → RECETA.
2. Deben verse chips de TORRE (TORRE III / TORRE IV) y de NIVEL (1..12). Por default primer torre/nivel.
3. 4 bloques de etapa con materiales, cantidades, P.U. (— si sin precio), subtotal por etapa y TOTAL NIVEL.
4. Cambiar de nivel/torre con los chips actualiza la tabla.
5. La UI vieja (tabs de etapa por número) queda oculta.

- [ ] **Step 4: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): vista renderRecetaV2 por torre/nivel con precios (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Editar / Solicitar (cambiar · agregar · quitar)

`recetaV2Op` aplica directo (admin/gerente). `recetaV2Solicitar` crea solicitud (los demás). Ambas comparten la captura de datos.

**Files:**
- Modify: `index.html` — funciones globales `recetaV2Op`, `recetaV2Solicitar`, helper `_recetaV2PedirDatos`.

- [ ] **Step 1: Implementar** — agregar funciones globales:

```js
// Recoge datos según tipo. Devuelve {material, unidad, cantidadNueva, cantidadActual} o null si cancela.
window._recetaV2PedirDatos = async function(levelId, etapaIdx, tipo, material){
  const p = activeProj();
  const lista = (p.materiales.recetaV2.niveles[levelId] || [[],[],[],[]])[etapaIdx] || [];
  if (tipo === 'cantidad'){
    const line = lista.find(l => l.m === material);
    const actual = line ? line.c : 0;
    const v = await window.prPrompt({ title:'CAMBIAR CANTIDAD', body:material+'\nCantidad actual: '+actual, placeholder:'nueva cantidad', defaultValue:String(actual), required:true });
    if (v === null) return null;
    const c = Number(String(v).replace(/[^\d.]/g,''));
    if (!(c >= 0)) { showToast('CANTIDAD INVÁLIDA','red'); return null; }
    return { material, unidad: line ? line.u : 'U', cantidadNueva: c, cantidadActual: actual };
  }
  if (tipo === 'quitar'){
    const okq = await window.prConfirm({ title:'QUITAR MATERIAL', bodyHTML:'<div style="font-size:12px">¿Quitar <strong>'+material.replace(/[&<>]/g,'')+'</strong> de esta etapa?</div>', okText:'QUITAR', cancelText:'CANCELAR', danger:true });
    if (!okq) return null;
    return { material, unidad:'U', cantidadNueva:0, cantidadActual:0 };
  }
  if (tipo === 'agregar'){
    const nombre = await window.prPrompt({ title:'AGREGAR MATERIAL', body:'Nombre del material', placeholder:'ej: Tornillo de 1" pf', required:true });
    if (nombre === null || !String(nombre).trim()) return null;
    const unidad = await window.prPrompt({ title:'UNIDAD', body:'Unidad (U, LB, ...)', placeholder:'U', defaultValue:'U', required:true });
    if (unidad === null) return null;
    const v = await window.prPrompt({ title:'CANTIDAD', body:'Cantidad total del nivel', placeholder:'0', required:true });
    if (v === null) return null;
    const c = Number(String(v).replace(/[^\d.]/g,''));
    if (!(c >= 0)) { showToast('CANTIDAD INVÁLIDA','red'); return null; }
    return { material:String(nombre).trim(), unidad:String(unidad).trim()||'U', cantidadNueva:c, cantidadActual:null };
  }
  return null;
};

window.recetaV2Op = async function(levelId, etapaIdx, tipo, material){
  if (!(can('receta.edit') || can('users.manage'))) return showToast('SIN PERMISO','red');
  const p = activeProj();
  const datos = await window._recetaV2PedirDatos(levelId, etapaIdx, tipo, material);
  if (!datos) return;
  const res = aplicarOperacionReceta(p.materiales.recetaV2, p.materiales.precios, { tipo, levelId, etapaIdx, material:datos.material, unidad:datos.unidad, cantidadNueva:datos.cantidadNueva });
  if (!res.ok) return showToast('NO SE PUDO: '+(res.error||''),'red');
  try { if (typeof logActivity==='function') logActivity('update','Receta editada', p.name+' · '+tipo+' · '+datos.material); } catch(e){}
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  showToast('RECETA ACTUALIZADA','green');
  renderRecetaV2();
};

window.recetaV2Solicitar = async function(levelId, etapaIdx, tipo, material){
  const p = activeProj();
  const datos = await window._recetaV2PedirDatos(levelId, etapaIdx, tipo, material);
  if (!datos) return;
  if (!Array.isArray(p.solicitudesReceta)) p.solicitudesReceta = [];
  const torre = (p.towers||[]).find(t => (t.levels||[]).some(l => l.id===levelId));
  const lvl = torre && (torre.levels||[]).find(l => l.id===levelId);
  const etiqueta = (torre?torre.name:'')+' · '+(lvl?lvl.name:'')+' · '+(p.materiales.recetaV2.etapas[etapaIdx]||('ETAPA '+(etapaIdx+1)));
  const verbo = tipo==='cantidad' ? (datos.cantidadActual+' → '+datos.cantidadNueva) : (tipo==='agregar' ? ('AGREGAR · '+datos.cantidadNueva+' '+datos.unidad) : 'QUITAR');
  p.solicitudesReceta.push({
    id:'rec_'+Date.now()+'_'+Math.floor(Math.random()*100000),
    tipo, levelId, etapaIdx, material:datos.material, unidad:datos.unidad,
    cantidadActual:datos.cantidadActual, cantidadNueva:datos.cantidadNueva,
    resumen: etiqueta+' · '+datos.material+' · '+verbo,
    by:(typeof window._getUserEmail==='function'?(window._getUserEmail()||''):''),
    byNombre:(typeof window._getUserDisplayName==='function'?(window._getUserDisplayName()||''):''),
    ts:Date.now(), estado:'PENDIENTE', procesadoPor:'', fechaProceso:'', motivoRechazo:''
  });
  try { if (typeof logActivity==='function') logActivity('request','Solicitud cambio receta', p.name+' · '+tipo+' · '+datos.material); } catch(e){}
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  await window.prAlert({ title:'SOLICITUD ENVIADA', body:'Tu solicitud de cambio fue enviada. Admin o gerente de proyectos la autorizará.' });
  renderRecetaV2();
};
```

- [ ] **Step 2: Verificación funcional (autorizado)**

1. Como admin: en una línea, clic ✎ → cambiar cantidad → toast "RECETA ACTUALIZADA", la tabla refleja el cambio y el subtotal recalcula.
2. Clic **+ AGREGAR** en una etapa → nombre/unidad/cantidad → la línea aparece; el producto nuevo aparece en PRECIOS (Task 9) con precio 0.
3. Clic ✕ → confirmar → la línea desaparece.

- [ ] **Step 3: Verificación funcional (no autorizado)**

1. Con un usuario con `view.materiales` pero SIN `receta.edit`: los botones ✎/✕/AGREGAR llaman a `recetaV2Solicitar` → "SOLICITUD ENVIADA". La receta NO cambia. Aparece botón **SOLICITUDES (1)**.

- [ ] **Step 4: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): editar directo (admin/gerente) o por solicitud (resto) (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Solicitudes de receta (ver / autorizar / rechazar)

Espejo del patrón `solicitudesMover` (L8786-8865). Gate: `can('receta.edit') || can('users.manage')`.

**Files:**
- Modify: `index.html` — `verSolicitudesReceta`, `autorizarReceta`, `rechazarReceta` + listener delegado.

- [ ] **Step 1: Implementar** — agregar (junto a las funciones de receta):

```js
window.autorizarReceta = async function(solId){
  if (!(can('receta.edit') || can('users.manage'))){ showToast('SOLO ADMIN O GERENTE PUEDE AUTORIZAR','red'); return; }
  const p = activeProj();
  if (!p || !Array.isArray(p.solicitudesReceta)) return;
  const sol = p.solicitudesReceta.find(s => s.id === solId);
  if (!sol || sol.estado !== 'PENDIENTE'){ showToast('SOLICITUD NO ENCONTRADA O YA PROCESADA','red'); return; }
  const res = aplicarOperacionReceta(p.materiales.recetaV2, p.materiales.precios, { tipo:sol.tipo, levelId:sol.levelId, etapaIdx:sol.etapaIdx, material:sol.material, unidad:sol.unidad, cantidadNueva:sol.cantidadNueva });
  if (!res.ok){ showToast('NO SE PUDO APLICAR: '+(res.error||''),'red'); return; }
  sol.estado = 'APROBADA';
  sol.procesadoPor = (typeof window._getUserEmail==='function' ? window._getUserEmail() : '') || '';
  sol.fechaProceso = new Date().toISOString();
  try { if (typeof logActivity==='function') logActivity('update','Cambio de receta autorizado', p.name+' · '+sol.tipo+' · '+sol.material); } catch(e){}
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  showToast('CAMBIO AUTORIZADO','green');
  if (typeof renderRecetaV2==='function') renderRecetaV2();
};
window.rechazarReceta = async function(solId){
  if (!(can('receta.edit') || can('users.manage'))){ showToast('SOLO ADMIN O GERENTE PUEDE RECHAZAR','red'); return; }
  const p = activeProj();
  if (!p || !Array.isArray(p.solicitudesReceta)) return;
  const sol = p.solicitudesReceta.find(s => s.id === solId);
  if (!sol || sol.estado !== 'PENDIENTE'){ showToast('SOLICITUD NO ENCONTRADA O YA PROCESADA','red'); return; }
  const motivo = await window.prPrompt({ title:'RECHAZAR SOLICITUD', body:'Motivo del rechazo (opcional)', placeholder:'ej: la cantidad no corresponde', required:false });
  if (motivo === null) return;
  sol.estado = 'RECHAZADA'; sol.motivoRechazo = motivo || '';
  sol.procesadoPor = (typeof window._getUserEmail==='function' ? window._getUserEmail() : '') || '';
  sol.fechaProceso = new Date().toISOString();
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  showToast('SOLICITUD RECHAZADA','green');
  if (typeof renderRecetaV2==='function') renderRecetaV2();
};
window.verSolicitudesReceta = async function(){
  const p = activeProj();
  if (!p){ showToast('SIN PROYECTO ACTIVO','red'); return; }
  if (!Array.isArray(p.solicitudesReceta)) p.solicitudesReceta = [];
  const esGer = can('receta.edit') || can('users.manage');
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const fFecha = iso => { try { const d=new Date(iso); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); } catch(e){ return ''; } };
  const sols = p.solicitudesReceta.slice();
  const pend = sols.filter(s => s.estado==='PENDIENTE');
  const proc = sols.filter(s => s.estado!=='PENDIENTE').sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,15);
  let body = '<div style="font-size:12px;color:#1F2937;line-height:1.5;margin-bottom:14px">'+(esGer?'Solicitudes de cambio de receta. Autorizá o rechazá.':'Tus solicitudes de cambio y su estado.')+'</div>';
  if (!pend.length) body += '<div style="padding:18px;text-align:center;background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;color:#15803D;font-weight:700;margin-bottom:14px">SIN PENDIENTES</div>';
  else {
    body += '<div style="border:1px solid #FCD34D;border-radius:8px;margin-bottom:14px;background:#FFFBEB"><div style="padding:10px 14px;font-size:11px;font-weight:700;color:#92400E;background:#FEF3C7;border-bottom:1px solid #FCD34D;letter-spacing:.6px;border-radius:8px 8px 0 0">PENDIENTES · '+pend.length+'</div><div style="padding:10px 14px">';
    pend.forEach(s => {
      body += '<div data-rec-card="'+esc(s.id)+'" style="background:#fff;border:1px solid #FCD34D;border-radius:6px;padding:10px 12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px"><strong style="font-size:11.5px;color:#0F172A">'+esc((s.tipo||'').toUpperCase())+'</strong><span style="font-size:9.5px;color:#64748B">'+esc(s.byNombre||s.by||'—')+' · '+esc(fFecha(s.ts))+'</span></div><div style="font-size:11px;color:#475569">'+esc(s.resumen||'')+'</div>';
      if (esGer) body += '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end"><button class="btn ghost sm" data-action="rechazarRec" data-id="'+esc(s.id)+'" style="color:#DC2626;border-color:#FCA5A5;font-size:10px">RECHAZAR</button><button class="btn sm" data-action="autorizarRec" data-id="'+esc(s.id)+'" style="background:#15803D;border-color:#15803D;color:#fff;font-size:10px">AUTORIZAR</button></div>';
      body += '</div>';
    });
    body += '</div></div>';
  }
  if (proc.length){
    body += '<div style="border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC"><div style="padding:10px 14px;font-size:11px;font-weight:700;color:#475569;background:#F1F5F9;border-bottom:1px solid #E2E8F0;letter-spacing:.6px;border-radius:8px 8px 0 0">HISTORIAL · ÚLTIMAS '+proc.length+'</div><div style="padding:8px 14px">';
    proc.forEach(s => {
      const estBadge = s.estado==='APROBADA' ? '<span class="planilla-badge" style="background:#DCFCE7;color:#15803D;border:1px solid #86EFAC;font-size:8.5px">APROBADA</span>' : '<span class="planilla-badge" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-size:8.5px">RECHAZADA</span>';
      body += '<div style="padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:10.5px;color:#475569;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center"><div>'+estBadge+'</div><div>'+esc(s.resumen||'')+(s.motivoRechazo?' · "'+esc(s.motivoRechazo)+'"':'')+'</div></div>';
    });
    body += '</div></div>';
  }
  await window.prConfirm({ title:'SOLICITUDES DE RECETA', bodyHTML:body, okText:'CERRAR', cancelText:'', wide:true });
};
if (!window._solRecDelegateInstalled){
  document.body.addEventListener('click', function(ev){
    const aBtn = ev.target.closest && ev.target.closest('button[data-action="autorizarRec"]');
    const rBtn = ev.target.closest && ev.target.closest('button[data-action="rechazarRec"]');
    if (aBtn){ const id = aBtn.getAttribute('data-id'); if (id){ aBtn.disabled=true; aBtn.textContent='Autorizando...'; Promise.resolve(window.autorizarReceta(id)).then(()=>{ const c=aBtn.closest('[data-rec-card]'); if (c){ c.style.opacity='.5'; setTimeout(()=>c.remove(),300); } }).catch(()=>{}); } }
    if (rBtn){ const id = rBtn.getAttribute('data-id'); if (id) Promise.resolve(window.rechazarReceta(id)).then(()=>{ const c=rBtn.closest('[data-rec-card]'); if (c){ c.style.opacity='.5'; setTimeout(()=>c.remove(),300); } }).catch(()=>{}); }
  });
  window._solRecDelegateInstalled = true;
}
```

- [ ] **Step 2: Verificación funcional**

1. Crear una solicitud como usuario sin permiso (Task 7).
2. Como admin/gerente: aparece **SOLICITUDES (1)** → clic → modal con la pendiente.
3. **AUTORIZAR** → aplica el cambio a la receta (verificar en la tabla) → pasa a HISTORIAL como APROBADA → el contador baja.
4. Crear otra y **RECHAZAR** con motivo → HISTORIAL muestra RECHAZADA + motivo; la receta NO cambió.

- [ ] **Step 3: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): solicitudes de cambio ver/autorizar/rechazar (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Catálogo de precios (producto → proveedor + precio)

**Files:**
- Modify: `index.html` — botón "PRECIOS" en `recetaV2Wrap` + función `verCatalogoPreciosReceta()` (modal editable).

- [ ] **Step 1: Agregar botón** — dentro del header de `recetaV2Wrap` (Task 5 Step 1), junto a CARGAR RECETA, agregar:

```html
      <button class="btn ghost sm" id="btnPreciosReceta" data-perm="receta.edit" onclick="verCatalogoPreciosReceta()">PRECIOS</button>
```

- [ ] **Step 2: Implementar** — agregar funciones globales:

```js
window.verCatalogoPreciosReceta = async function(){
  if (!(can('receta.edit') || can('users.manage'))) return showToast('SIN PERMISO','red');
  const p = activeProj();
  const precios = p.materiales.precios || (p.materiales.precios = {});
  const provs = (p.materiales.proveedores||[]).map(pr => pr.nombre).filter(Boolean);
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const keys = Object.keys(precios).sort((a,b)=>a.localeCompare(b));
  const sinPrecio = keys.filter(k => !(precios[k].precio>0)).length;
  let body = '<div style="font-size:11.5px;color:#475569;margin-bottom:10px">Definí <strong>1 proveedor + 1 precio</strong> por producto. '+(sinPrecio?('<span style="color:#B45309">Faltan '+sinPrecio+' con precio.</span>'):'Todos tienen precio.')+'</div>';
  const dlId = 'dlProvReceta';
  body += '<datalist id="'+dlId+'">'+provs.map(pr=>'<option value="'+esc(pr)+'">').join('')+'</datalist>';
  body += '<div style="max-height:50vh;overflow:auto;border:1px solid #E5E7EB;border-radius:8px">';
  body += '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="position:sticky;top:0;background:#374151;color:#fff;font-size:10px"><th style="text-align:left;padding:6px 8px">PRODUCTO</th><th style="padding:6px 4px">U</th><th style="padding:6px 4px">PROVEEDOR</th><th style="padding:6px 8px">PRECIO Q</th></tr></thead><tbody>';
  keys.forEach(k => {
    const e = precios[k];
    body += '<tr style="border-top:1px solid #F1F5F9">'
      + '<td style="padding:5px 8px">'+esc(k)+'</td>'
      + '<td style="text-align:center;color:#6B7280">'+esc(e.unidad||'U')+'</td>'
      + '<td style="padding:3px 4px"><input list="'+dlId+'" value="'+esc(e.proveedor||'')+'" style="width:150px;font-size:11px;padding:3px 6px;border:1px solid #D1D5DB;border-radius:5px" oninput="setPrecioReceta(\''+esc(k).replace(/'/g,"\\'")+'\',\'proveedor\',this.value)"></td>'
      + '<td style="padding:3px 8px;text-align:right"><input type="number" step="0.01" value="'+(e.precio||0)+'" style="width:90px;font-size:11px;padding:3px 6px;border:1px solid '+(e.precio>0?'#D1D5DB':'#FBBF24')+';border-radius:5px;text-align:right" oninput="setPrecioReceta(\''+esc(k).replace(/'/g,"\\'")+'\',\'precio\',this.value)"></td>'
      + '</tr>';
  });
  body += '</tbody></table></div>';
  await window.prConfirm({ title:'CATÁLOGO DE PRECIOS', bodyHTML:body, okText:'CERRAR', cancelText:'', wide:true });
  saveState();
  try { if (CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); } catch(e){}
  if (typeof renderRecetaV2==='function') renderRecetaV2();
};
window.setPrecioReceta = function(producto, campo, valor){
  const p = activeProj();
  if (!p.materiales.precios[producto]) p.materiales.precios[producto] = { proveedor:'', precio:0, unidad:'U', proveedorId:'' };
  const e = p.materiales.precios[producto];
  if (campo === 'precio') e.precio = Number(valor)||0;
  else { e.proveedor = String(valor||'').trim(); const pr = (p.materiales.proveedores||[]).find(x=>x.nombre===e.proveedor); e.proveedorId = pr ? pr.id : ''; }
  saveState();
};
```

- [ ] **Step 3: Verificación funcional**

1. Como admin: clic **PRECIOS** → tabla con los 27 productos; los sin precio tienen borde ámbar.
2. Escribir un proveedor (autocompleta desde el catálogo de proveedores) y un precio → cerrar.
3. Volver a la receta: la columna P.U. y los subtotales reflejan el precio puesto.
4. Reabrir PRECIOS: los valores persisten (se guardaron).

- [ ] **Step 4: Validar JS y commit**

Run: `node _recetatest/valjs.js` → `errs=1`.
```bash
git add index.html
git commit -m "feat(receta): catalogo de precios producto->proveedor+precio (Fase 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Verificación integral + deploy

**Files:**
- Modify: `sw.js` (bump `CACHE_VERSION`)
- Modify: `index.html` (bump chip de versión en `<footer class="foot">`)

- [ ] **Step 1: Repaso funcional completo (admin)** — receta cargada; ver por torre/nivel; editar cantidad/agregar/quitar directo; precios; subtotales correctos.

- [ ] **Step 2: Repaso funcional (sin permiso)** — todo genera solicitud; admin autoriza/rechaza; cambios se aplican solo al autorizar.

- [ ] **Step 3: Persistencia multi-dispositivo** — recargar en otro navegador/sesión: la receta, precios y solicitudes llegan desde la nube (`recetaV2` no es null).

- [ ] **Step 4: Correr todos los tests de lógica pura**

Run: `node _recetatest/run.js`
Expected: `PASS=23 FAIL=0`.

- [ ] **Step 5: Validar JS final**

Run: `node _recetatest/valjs.js`
Expected: `errs=1`.

- [ ] **Step 6: Bump de versión** — en `sw.js`, cambiar `const CACHE_VERSION = '...'` a `'vNNN-materiales-receta-fase1'` (NNN = siguiente número). En `index.html`, ancla `<footer class="foot"><span style="opacity:.5;font-size:9px">vNNN</span></footer>` → subir `vNNN`.

- [ ] **Step 7: Commit + push (SOLO si el usuario lo pide)**

```bash
git add index.html sw.js
git commit -m "release: vNNN MATERIALES Fase 1 (receta + precios)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

Verificar deploy ~30s después en `puntorojo.app` (forzar recarga del SW).

---

## Notas de cobertura del spec

- **§4 Ingesta** → Tasks 2, 5. **§5 Ver** → Task 6. **§6 Editar con autorización (3 ops, directo/solicitud)** → Tasks 3, 7, 8. **§7 Precios** → Tasks 2, 9. **§3 Modelo de datos** → Tasks 1-4. **§8 Permisos** → gates en Tasks 5-9 (`receta.edit`/`users.manage`/`view.materiales`). **§9 Persistencia** → `saveState()`+`CloudSync` en cada mutación. **§10 Pruebas** → Tasks 1-3 (Node) + verificaciones funcionales.
- **Fuera de alcance (Fase 2/3):** generar pedido por etapa+nivel, enviar a compras, OC automática. No se tocan `pedidos`/`ordenes`/`etapasPedidas` en Fase 1.
- **Config (no código):** el perfil del gerente de proyectos debe tener el permiso `receta.edit` asignado en Gestión de Usuarios para editar directo.
