# Asistencia por reconocimiento facial (kiosko) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marcar asistencia escaneando caras con el celular en modo kiosko: identifica a la persona y marca entrada/salida del día con la hora.

**Architecture:** Toda la lógica pura (entrada/salida, selección de candidatos por umbral, migración) va al bloque `// ===RECETA-PURE-START===`…`END===` de `index.html` y se prueba con `node _recetatest/run.js`. El reconocimiento corre en el navegador con face-api.js (on-device). La UI (enrolar + kiosko) se agrega a la sección PERSONAL → ASISTENCIA. Los datos viven en `personalGlobal[i].face` y `asistenciaGlobal[fecha][id]` (estado global, sincronizado por CloudSync).

**Tech Stack:** PWA single-file (`index.html`), Firebase (Auth/Firestore/Storage compat), face-api.js (@vladmandic/face-api vía jsDelivr), getUserMedia + canvas, jsPDF (reportes existentes). Tests: `_recetatest/tests.js` + `run.js` (Node, sin framework).

---

## Convenciones del repo (leer antes de empezar)

- **Pruebas puras:** funciones puras entre `// ===RECETA-PURE-START===` (L≈19852) y `// ===RECETA-PURE-END===` (L≈20195). Para exponer una función al test runner hay que (a) definirla en ese bloque y (b) agregar `api.NOMBRE=typeof NOMBRE!=="undefined"?NOMBRE:undefined;` dentro del string `new Function('api', …)` de `_recetatest/run.js` (este archivo es local/gitignored — editarlo es seguro).
- **Tests:** se escriben en `_recetatest/tests.js` usando `t.eq(nombre, got, exp)` y `t.ok(nombre, cond)`, accediendo a las funciones por `t.api.NOMBRE`.
- **Verificación obligatoria antes de cada deploy:** `node _recetatest/valjs.js` debe terminar `blocks=26 errs=1` (el `PARSE ERR block#13` es baseline intencional); `node _recetatest/run.js` debe terminar `FAIL=0`.
- **Deploy:** subir `CACHE_VERSION` en `sw.js` (L10) y el chip de versión en el footer (`font-size:9px">vNNN<`), commit terminado en `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`, `git push origin main`. Push SOLO cuando el usuario lo indique.
- **CRLF:** el archivo es CRLF; re-Read justo antes de cada Edit para evitar "modified since read".
- **Helpers existentes a reutilizar (grep para confirmar firma):** `_getPersonal()`, `_getAsistencia()`, `saveState()`, `CloudSync.uploadCurrent()`, `showToast(msg,color)`, `can(perm)`, `pushPerm({key,label,group})`, `uploadPersonaDPI` (patrón cámara/Storage, L≈16330), `_prLockScroll()`/`_prUnlockScroll()`, `prConfirm`, `renderPersonal()`, `descargarAsistenciaPDF()` (L≈16223), `toggleAsistenciaGlobal` (patrón de fecha+hora del marcado manual).

---

## File Structure

- **`index.html`** — único archivo de la app. Cambios en: bloque RECETA-PURE (funciones puras), bloque de `<script src>` CDN (agregar face-api.js), sección PERSONAL/ASISTENCIA (botones + render entrada/salida), nuevas funciones globales (`loadFaceModels`, enrolamiento, kiosko, `_marcarAsistenciaFacial`), registro de permisos (`pushPerm`), `descargarAsistenciaPDF` (columnas entrada/salida).
- **`_recetatest/tests.js`** — tests de las 3 funciones puras. (git-tracked)
- **`_recetatest/run.js`** — agregar exposición `api.*` de las 3 funciones. (local/gitignored)
- **`sw.js`** — bump `CACHE_VERSION` en el deploy final.

No se crean archivos nuevos; no se hospedan pesos de modelos en el repo (se cargan de jsDelivr y el service worker los cachea solo en el primer uso con internet, vía su rama "cache-first" para GETs no-navegación).

---

## Task 1: Lógica pura entrada/salida (`computeAsistenciaMark`)

**Files:**
- Modify: `index.html` (bloque RECETA-PURE)
- Modify: `_recetatest/run.js` (exposición api)
- Test: `_recetatest/tests.js`

- [ ] **Step 1: Escribir el test que falla**

En `_recetatest/tests.js`, antes del `};` final del `module.exports`, agregar:

