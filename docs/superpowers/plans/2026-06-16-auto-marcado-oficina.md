# Auto‑marcado de asistencia (personal de oficina) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un colaborador tipo OFICINA, con su propio login, marque SU PROPIA asistencia (entrada/salida) en varias obras el mismo día mediante Face ID 1‑a‑1, sin ver ni marcar a nadie más.

**Architecture:** Reusa el login usuario+clave (email sintético), el motor facial face‑api del kiosko, multi‑sesión y `_marcarAsistenciaFacial`. Lo nuevo: un permiso `self.asistencia`, un vínculo `user.colaboradorId`, una pantalla full‑screen "MI ASISTENCIA" a la que se desvía en el arranque post‑login, y un escaneo facial que compara SOLO contra la propia cara. Todo vive en `index.html` (app de un solo archivo).

**Tech Stack:** HTML/JS vanilla en `index.html`; face‑api.js; Firebase Auth/Firestore; tests Node `.cjs` que extraen funciones puras por regex.

---

## Convenciones del repo (leer antes de empezar)
- App = un solo archivo `index.html` (~43k líneas) + `sw.js`.
- **Tests puros:** archivos `.cjs` que hacen `html.match(new RegExp('function NAME\\([\\s\\S]*?\\n\\}'))` + `new Function(src+'\nreturn NAME;')()`. Por eso cada función pura debe **cerrar con `\n}` en columna 0** y no tener otra `}` en columna 0 antes del cierre.
- **Validar parseo:** `node _recetatest/valjs.js` → esperado `blocks=26 errs=1` (el err#13 es JSON‑LD benigno).
- **Deploy:** subir chip de versión `<span style="opacity:.5;font-size:9px">vNNN</span>` (~línea 2908) + `CACHE_VERSION` en `sw.js`, `git add` archivos puntuales, commit con footer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`, `git push origin main` → Cloudflare deploya ~30s.
- **Firestore NO acepta arrays anidados** (number[][]). `face.descriptors` ya se guarda como `[{d:[...]}]`. No introducir arrays 2D nuevos.

---

### Task 1: Lógica pura (TDD) — rol, match 1‑a‑1, permiso de auto‑enrolar

**Files:**
- Modify: `index.html` (agregar 4 funciones puras justo antes de `function _abrirKioskoCaras` ~línea 18141)
- Test: `_selfasisttest/selfasist.cjs` (crear)

- [ ] **Step 1: Escribir el test que falla**

Crear `_selfasisttest/selfasist.cjs`:
```javascript
/* TDD: auto-marcado de oficina. Funciones puras:
   _esUsuarioAutoMarcado(user) -> bool (tiene self.asistencia y NO es admin)
   _euclidDesc(a,b) -> distancia euclidiana entre dos descriptores
   _faceMatch1a1(detected, descriptors, umbral) -> {match, dist} (1-a-1 contra UNA persona)
   _puedeAutoEnrolarCara(user, personaId) -> bool */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const R=new Function(ext('_esUsuarioAutoMarcado')+'\nreturn _esUsuarioAutoMarcado;')();
const E=new Function(ext('_euclidDesc')+'\nreturn _euclidDesc;')();
const M=new Function(ext('_euclidDesc')+'\n'+ext('_faceMatch1a1')+'\nreturn _faceMatch1a1;')();
const P=new Function(ext('_puedeAutoEnrolarCara')+'\nreturn _puedeAutoEnrolarCara;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// _esUsuarioAutoMarcado
ok('self.asistencia solo => true', R({perms:['self.asistencia']})===true);
ok('admin (*) aunque tenga self => false', R({perms:['*','self.asistencia']})===false);
ok('users.manage + self => false', R({perms:['users.manage','self.asistencia']})===false);
ok('sin self => false', R({perms:['personal.asistencia']})===false);
ok('sin perms => false', R({})===false);
ok('null => false', R(null)===false);

// _euclidDesc
ok('euclid iguales => 0', E([1,2,3],[1,2,3])===0);
ok('euclid 3-4-5', E([0,0],[3,4])===5);

// _faceMatch1a1
ok('match exacto => true', M([1,2,3],[{d:[1,2,3]}],0.5).match===true);
ok('match lejano => false', M([0,0,0],[{d:[10,10,10]}],0.5).match===false);
ok('toma array plano tambien', M([1,2,3],[[1,2,3]],0.5).match===true);
ok('elige la toma mas cercana', M([1,1,1],[{d:[9,9,9]},{d:[1,1,1]}],0.5).match===true);
ok('sin descriptores => no match', M([1,2,3],[],0.5).match===false);
ok('devuelve dist', M([0,0],[{d:[3,4]}],0.5).dist===5);

// _puedeAutoEnrolarCara
ok('admin enrola cualquiera', P({perms:['users.manage']},'pg-1')===true);
ok('personal.edit enrola cualquiera', P({perms:['personal.edit']},'pg-1')===true);
ok('self enrola SU ficha', P({perms:['self.asistencia'],colaboradorId:'pg-1'},'pg-1')===true);
ok('self NO enrola otra ficha', P({perms:['self.asistencia'],colaboradorId:'pg-1'},'pg-2')===false);
ok('sin perms => false', P({perms:[]},'pg-1')===false);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `node _selfasisttest/selfasist.cjs`
Expected: `NO _esUsuarioAutoMarcado FOUND` (las funciones no existen aún).

- [ ] **Step 3: Implementar las 4 funciones puras**

En `index.html`, inmediatamente ANTES de `async function _abrirKioskoCaras(){` (~línea 18141), insertar:
```javascript
// v705 — Auto-marcado de oficina: ¿este usuario es de "solo marcar mi asistencia"?
function _esUsuarioAutoMarcado(user){
  if(!user || !Array.isArray(user.perms)) return false;
  var p=user.perms;
  if(p.indexOf('*')>=0 || p.indexOf('users.manage')>=0) return false;
  return p.indexOf('self.asistencia')>=0;
}
// Distancia euclidiana entre dos descriptores faciales (arrays de números).
function _euclidDesc(a,b){
  var s=0, n=Math.min(a.length,b.length);
  for(var i=0;i<n;i++){ var d=a[i]-b[i]; s+=d*d; }
  return Math.sqrt(s);
}
// Match 1-a-1: compara una cara detectada SOLO contra los descriptores de UNA persona.
// descriptors = [{d:[...]}] o [[...]]. Devuelve {match, dist} con la toma más cercana.
function _faceMatch1a1(detected, descriptors, umbral){
  var th=(typeof umbral==='number')?umbral:0.50;
  if(!detected || !detected.length || !descriptors || !descriptors.length) return { match:false, dist:Infinity };
  var min=Infinity;
  descriptors.forEach(function(raw){
    var d=Array.isArray(raw)?raw:((raw&&raw.d)||[]);
    if(!d.length) return;
    var dist=_euclidDesc(detected, d);
    if(dist<min) min=dist;
  });
  return { match: min<=th, dist:min };
}
// ¿Puede enrolar la cara de personaId? Admin/editor cualquiera; auto-marcado SOLO la suya.
function _puedeAutoEnrolarCara(user, personaId){
  if(!user) return false;
  var p=Array.isArray(user.perms)?user.perms:[];
  if(p.indexOf('*')>=0 || p.indexOf('users.manage')>=0 || p.indexOf('personal.edit')>=0) return true;
  return p.indexOf('self.asistencia')>=0 && user.colaboradorId===personaId;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `node _selfasisttest/selfasist.cjs`
Expected: `PASS=20 FAIL=0`

- [ ] **Step 5: Validar parseo del HTML**

Run: `node _recetatest/valjs.js`
Expected: `blocks=26 errs=1`

- [ ] **Step 6: Commit**

```bash
git add index.html _selfasisttest/selfasist.cjs
git commit -m "auto-marcado Task 1: lógica pura (rol, match 1-a-1, permiso enrolar) + TDD

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Permiso `self.asistencia`, `currentUser.colaboradorId` y gates

**Files:**
- Modify: `index.html` — lista de permisos (~línea 4449), carga de currentUser (~línea 33709), gate de `_marcarAsistenciaFacial` (~17821), gates de `_abrirEnrolarCara` (~18689) y `_guardarCara` (~18740)

- [ ] **Step 1: Agregar el permiso a la lista**

Buscar el bloque de permisos (la línea `{ key: 'personal.verUbicacion', ... }`, ~4449) y agregar DEBAJO:
```javascript
{ key: 'self.asistencia', label: 'Auto-marcar SU PROPIA asistencia (oficina)', group: 'EDICIÓN PERSONAL' },
```

- [ ] **Step 2: Cargar `colaboradorId` en currentUser**

En `applyAuthSession`, en el objeto `currentUser = { ... }` (~línea 33709), agregar después de `obraAsignada: profileData.obraAsignada || '',`:
```javascript
    colaboradorId: profileData.colaboradorId || '',
```

- [ ] **Step 3: Extender el gate de `_marcarAsistenciaFacial`**

Línea ~17821, reemplazar:
```javascript
  if (!(can('personal.asistencia') || can('users.manage'))){ showToast('SIN PERMISO','red'); return null; }
```
por:
```javascript
  if (!(can('personal.asistencia') || can('users.manage') ||
        (can('self.asistencia') && (getCurrentUser()||{}).colaboradorId===personaId))){ showToast('SIN PERMISO','red'); return null; }
```

- [ ] **Step 4: Extender el gate de enrolar (auto-enrolar la propia cara)**

En `_abrirEnrolarCara(personaId)` (~18689), reemplazar:
```javascript
  if (!(can('personal.edit') || can('users.manage'))){ showToast('SIN PERMISO','red'); return; }
```
por:
```javascript
  if (!_puedeAutoEnrolarCara(getCurrentUser(), personaId)){ showToast('SIN PERMISO','red'); return; }
```
En `_guardarCara(personaId)` (~18740), reemplazar la MISMA línea (`if (!(can('personal.edit') || can('users.manage'))){ showToast('SIN PERMISO','red'); return; }`) por la misma versión con `_puedeAutoEnrolarCara`.

- [ ] **Step 5: Validar parseo**

Run: `node _recetatest/valjs.js`
Expected: `blocks=26 errs=1`

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "auto-marcado Task 2: permiso self.asistencia + colaboradorId + gates marcar/enrolar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Crear acceso de auto‑marcado desde la ficha OFICINA

**Files:**
- Modify: `index.html` — botón en la ficha del colaborador (modal editar ~18566) + nueva función `_crearAccesoAutoMarcado`

**Contexto:** la creación de usuario usuario+clave vive en `saveUser()` (~6385): email sintético con `_userToEmail()` (~5891), PIN de 6+ dígitos, creación con una **secondary app** de Firebase (`firebase.initializeApp(cfg,'secondary')` → `createUserWithEmailAndPassword` → `saveUserDoc(uid, profile)` → `signOut`). Replicamos ese patrón en una función dedicada.

- [ ] **Step 1: Agregar `_crearAccesoAutoMarcado(personaId)`**

Insertar (cerca de `_abrirEnrolarCara`, ~18688) una función nueva. **Antes de escribirla, leer el bloque 6487‑6510 de `saveUser()`** para copiar EXACTAMENTE cómo se obtiene la secondary app y la config de Firebase en este archivo (el nombre de la variable de config y de la secondary app). Implementar:
```javascript
// v705 — crea (o resetea) un login usuario+clave vinculado a un colaborador, con perms=['self.asistencia'].
async function _crearAccesoAutoMarcado(personaId){
  if (!can('users.manage')){ showToast('SOLO EL ADMIN PUEDE CREAR ACCESOS','red'); return; }
  const p=(_getPersonal()||[]).find(x=>x.id===personaId); if(!p){ return; }
  const form='<div style="text-align:left">'
    +'<div style="font-size:12px;color:#475569;margin-bottom:10px">Acceso de auto-marcado para <b>'+esc(p.nombre||'')+'</b>. La persona entrará con este usuario y clave y solo verá "MI ASISTENCIA".</div>'
    +'<label style="display:block;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748B;font-weight:700;margin-bottom:4px">USUARIO</label>'
    +'<input id="_amUser" oninput="(window._amForm=window._amForm||{}).user=this.value" placeholder="ej: jperez" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #CBD5E1;border-radius:6px;margin-bottom:10px">'
    +'<label style="display:block;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748B;font-weight:700;margin-bottom:4px">CLAVE (6+ dígitos)</label>'
    +'<input id="_amPin" inputmode="numeric" oninput="(window._amForm=window._amForm||{}).pin=this.value" placeholder="ej: 123456" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #CBD5E1;border-radius:6px">'
    +'</div>';
  window._amForm={user:'',pin:''};
  const ok=await window.prConfirm({ title:'CREAR ACCESO DE AUTO-MARCADO', bodyHTML:form, okText:'CREAR', cancelText:'CANCELAR' });
  if(!ok) return;
  const f=window._amForm||{};
  const userRaw=String(f.user||'').trim();
  const pin=String(f.pin||'').trim();
  const email=_userToEmail(userRaw);
  if(!email){ showToast('USUARIO INVÁLIDO','red'); return; }
  if(!/^[0-9]{6,}$/.test(pin)){ showToast('LA CLAVE DEBE SER SOLO NÚMEROS · 6+ DÍGITOS','red'); return; }
  try{
    // === copiar el patrón EXACTO de saveUser() líneas 6487-6510 para la secondary app/config ===
    const secondaryApp = firebase.apps.find(a=>a.name==='secondary') || firebase.initializeApp(firebase.app().options,'secondary');
    const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, pin);
    const uid = cred.user.uid;
    await saveUserDoc(uid, {
      email: email,
      username: userRaw.toLowerCase().replace(/[^a-z0-9]/g,''),
      displayName: (p.nombre||'').toUpperCase(),
      cargo: p.cargo||'',
      perms: ['self.asistencia'],
      colaboradorId: personaId,
      isFounder: false,
      createdAt: Date.now(),
      createdBy: currentUser ? (currentUser.email||currentUser.uid) : null,
      mustChangePassword: false
    });
    await secondaryApp.auth().signOut();
    // marcar la ficha como multi-sesión (varias obras/día)
    p.multiSesion=true; p.multiObra=false;
    try{ saveState(); }catch(e){}
    try{ if(CloudSync && CloudSync.forceUploadNow) CloudSync.forceUploadNow().catch(()=>{}); }catch(e){}
    try{ await refreshUsersCache(); }catch(e){}
    showToast('ACCESO CREADO · USUARIO: '+userRaw.toLowerCase(),'green');
  }catch(err){
    const msg=(err&&err.code==='auth/email-already-in-use')?'ESE USUARIO YA EXISTE':(err&&err.message?err.message:String(err));
    showToast('ERROR: '+msg,'red');
  }
}
```
> NOTA para el implementador: la línea `const secondaryApp = ...` es una aproximación; **usar el método EXACTO que ya emplea `saveUser()`** en 6487‑6510 (ahí está la forma comprobada de obtener la secondary app y su config en este proyecto). Si `saveUser` define un helper para la secondary app, reusarlo.

- [ ] **Step 2: Agregar el botón en la ficha (solo tipo OFICINA, solo admin)**

En el modal de editar colaborador, después del bloque de campos (cerca de ~18577, donde está el `<select id="_pgTipo">`), agregar — dentro del HTML del modal — una fila de botón visible solo si es OFICINA y el usuario es admin. Como el modal se arma por template, agregar al final del cuerpo del modal:
```javascript
+ ((e.id && (e.tipo==='OFICINA') && can('users.manage')) ? '<button type="button" onclick="_crearAccesoAutoMarcado(\''+e.id+'\')" style="margin-top:12px;width:100%;padding:10px;background:var(--cafe);color:#fff;border:none;border-radius:6px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer">CREAR ACCESO DE AUTO-MARCADO</button>' : '')
```
> El implementador debe localizar la variable del registro en edición (en ese modal se llama `e`) y el cierre del cuerpo del modal, e insertar el botón ahí. Verificar el nombre real de la variable leyendo el template del modal antes de editar.

- [ ] **Step 3: Validar parseo**

Run: `node _recetatest/valjs.js`
Expected: `blocks=26 errs=1`

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "auto-marcado Task 3: crear acceso usuario+clave desde ficha OFICINA

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Pantalla "MI ASISTENCIA" + desvío post‑login

**Files:**
- Modify: `index.html` — nueva función `_renderMiAsistencia` (cerca de `_abrirKioskoCaras` ~18141) + hook en `applyAuthSession` (~antes de `renderAll();`)

- [ ] **Step 1: Implementar `_renderMiAsistencia()`**

Insertar:
```javascript
// v705 — pantalla full-screen para personal de oficina: solo SU asistencia.
function _renderMiAsistencia(){
  const u=getCurrentUser(); if(!u) return;
  const pid=u.colaboradorId||'';
  const p=(_getPersonal()||[]).find(x=>x.id===pid)||null;
  const old=document.getElementById('_miAsisScreen'); if(old) old.remove();
  const nombre=(p&&p.nombre)||u.displayName||'';
  const tieneCara=!!(p && p.face && p.face.descriptors && p.face.descriptors.length);
  const fecha=todayKey();
  const rec=((_getAsistencia()[fecha]||{})[pid])||null;
  const sesiones=(rec&&Array.isArray(rec.sessions))?rec.sessions:[];
  const obras=(state.projects||[]).filter(x=>x && !x.archivado);
  const obraOpts=obras.map(o=>'<option value="'+o.id+'">'+esc(String(o.name||'').toUpperCase())+'</option>').join('');
  const nombreObraDe=(s)=>{ const o=obras.find(x=>x.id===s.obraId); return (o&&o.name)||s.obraDesc||'—'; };
  const sesHtml = sesiones.length
    ? sesiones.map(s=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 12px;background:#16161A;border-radius:8px;margin-bottom:6px;font-size:13px"><span style="font-weight:700">'+esc(nombreObraDe(s)).toUpperCase()+'</span><span style="color:#9CA3AF">'+(s.entrada||'—')+' → '+(s.salida||'…')+'</span></div>').join('')
    : '<div style="color:#9CA3AF;font-size:13px;padding:6px 0">Hoy no has marcado todavía.</div>';
  const accionHtml = tieneCara
    ? '<div style="margin-top:14px"><label style="display:block;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9CA3AF;font-weight:700;margin-bottom:6px">OBRA</label>'
      +'<select id="_miAsisObra" style="width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #2A2A30;background:#16161A;color:#fff;font-size:14px;margin-bottom:12px">'+obraOpts+'</select>'
      +'<button onclick="_miAsisEscanear()" style="width:100%;padding:16px;background:#C8141C;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:800;letter-spacing:1px;cursor:pointer">MARCAR CON MI CARA</button></div>'
    : '<div style="margin-top:14px;padding:14px;background:#16161A;border-radius:10px"><div style="font-size:13px;color:#E5E7EB;margin-bottom:10px">Para poder marcar, primero registrá tu cara.</div>'
      +'<button onclick="_abrirEnrolarCara(\''+pid+'\')" style="width:100%;padding:14px;background:#C8141C;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:800;letter-spacing:1px;cursor:pointer">REGISTRAR MI CARA</button></div>';
  const html='<div id="_miAsisScreen" style="position:fixed;inset:0;z-index:100060;background:#0B0B0C;color:#fff;display:flex;flex-direction:column;padding:22px 18px;overflow:auto">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">'
      +'<div><div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF">MI ASISTENCIA</div>'
      +'<div style="font-size:20px;font-weight:800">'+esc(nombre).toUpperCase()+'</div></div>'
      +'<button onclick="_miAsisLogout()" style="padding:8px 12px;background:transparent;color:#9CA3AF;border:1px solid #2A2A30;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer">SALIR</button>'
    +'</div>'
    +'<div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9CA3AF;font-weight:700;margin-bottom:8px">HOY</div>'
    +sesHtml
    +accionHtml
    +'</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function _miAsisLogout(){ try{ firebase.auth().signOut(); }catch(e){} try{ location.reload(); }catch(e){} }
function _miAsisRefrescar(){ if(document.getElementById('_miAsisScreen')) _renderMiAsistencia(); }
```
> El implementador debe confirmar el nombre real de la función de logout existente (buscar `signOut(` / botón "CERRAR SESIÓN"); si existe una helper de logout del proyecto, usarla en `_miAsisLogout`.

- [ ] **Step 2: Desviar a la pantalla en el arranque post‑login**

En `applyAuthSession`, inmediatamente ANTES de la llamada `renderAll();` (~línea 33730), insertar:
```javascript
  if (_esUsuarioAutoMarcado(currentUser)){ _renderMiAsistencia(); updateActivityBadge && 0; return; }
```
> El `return` evita que se renderice el dashboard normal. Verificar que después de `renderAll(); applyPermissions();` no haya inicialización imprescindible para este usuario (no la hay: no usa otras secciones).

- [ ] **Step 3: Verificación manual mínima (parse)**

Run: `node _recetatest/valjs.js`
Expected: `blocks=26 errs=1`

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "auto-marcado Task 4: pantalla MI ASISTENCIA + desvío post-login

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Escaneo facial 1‑a‑1 + GPS oculto + marcado

**Files:**
- Modify: `index.html` — nueva función `_miAsisEscanear` (cerca de `_renderMiAsistencia`)

**Contexto reusado:** `loadFaceModels()` (~18007), `getUserMedia`, `_detectOneDescriptor(input, inputSize)` (~18035) que devuelve `{detection,landmarks,descriptor:Float32Array}`, `faceapi.euclideanDistance`, `_marcarAsistenciaFacial(personaId, obraId, obraDesc, geo)` (~17820). El match se hace con `_faceMatch1a1` (Task 1). GPS obligatorio vía `navigator.geolocation.getCurrentPosition`. **La pantalla NO muestra geo ni EN OBRA/FUERA.**

- [ ] **Step 1: Implementar `_miAsisEscanear()`**

Insertar:
```javascript
// v705 — escaneo facial 1-a-1 para auto-marcado. Sin respaldo: si no reconoce, no marca.
let _miAsisStream=null, _miAsisLoop=0, _miAsisBusy=false, _miAsisStreak=0, _miAsisGeo=null;
async function _miAsisEscanear(){
  const u=getCurrentUser(); const pid=u&&u.colaboradorId;
  const p=(_getPersonal()||[]).find(x=>x.id===pid);
  if(!p || !(p.face && p.face.descriptors && p.face.descriptors.length)){ showToast('PRIMERO REGISTRÁ TU CARA','red'); return; }
  const sel=document.getElementById('_miAsisObra'); const obraId=sel?sel.value:'';
  if(!obraId){ showToast('ELEGÍ LA OBRA','red'); return; }
  // descriptores propios (Float32Array)
  const misDesc=p.face.descriptors.map(d=>(Array.isArray(d)?d:((d&&d.d)||[])));
  // overlay de cámara
  const old=document.getElementById('_miAsisCam'); if(old) old.remove();
  const cam='<div id="_miAsisCam" style="position:fixed;inset:0;z-index:100070;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center">'
    +'<video id="_miAsisVideo" autoplay playsinline muted style="max-width:100%;max-height:70vh"></video>'
    +'<div id="_miAsisMsg" style="color:#fff;font-size:15px;font-weight:700;margin-top:14px;text-align:center;padding:0 20px">Preparando cámara…</div>'
    +'<button onclick="_miAsisCerrarCam()" style="margin-top:16px;padding:10px 18px;background:transparent;color:#9CA3AF;border:1px solid #333;border-radius:8px;font-weight:700;letter-spacing:1px;cursor:pointer">CANCELAR</button>'
    +'</div>';
  document.body.insertAdjacentHTML('beforeend', cam);
  // GPS obligatorio (oculto): pedirlo en paralelo
  _miAsisGeo=null;
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos=>{ _miAsisGeo={lat:pos.coords.latitude,lng:pos.coords.longitude,acc:pos.coords.accuracy,ts:Date.now()}; },
      ()=>{ _miAsisGeo=null; }, { enableHighAccuracy:false, maximumAge:30000, timeout:25000 });
  }
  // cámara
  try{
    _miAsisStream=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:'user'}, width:{ideal:1280}, height:{ideal:720} }, audio:false });
    const v=document.getElementById('_miAsisVideo'); if(v){ v.srcObject=_miAsisStream; v.style.transform='scaleX(-1)'; }
  }catch(e){ _miAsisSetMsg('NO SE PUDO ABRIR LA CÁMARA · ACTIVÁ EL PERMISO'); return; }
  _miAsisSetMsg('Cargando reconocimiento…');
  try{ await loadFaceModels(); }catch(e){ _miAsisSetMsg('NO SE PUDO CARGAR EL RECONOCIMIENTO'); return; }
  _miAsisStreak=0; _miAsisLoop=1; _miAsisTick(pid, obraId, misDesc);
}
function _miAsisSetMsg(t){ const m=document.getElementById('_miAsisMsg'); if(m) m.textContent=t; }
function _miAsisCerrarCam(){
  _miAsisLoop=0;
  try{ if(_miAsisStream) _miAsisStream.getTracks().forEach(t=>t.stop()); }catch(e){}
  _miAsisStream=null;
  const el=document.getElementById('_miAsisCam'); if(el) el.remove();
}
async function _miAsisTick(pid, obraId, misDesc){
  if(!_miAsisLoop) return;
  if(_miAsisBusy){ setTimeout(()=>_miAsisTick(pid,obraId,misDesc), 350); return; }
  const v=document.getElementById('_miAsisVideo');
  if(!v || !v.videoWidth){ setTimeout(()=>_miAsisTick(pid,obraId,misDesc), 350); return; }
  _miAsisBusy=true;
  try{
    const det=await _detectOneDescriptor(v, 416);
    if(det && det.descriptor){
      const r=_faceMatch1a1(Array.from(det.descriptor), misDesc, 0.50);
      if(r.match){
        _miAsisStreak++;
        _miAsisSetMsg('Reconocido ✓');
        if(_miAsisStreak>=2){
          _miAsisLoop=0; _miAsisBusy=false;
          if(!_miAsisGeo){ _miAsisSetMsg('FALTA UBICACIÓN · ACTIVÁ EL GPS Y REINTENTÁ'); _miAsisStreak=0; _miAsisLoop=1; _miAsisTick(pid,obraId,misDesc); return; }
          const res=_marcarAsistenciaFacial(pid, obraId, '', _miAsisGeo);
          _miAsisCerrarCam();
          if(res && res.accion==='entrada') showToast('ENTRADA MARCADA · '+res.hora,'green');
          else if(res && res.accion==='salida') showToast('SALIDA MARCADA · '+res.hora,'green');
          else if(res && res.accion==='ignorado') showToast('YA MARCASTE HACE UN MOMENTO','');
          else showToast('NO SE PUDO MARCAR','red');
          _miAsisRefrescar();
          _miAsisBusy=false; return;
        }
      } else {
        _miAsisStreak=0; _miAsisSetMsg('No te reconozco · acercá la cara con buena luz');
      }
    } else {
      _miAsisSetMsg('Buscando tu cara…');
    }
  }catch(e){}
  _miAsisBusy=false;
  setTimeout(()=>_miAsisTick(pid,obraId,misDesc), 300);
}
```

- [ ] **Step 2: Validar parseo**

Run: `node _recetatest/valjs.js`
Expected: `blocks=26 errs=1`

- [ ] **Step 3: Correr todos los tests de regresión**

Run: `node _selfasisttest/selfasist.cjs && node _asisttest/*.cjs 2>/dev/null; node _facetest/*.cjs 2>/dev/null; echo done`
Expected: `PASS` en selfasist; las suites de asistencia/cara existentes sin fallos nuevos.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "auto-marcado Task 5: escaneo facial 1-a-1 + GPS oculto + marcado

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verificación manual + deploy (con OK del usuario)

**Files:**
- Modify: `index.html` (chip de versión ~2908) + `sw.js` (CACHE_VERSION)

- [ ] **Step 1: Bump de versión**

`index.html` ~2908: `v704` → `v705`. `sw.js`: `CACHE_VERSION = 'v705-auto-marcado-oficina';`

- [ ] **Step 2: Validar todo**

Run: `node _recetatest/valjs.js && node _selfasisttest/selfasist.cjs`
Expected: `blocks=26 errs=1` y `PASS=20 FAIL=0`.

- [ ] **Step 3: Verificación manual (superpowers:verification-before-completion)**

Checklist a confirmar EN VIVO antes de declarar listo:
1. Admin: en la ficha de un colaborador OFICINA aparece "CREAR ACCESO DE AUTO-MARCADO"; crear con usuario+PIN.
2. Cerrar sesión, entrar con ese usuario+PIN → aparece SOLO "MI ASISTENCIA" (sin dashboard ni otras pestañas).
3. "REGISTRAR MI CARA" funciona y guarda.
4. Elegir obra A → "MARCAR CON MI CARA" → reconoce → ENTRADA. Repetir → SALIDA.
5. Elegir obra B → marcar → ENTRADA (nueva sesión el mismo día).
6. Con la cara de OTRA persona, el escáner NO marca ("No te reconozco").
7. La pantalla NO muestra ubicación/EN OBRA.
8. Como admin: las marcas aparecen en la asistencia normal de cada obra con su ubicación.

- [ ] **Step 4: Commit + push (deploy) — SOLO con OK explícito del usuario**

```bash
git add index.html sw.js
git commit -m "v705: auto-marcado de asistencia para personal de oficina

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review (cobertura del spec)
- Login propio + landing restringido → Task 2 (perm+colaboradorId) + Task 4 (desvío `_esUsuarioAutoMarcado`→`_renderMiAsistencia`). ✓
- Crear acceso desde ficha OFICINA → Task 3. ✓
- Registrar su propia cara → Task 2 (gate `_puedeAutoEnrolarCara`) + Task 4 (botón REGISTRAR MI CARA reusa `_abrirEnrolarCara`). ✓
- Marcar varias obras/día → `p.multiSesion=true` en Task 3 + `_marcarAsistenciaFacial` (multiSesion) en Task 5. ✓
- Face ID 1‑a‑1, sin respaldo → Task 1 (`_faceMatch1a1`) + Task 5 (no hay botón "marcar igual"). ✓
- GPS obligatorio pero oculto → Task 5 (getCurrentPosition; bloquea si no hay geo; la pantalla no muestra ubicación). ✓
- Solo a sí misma → gates por `colaboradorId===personaId` (Task 2) + match solo contra su descriptor (Task 5). ✓
- Reportes admin sin cambios → reusa estructura `sessions[]`. ✓