```js
  // --- computeAsistenciaMark ---
  const m1 = t.api.computeAsistenciaMark(null, '07:02');
  eq('asis.entrada.accion', m1.accion, 'entrada');
  eq('asis.entrada.val', m1.reg.entrada, '07:02');
  eq('asis.entrada.salidaNull', m1.reg.salida, null);
  eq('asis.entrada.presente', m1.reg.presente, true);
  const m2 = t.api.computeAsistenciaMark({ presente:true, entrada:'07:02', salida:null, obraId:'p1' }, '17:30');
  eq('asis.salida.accion', m2.accion, 'salida');
  eq('asis.salida.val', m2.reg.salida, '17:30');
  eq('asis.salida.entradaKeep', m2.reg.entrada, '07:02');
  eq('asis.salida.obraKeep', m2.reg.obraId, 'p1');
  const m3 = t.api.computeAsistenciaMark({ presente:true, entrada:'07:02', salida:'12:00' }, '17:45');
  eq('asis.salida.update', m3.reg.salida, '17:45');
```

- [ ] **Step 2: Exponer la función en run.js**

En `_recetatest/run.js`, dentro del string del `new Function('api', code + '…')`, agregar antes del `')(api);`:

```js
api.computeAsistenciaMark=typeof computeAsistenciaMark!=="undefined"?computeAsistenciaMark:undefined;
```

- [ ] **Step 3: Correr el test — debe FALLAR**

Run: `node _recetatest/run.js`
Expected: `FAIL` en `asis.*` (función undefined → throw o got=undefined).

- [ ] **Step 4: Implementar en el bloque RECETA-PURE**

Dentro de `// ===RECETA-PURE-START===` … `END===` de `index.html`, agregar:

```js
// Marca entrada (1ra del día) o salida (siguiente, actualiza a la última). Puro.
function computeAsistenciaMark(reg, hhmm){
  const base = (reg && typeof reg === 'object') ? reg : {};
  if (!base.entrada){
    return { reg: Object.assign({}, base, { presente:true, entrada:hhmm, salida:(base.salida||null) }), accion:'entrada' };
  }
  return { reg: Object.assign({}, base, { presente:true, salida:hhmm }), accion:'salida' };
}
```

- [ ] **Step 5: Correr el test — debe PASAR**

Run: `node _recetatest/run.js`
Expected: `PASS=NN FAIL=0` (NN sube respecto al baseline 73).

- [ ] **Step 6: Validar parse y commit**

Run: `node _recetatest/valjs.js` → `blocks=26 errs=1`
```bash
git add index.html _recetatest/tests.js
git commit -m "feat(asistencia): logica pura entrada/salida (computeAsistenciaMark)"
```
(run.js es gitignored; no se commitea.)

---

## Task 2: Lógica pura de candidatos por umbral (`pickFaceCandidates`)

**Files:**
- Modify: `index.html` (RECETA-PURE), `_recetatest/run.js`
- Test: `_recetatest/tests.js`

- [ ] **Step 1: Test que falla**

En `tests.js` agregar:

```js
  // --- pickFaceCandidates (strict=0.48, loose=0.58) ---
  const S=0.48, L=0.58;
  const auto = t.api.pickFaceCandidates([{id:'a',distance:0.30},{id:'b',distance:0.70}], S, L);
  eq('face.auto.status', auto.status, 'auto');
  eq('face.auto.match', auto.matchId, 'a');
  const amb = t.api.pickFaceCandidates([{id:'a',distance:0.30},{id:'b',distance:0.34}], S, L);
  eq('face.amb.status', amb.status, 'confirm');
  eq('face.amb.cands', amb.candidates.length >= 2, true);
  const mid = t.api.pickFaceCandidates([{id:'a',distance:0.52},{id:'b',distance:0.80}], S, L);
  eq('face.mid.status', mid.status, 'confirm');
  eq('face.mid.cand0', mid.candidates[0], 'a');
  const none = t.api.pickFaceCandidates([{id:'a',distance:0.70}], S, L);
  eq('face.none.status', none.status, 'none');
  eq('face.empty.status', t.api.pickFaceCandidates([], S, L).status, 'none');
```

- [ ] **Step 2: Exponer en run.js**

Agregar: `api.pickFaceCandidates=typeof pickFaceCandidates!=="undefined"?pickFaceCandidates:undefined;`

- [ ] **Step 3: Correr — FALLA**

Run: `node _recetatest/run.js` → FAIL en `face.*`.

- [ ] **Step 4: Implementar (RECETA-PURE)**

```js
// Decide auto / confirmar / nada según distancias de match. Puro.
// matches: [{id, distance}]. strict (auto si <=), loose (candidato si <=). margen de ambigüedad 0.06.
function pickFaceCandidates(matches, strict, loose){
  const arr = (matches||[]).filter(m => m && typeof m.distance === 'number').slice().sort((a,b)=>a.distance-b.distance);
  if (!arr.length || arr[0].distance > loose) return { status:'none', matchId:null, candidates:[] };
  const best = arr[0], second = arr[1];
  const ambiguo = second && (second.distance - best.distance) < 0.06;
  if (best.distance <= strict && !ambiguo) return { status:'auto', matchId:best.id, candidates:[best.id] };
  const candidates = arr.filter(m => m.distance <= loose).slice(0,3).map(m => m.id);
  return { status:'confirm', matchId:null, candidates };
}
```

- [ ] **Step 5: Correr — PASA**

Run: `node _recetatest/run.js` → `FAIL=0`.

- [ ] **Step 6: Validar y commit**

Run: `node _recetatest/valjs.js` → `blocks=26 errs=1`
```bash
git add index.html _recetatest/tests.js
git commit -m "feat(asistencia): seleccion de candidatos faciales por umbral (pickFaceCandidates)"
```

---

## Task 3: Migración suave del registro de asistencia (`migrateAsistenciaRegistro`)

**Files:**
- Modify: `index.html` (RECETA-PURE), `_recetatest/run.js`
- Test: `_recetatest/tests.js`

- [ ] **Step 1: Test que falla**

```js
  // --- migrateAsistenciaRegistro ---
  const leg = t.api.migrateAsistenciaRegistro({ presente:true, hora:'07:00', obraId:'p1' });
  eq('mig.entrada', leg.entrada, '07:00');
  eq('mig.salidaNull', leg.salida, null);
  eq('mig.via', leg.via, 'manual');
  eq('mig.obra', leg.obraId, 'p1');
  const nuevo = t.api.migrateAsistenciaRegistro({ presente:true, entrada:'07:00', salida:'17:00', via:'cara' });
  eq('mig.keep.salida', nuevo.salida, '17:00');
  eq('mig.keep.via', nuevo.via, 'cara');
  eq('mig.null', t.api.migrateAsistenciaRegistro(null), null);
```

- [ ] **Step 2: Exponer en run.js**

`api.migrateAsistenciaRegistro=typeof migrateAsistenciaRegistro!=="undefined"?migrateAsistenciaRegistro:undefined;`

- [ ] **Step 3: Correr — FALLA**

Run: `node _recetatest/run.js` → FAIL en `mig.*`.

- [ ] **Step 4: Implementar (RECETA-PURE)**

```js
// Normaliza registros viejos {presente,hora} -> {entrada,salida,via}. Puro, no destructivo.
function migrateAsistenciaRegistro(old){
  if (!old || typeof old !== 'object') return old;
  if (old.entrada !== undefined){
    return Object.assign({ salida:null, via:'manual' }, old);
  }
  const r = Object.assign({}, old);
  r.entrada = (r.hora != null && r.hora !== '') ? r.hora : null;
  if (r.salida === undefined) r.salida = null;
  if (r.via === undefined) r.via = 'manual';
  return r;
}
```

- [ ] **Step 5: Correr — PASA**

Run: `node _recetatest/run.js` → `FAIL=0`.

- [ ] **Step 6: Validar y commit**

```bash
node _recetatest/valjs.js   # blocks=26 errs=1
git add index.html _recetatest/tests.js
git commit -m "feat(asistencia): migracion suave de registro a entrada/salida"
```

---

## Task 4: Cargar face-api.js + loader de modelos

**Files:**
- Modify: `index.html` (bloque de `<script src>` CDN, ~L46-80; y zona de funciones globales)

- [ ] **Step 1: Agregar el CDN de face-api.js**

Grep `cdnjs.cloudflare.com/ajax/libs/Chart.js` para ubicar el bloque de scripts CDN. Inmediatamente después de esa línea, agregar:

```html
<script defer src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"></script>
```

- [ ] **Step 2: Agregar el loader de modelos**

Cerca de otras funciones globales (p.ej. justo antes de `function _personaModalGlobal`), agregar:

```js
let _faceModelsReady = false, _faceModelsLoading = null;
async function loadFaceModels(){
  if (_faceModelsReady) return true;
  if (_faceModelsLoading) return _faceModelsLoading;
  if (!window.faceapi) throw new Error('face-api no cargó (sin internet en el primer arranque)');
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  _faceModelsLoading = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    _faceModelsReady = true;
    return true;
  })();
  return _faceModelsLoading;
}
// Detecta UNA cara en un <video>/<canvas>/<img> y devuelve su descriptor (Float32Array) o null.
async function _detectOneDescriptor(input){
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const det = await faceapi.detectSingleFace(input, opt).withFaceLandmarks().withFaceDescriptor();
  return det || null;
}
```

- [ ] **Step 3: Verificación manual**

Run: `node _recetatest/valjs.js` → `blocks=26 errs=1`. Desplegar a un entorno de prueba (o abrir local) con internet, abrir consola del navegador y correr `await loadFaceModels()` → debe devolver `true` sin errores; `window.faceapi` definido.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(asistencia): cargar face-api.js + loader de modelos on-device"
```

---

## Task 5: Helpers de datos + marcado facial (`_marcarAsistenciaFacial`)

**Files:**
- Modify: `index.html` (zona de funciones de asistencia/personal)

- [ ] **Step 1: Helpers de fecha/hora y de cara**

Grep `toggleAsistenciaGlobal` para ver cómo el marcado manual obtiene la fecha seleccionada y la hora; reutilizar esa lógica. Si no hay helpers, agregar cerca de las funciones de asistencia:

```js
function _asisFechaHoy(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function _asisHoraHHMM(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return p(d.getHours())+':'+p(d.getMinutes()); }
// Descriptores etiquetados para FaceMatcher, desde personalGlobal.
function _facesEnroladas(){
  return (_getPersonal()||[]).filter(p => p && p.face && Array.isArray(p.face.descriptors) && p.face.descriptors.length)
    .map(p => ({ id:p.id, nombre:p.nombre, thumbURL:(p.face.thumbURL||''),
      descriptors: p.face.descriptors.map(d => new Float32Array(d)) }));
}
```

- [ ] **Step 2: Función de marcado**

```js
// Marca entrada/salida facial para una persona en la obra elegida. Devuelve {accion, hora}.
function _marcarAsistenciaFacial(personaId, obraId, obraDesc){
  if (!(can('personal.asistencia') || can('users.manage'))){ showToast('SIN PERMISO','red'); return null; }
  const fecha = _asisFechaHoy(), hhmm = _asisHoraHHMM();
  const asis = _getAsistencia();
  if (!asis[fecha]) asis[fecha] = {};
  const prev = asis[fecha][personaId] ? migrateAsistenciaRegistro(asis[fecha][personaId]) : null;
  const out = computeAsistenciaMark(prev || {}, hhmm);
  const reg = out.reg;
  reg.obraId = obraId; reg.obraDesc = obraDesc || ''; reg.via = 'cara';
  asis[fecha][personaId] = reg;
  saveState();
  try { if (typeof CloudSync!=='undefined' && CloudSync.uploadCurrent) CloudSync.uploadCurrent(); } catch(e){}
  return { accion: out.accion, hora: hhmm };
}
```

- [ ] **Step 3: Verificación manual (consola)**

`node _recetatest/valjs.js` → `blocks=26 errs=1`. En el navegador: `_marcarAsistenciaFacial('<algún personaId>', '<projId>', '')` dos veces → primera devuelve `{accion:'entrada'}`, segunda `{accion:'salida'}`; revisar en ASISTENCIA que quedó marcado.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(asistencia): helpers de cara + _marcarAsistenciaFacial (entrada/salida)"
```

---

## Task 6: Enrolamiento de cara (en la ficha de persona)

**Files:**
- Modify: `index.html` (`_personaModalGlobal` y nuevas funciones de enrolamiento)

- [ ] **Step 1: Botón "REGISTRAR CARA" en el modal de persona**

Grep `FOTO DEL DPI` (dentro de `_personaModalGlobal`). Debajo de esa sección (solo cuando `c` existe, i.e. persona ya guardada), agregar al HTML del modal un bloque:

```html
<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px;font-size:10px;color:var(--mute);letter-spacing:.5px">RECONOCIMIENTO FACIAL</div>
<div style="display:flex;align-items:center;gap:10px;margin-top:6px">
  <div id="_faceStatus" style="font-size:11px;color:var(--mute)"></div>
  <button type="button" class="btn ghost sm" onclick="_abrirEnrolarCara('${c.id}')">REGISTRAR CARA</button>
</div>
```
Y tras insertar el modal, setear el estado: si `e.face && e.face.descriptors?.length` → `#_faceStatus` = "Cara registrada ✓ (N tomas)"; si no → "Sin cara registrada".

- [ ] **Step 2: Modal de captura (cámara + consentimiento)**

Agregar funciones globales:

```js
let _enrolStream = null, _enrolDesc = [], _enrolThumb = null;
async function _abrirEnrolarCara(personaId){
  const p = (_getPersonal()||[]).find(x=>x.id===personaId); if(!p) return;
  try { showToast('CARGANDO RECONOCIMIENTO…',''); await loadFaceModels(); } catch(e){ showToast('NO SE PUDO CARGAR (revisá internet)','red'); return; }
  _enrolDesc = []; _enrolThumb = null;
  const html = '<div class="modal-bg show" id="_enrolModal" style="z-index:100050" onclick="if(event.target===this)_cerrarEnrolar()">'
    + '<div class="modal" style="max-width:420px" onclick="event.stopPropagation()">'
    + '<div class="modal-hd"><h3>REGISTRAR CARA · '+(p.nombre||'').replace(/</g,"&lt;")+'</h3><button class="x" onclick="_cerrarEnrolar()">✕</button></div>'
    + '<div class="modal-bd">'
    + '<video id="_enrolVideo" autoplay playsinline muted style="width:100%;border-radius:8px;background:#000;aspect-ratio:3/4;object-fit:cover"></video>'
    + '<canvas id="_enrolCanvas" style="display:none"></canvas>'
    + '<div id="_enrolCount" style="text-align:center;font-size:12px;color:var(--mute);margin-top:8px">0 / 3 tomas</div>'
    + '<label style="display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:11px;color:var(--text)"><input type="checkbox" id="_enrolConsent" style="margin-top:2px"><span>La persona da su consentimiento para guardar su rostro (dato biométrico) con fines de control de asistencia.</span></label>'
    + '<div style="display:flex;gap:8px;margin-top:12px">'
    + '<button type="button" class="btn" style="flex:1" onclick="_capturarTomaCara()">CAPTURAR TOMA</button>'
    + '<button type="button" class="btn primary" style="flex:1" id="_enrolSaveBtn" onclick="_guardarCara(\''+personaId+'\')">GUARDAR</button>'
    + '</div></div></div></div>';
  const w=document.createElement('div'); w.innerHTML=html; document.body.appendChild(w.firstElementChild);
  if (window._prLockScroll) window._prLockScroll();
  try {
    _enrolStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
    document.getElementById('_enrolVideo').srcObject = _enrolStream;
  } catch(e){ showToast('NO SE PUDO ABRIR LA CÁMARA','red'); _cerrarEnrolar(); }
}
async function _capturarTomaCara(){
  const v = document.getElementById('_enrolVideo'); if(!v) return;
  const det = await _detectOneDescriptor(v);
  if (!det){ showToast('NO SE DETECTÓ UNA CARA, ACOMODATE DE FRENTE','red'); return; }
  _enrolDesc.push(Array.from(det.descriptor));
  // miniatura: recorta la caja de la cara a un canvas chico
  const box = det.detection.box;
  const c = document.getElementById('_enrolCanvas'); c.width=120; c.height=150;
  const ctx = c.getContext('2d');
  ctx.drawImage(v, Math.max(0,box.x-box.width*0.15), Math.max(0,box.y-box.height*0.2), box.width*1.3, box.height*1.5, 0,0,120,150);
  _enrolThumb = c;
  const n = _enrolDesc.length;
  document.getElementById('_enrolCount').textContent = n+' / 3 tomas';
  showToast('TOMA '+n+' OK','green');
  if (n>=3) showToast('LISTO, PODÉS GUARDAR','green');
}
function _cerrarEnrolar(){
  try { if(_enrolStream){ _enrolStream.getTracks().forEach(t=>t.stop()); _enrolStream=null; } } catch(e){}
  const m=document.getElementById('_enrolModal'); if(m) m.remove();
  if (window._prUnlockScroll) window._prUnlockScroll();
}
```

- [ ] **Step 3: Guardar (subir miniatura + persistir)**

Grep el cuerpo de `uploadPersonaDPI` (L≈16330) para copiar EXACTO el patrón de subida a Firebase Storage (obtención del bucket/ref y `getDownloadURL`). Implementar:

```js
async function _guardarCara(personaId){
  if (!document.getElementById('_enrolConsent').checked){ showToast('FALTA EL CONSENTIMIENTO','red'); return; }
  if (!_enrolDesc.length){ showToast('CAPTURÁ AL MENOS UNA TOMA','red'); return; }
  const p = (_getPersonal()||[]).find(x=>x.id===personaId); if(!p){ _cerrarEnrolar(); return; }
  const btn = document.getElementById('_enrolSaveBtn'); if(btn){ btn.disabled=true; btn.textContent='GUARDANDO…'; }
  let thumbURL = (p.face && p.face.thumbURL) || '';
  try {
    if (_enrolThumb){
      const blob = await new Promise(res => _enrolThumb.toBlob(res, 'image/jpeg', 0.8));
      // === Reemplazar por el patrón EXACTO de subida usado en uploadPersonaDPI, ruta 'personal-faces/'+personaId+'.jpg' ===
      thumbURL = await _subirAStorage(blob, 'personal-faces/'+personaId+'.jpg');
    }
  } catch(e){ /* si falla la subida, igual guardamos descriptores; thumb queda como esté */ }
  const u = (typeof currentUser!=='undefined') ? currentUser : null;
  p.face = {
    descriptors: _enrolDesc.slice(0,3),
    thumbURL: thumbURL,
    consent: { at: Date.now(), by: (u && (u.email||u.uid)) || '' },
    enrolledAt: Date.now()
  };
  saveState();
  try { if (CloudSync && CloudSync.uploadCurrent) CloudSync.uploadCurrent(); } catch(e){}
  _cerrarEnrolar();
  showToast('CARA REGISTRADA ✓','green');
  if (typeof renderPersonal==='function') renderPersonal();
}
```
Donde `_subirAStorage(blob, path)` envuelve el patrón de Storage ya usado por `uploadPersonaDPI`. Primero grep `uploadPersonaDPI` y reutilizar su helper de subida si existe. Si no hay helper, definir (usando la API compat de Firebase que ya carga la app):

```js
async function _subirAStorage(blob, path){
  const ref = firebase.storage().ref().child(path);
  const snap = await ref.put(blob, { contentType: 'image/jpeg' });
  return await snap.ref.getDownloadURL();
}
```
Verificar contra `uploadPersonaDPI` que `firebase.storage()` es la forma correcta en este código (puede usarse una instancia ya creada, p.ej. `storage` global); si difiere, usar exactamente la misma que `uploadPersonaDPI`.

- [ ] **Step 4: Verificación manual**

`node _recetatest/valjs.js` → `blocks=26 errs=1`. En el navegador: abrir una persona → REGISTRAR CARA → permitir cámara → CAPTURAR 1-3 tomas (toast OK) → marcar consentimiento → GUARDAR. Reabrir la persona: estado "Cara registrada ✓". Verificar en Firestore/estado que `personalGlobal[i].face.descriptors` tiene 1-3 arrays de 128 y `thumbURL` apunta a la miniatura.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(asistencia): enrolamiento de cara con camara + consentimiento + miniatura"
```

---

## Task 7: Modo kiosko (escanear y marcar)

**Files:**
- Modify: `index.html` (sección ASISTENCIA: botón + pantalla kiosko)

- [ ] **Step 1: Botón "ESCANEAR CARAS" en ASISTENCIA**

Grep el header de la sub-pestaña ASISTENCIA (cerca de `descargarAsistenciaPDF` / el buscador de asistencia). Agregar un botón gateado por permiso:

```html
<button class="btn primary sm" data-perm="personal.asistencia" onclick="_abrirKioskoCaras()">ESCANEAR CARAS</button>
```

- [ ] **Step 2: Pantalla kiosko**

```js
let _kioskStream=null, _kioskLoop=null, _kioskMatcher=null, _kioskBusy=false;
const _kioskLast = {}; // personaId -> timestamp última marca (debounce)
async function _abrirKioskoCaras(){
  if (!(can('personal.asistencia')||can('users.manage'))){ showToast('SIN PERMISO','red'); return; }
  const enroladas = _facesEnroladas();
  if (!enroladas.length){ showToast('NO HAY CARAS REGISTRADAS TODAVÍA','red'); return; }
  try { showToast('CARGANDO RECONOCIMIENTO…',''); await loadFaceModels(); } catch(e){ showToast('NO SE PUDO CARGAR (revisá internet)','red'); return; }
  // FaceMatcher: una LabeledFaceDescriptors por persona enrolada
  _kioskMatcher = new faceapi.FaceMatcher(
    enroladas.map(p => new faceapi.LabeledFaceDescriptors(p.id, p.descriptors)), 0.6);
  // selector de obra: reutilizar las obras (proyectos) como en asistencia manual; default = proyecto activo
  const obras = (typeof state!=='undefined' && state.projects ? state.projects : []).map(pr=>'<option value="'+pr.id+'">'+(pr.name||pr.id)+'</option>').join('');
  const html = '<div id="_kioskScreen" style="position:fixed;inset:0;z-index:100070;background:#0B0B0C;display:flex;flex-direction:column">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff">'
    +   '<span style="font-size:11px;letter-spacing:2px;font-weight:700">ESCANEAR CARAS</span>'
    +   '<select id="_kioskObra" style="margin-left:auto;padding:6px;border-radius:6px">'+obras+'<option value="OTRA">OTRA…</option></select>'
    +   '<button class="btn ghost sm" style="color:#fff;border-color:#555" onclick="_cerrarKiosko()">CERRAR</button>'
    + '</div>'
    + '<div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden">'
    +   '<video id="_kioskVideo" autoplay playsinline muted style="max-width:100%;max-height:100%"></video>'
    +   '<div id="_kioskBanner" style="position:absolute;bottom:0;left:0;right:0;padding:18px;text-align:center;color:#fff;font-size:20px;font-weight:800;background:linear-gradient(transparent,rgba(0,0,0,.7))"></div>'
    + '</div>'
    + '<div id="_kioskCandidates" style="display:none;padding:14px;background:#111;color:#fff"></div>'
    + '</div>';
  const w=document.createElement('div'); w.innerHTML=html; document.body.appendChild(w.firstElementChild);
  if (window._prLockScroll) window._prLockScroll();
  try {
    _kioskStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
    document.getElementById('_kioskVideo').srcObject = _kioskStream;
  } catch(e){ showToast('NO SE PUDO ABRIR LA CÁMARA','red'); _cerrarKiosko(); return; }
  _kioskLoop = setInterval(_kioskTick, 600);
}
function _kioskObra(){ const s=document.getElementById('_kioskObra'); const v=s?s.value:''; return { obraId:v, obraDesc: v==='OTRA' ? 'OTRA' : '' }; }
async function _kioskTick(){
  if (_kioskBusy) return; const v=document.getElementById('_kioskVideo'); if(!v||!v.videoWidth) return;
  _kioskBusy = true;
  try {
    const det = await _detectOneDescriptor(v);
    if (det){
      const all = _kioskMatcher.labeledDescriptors.map(ld => ({ id: ld.label,
        distance: Math.min.apply(null, ld.descriptors.map(d => faceapi.euclideanDistance(d, det.descriptor))) }));
      const pick = pickFaceCandidates(all, 0.48, 0.58);
      if (pick.status==='auto') _kioskMarcar(pick.matchId);
      else if (pick.status==='confirm') _kioskMostrarCandidatos(pick.candidates);
    }
  } catch(e){} finally { _kioskBusy=false; }
}
function _kioskMarcar(personaId){
  const now = Date.now();
  if (_kioskLast[personaId] && (now - _kioskLast[personaId] < 5000)) return; // debounce 5s
  _kioskLast[personaId] = now;
  const { obraId, obraDesc } = _kioskObra();
  const r = _marcarAsistenciaFacial(personaId, obraId, obraDesc);
  if (!r) return;
  const p = (_getPersonal()||[]).find(x=>x.id===personaId);
  const banner = document.getElementById('_kioskBanner');
  banner.style.color = r.accion==='entrada' ? '#34D399' : '#FBBF24';
  banner.textContent = (r.accion==='entrada'?'✓ ENTRADA · ':'✓ SALIDA · ') + ((p&&p.nombre)||'') + ' · ' + r.hora;
  try { new Audio('data:audio/wav;base64,UklGRl9v...').play(); } catch(e){} // opcional: bip corto
  setTimeout(()=>{ if(document.getElementById('_kioskBanner')) banner.textContent=''; }, 2500);
  // (Opcional Fase 2: bip de audio de confirmación.)
}
function _kioskMostrarCandidatos(ids){
  const cont = document.getElementById('_kioskCandidates'); if(!cont) return;
  const personas = (_getPersonal()||[]);
  cont.style.display='block';
  cont.innerHTML = '<div style="font-size:11px;letter-spacing:1px;margin-bottom:8px">¿QUIÉN ES?</div>'
    + ids.map(id => { const p=personas.find(x=>x.id===id)||{};
        return '<button class="btn ghost sm" style="color:#fff;border-color:#555;margin:0 6px 6px 0" onclick="_kioskConfirmar(\''+id+'\')">'+((p.nombre||id))+'</button>'; }).join('')
    + '<button class="btn ghost sm" style="color:#888;border-color:#333" onclick="document.getElementById(\'_kioskCandidates\').style.display=\'none\'">DESCARTAR</button>';
  setTimeout(()=>{ const c=document.getElementById('_kioskCandidates'); if(c) c.style.display='none'; }, 6000);
}
function _kioskConfirmar(id){ document.getElementById('_kioskCandidates').style.display='none'; _kioskMarcar(id); }
function _cerrarKiosko(){
  try { if(_kioskLoop){ clearInterval(_kioskLoop); _kioskLoop=null; } } catch(e){}
  try { if(_kioskStream){ _kioskStream.getTracks().forEach(t=>t.stop()); _kioskStream=null; } } catch(e){}
  const s=document.getElementById('_kioskScreen'); if(s) s.remove();
  if (window._prUnlockScroll) window._prUnlockScroll();
  if (typeof renderPersonal==='function') renderPersonal();
}
```
Nota: si `state.projects` no es el nombre correcto del array de proyectos, grep cómo la asistencia manual lista las obras y usar esa fuente. El bip de audio es opcional; si no se tiene un base64, quitar esa línea.

- [ ] **Step 3: Verificación manual**

`node _recetatest/valjs.js` → `blocks=26 errs=1`. Con 2-3 personas enroladas: ASISTENCIA → ESCANEAR CARAS → elegir obra → poner una cara enrolada frente a la cámara → banner "✓ ENTRADA · Nombre · HH:MM"; segunda pasada de la misma cara (esperar 5s) → "✓ SALIDA". Probar una cara dudosa → aparecen candidatos → tocar el correcto marca. Cerrar y verificar en ASISTENCIA que quedaron las marcas.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(asistencia): modo kiosko de escaneo facial con marcado y confirmacion de candidatos"
```

---

## Task 8: Integración — permiso, lista y PDF con entrada/salida

**Files:**
- Modify: `index.html` (registro de permisos; render de ASISTENCIA; `descargarAsistenciaPDF`)

- [ ] **Step 1: (Opcional) permiso dedicado**

El escaneo ya se gatea con `personal.asistencia`. Si el usuario quiere separar "escanear caras" del "marcar manual", grep `pushPerm({ key:'planilla.descuentos'` y, junto a los permisos de personal, agregar:

```js
pushPerm({ key:'personal.escaneoFacial', label:'Escanear caras (kiosko)', group:'EDICIÓN PERSONAL' });
```
y cambiar el gate de `_abrirKioskoCaras` y del botón a `personal.escaneoFacial`. (Si no lo pide, omitir este step y dejar `personal.asistencia`.)

- [ ] **Step 2: Mostrar entrada/salida en la lista de ASISTENCIA**

Grep el render de la lista de asistencia (la fila por persona con la hora). Donde hoy muestra `hora`, normalizar con `migrateAsistenciaRegistro(reg)` y mostrar `ENT HH:MM · SAL HH:MM` (salida vacía → "—"). Ejemplo de celda:

```js
const rg = reg ? migrateAsistenciaRegistro(reg) : null;
const horasTxt = rg ? ('ENT '+(rg.entrada||'—')+(rg.salida?(' · SAL '+rg.salida):'')) : '';
```

- [ ] **Step 3: Columnas entrada/salida en el PDF**

En `descargarAsistenciaPDF` (L≈16223), normalizar cada registro con `migrateAsistenciaRegistro` y cambiar las columnas a `[#, NOMBRE, CARGO, ENTRADA, SALIDA, OBRA]` (en vez de la columna HORA única). Mantener `styles:{halign:'center',valign:'middle'}` y el filtro por obra.

- [ ] **Step 4: Verificación manual**

`node _recetatest/valjs.js` → `blocks=26 errs=1`; `node _recetatest/run.js` → `FAIL=0`. En la app: marcar entrada y salida de una persona (manual o por cara) y verificar que la lista muestra ENT/SAL y el PDF tiene columnas ENTRADA y SALIDA con las horas. Verificar que registros viejos (solo `hora`) aparecen como ENTRADA = esa hora, SALIDA = —.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(asistencia): entrada/salida en lista y PDF + permiso de escaneo (opcional)"
```

---

## Task 9: Verificación final y deploy

**Files:**
- Modify: `sw.js` (CACHE_VERSION), `index.html` (chip de versión)

- [ ] **Step 1: Verificación completa**

Run: `node _recetatest/valjs.js` → `blocks=26 errs=1`
Run: `node _recetatest/run.js` → `PASS=NN FAIL=0` (NN = 73 + tests nuevos de Tasks 1-3)

- [ ] **Step 2: Bump de versión**

Subir `CACHE_VERSION` en `sw.js` (L10) a `vNNN-asistencia-facial` y el chip `font-size:9px">vNNN<` del footer en `index.html`.

- [ ] **Step 3: Commit y (cuando el usuario lo indique) push**

```bash
git add index.html sw.js
git commit -m "release vNNN: asistencia por reconocimiento facial (kiosko) — Fase 1"
# push solo cuando el usuario lo apruebe:
git push origin main
```

- [ ] **Step 4: Prueba de aceptación en obra (humo)**

Enrolar 2-3 caras reales, escanear, confirmar entrada/salida con hora, fallback de candidatos, y verificar que tras un primer arranque con internet funciona offline (modelos cacheados por el SW).

---

## Notas de afinamiento (Fase 2, fuera de este plan)

- Ajustar umbrales (0.48 / 0.58) con datos reales; permitir más de 3 tomas por persona.
- Reporte de horas trabajadas (entrada→salida) y exportación.
- Liveness técnico (parpadeo/giro) si se necesita más anti-suplantación.
- Pre-cachear explícitamente los pesos de modelos en `sw.js` si se requiere offline desde el primer arranque sin haber abierto el kiosko antes.
