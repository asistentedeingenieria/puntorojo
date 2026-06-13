# Multi-Sesión de Asistencia (marcar en varias obras el mismo día) — Plan

> Ejecutar INLINE en esta sesión con TDD. Cada función pura: test RED → impl GREEN → copiar idéntica a index.html. Sync: revisión adversarial antes de desplegar.

**Goal:** Personas con la marca nueva `multiSesion` pueden registrar entrada/salida en varias obras el mismo día (sesiones), sin tocar el comportamiento de nadie más.

**Architecture:** Registro del día por persona pasa a llevar `sessions:[{obraId,obraDesc,entrada,salida,_ts}]` SOLO si `multiSesion`. Se mantiene un "resumen espejo" en el top-level (`presente/entrada/salida/obraId`) para que TODAS las lecturas actuales (KPIs, listado, PDF, faltan-salida) sigan funcionando sin cambios. El sync UNE sesiones (no last-write-wins) para no perderlas entre kioskos. El escaneo: sin sesión abierta → pregunta obra → entrada; con sesión abierta → salida automática.

**INVARIANTE (no negociable):** si `p.multiSesion` es falso, NADA cambia. Todo el código nuevo se activa solo con `multiSesion`. Verificar: receta 115/0, asist 17/17, faltantes 13/13 siguen verdes.

**Tech:** index.html (único archivo), tests en `_asisttest/multisesion.js`. jsPDF/autoTable ya cargados.

---

### Task 1: Funciones puras de sesiones (TDD en `_asisttest/multisesion.js`)

**Funciones:** `_asistResumenSesiones(sessions)`, `_asistSesionAbierta(rec)`, `computeAsistenciaMarkMulti(rec, hhmm, obraId, obraDesc, nowTs)`, `_mergeSesiones(a,b)`.

- [ ] **Step 1: RED** — escribir `_asisttest/multisesion.js` con aserciones (funciones aún sin definir):
  - `_asistResumenSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:1},{obraId:'O2',entrada:'10:00',salida:null,_ts:2}])` → `{presente:true, entrada:'07:00', salida:'' (hay sesión abierta), obraId:'O2'}`.
  - `_asistResumenSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:1}])` → `salida:'09:00'`, `obraId:'O1'`.
  - `_asistSesionAbierta({sessions:[{entrada:'07:00',salida:null}]})` === true; con salida → false; sin sessions → false.
  - `computeAsistenciaMarkMulti(undefined,'07:00','O1','',100)` → accion 'entrada', reg.sessions.length 1, sesión {O1,07:00,null}.
  - `computeAsistenciaMarkMulti(<rec con sesión O1 abierta>,'09:00','IGNORADA','',200)` → accion 'salida', cierra O1 (salida 09:00), obraId 'O1'.
  - `computeAsistenciaMarkMulti(<rec con O1 cerrada>,'10:00','O2','',300)` → accion 'entrada', nueva sesión O2, sessions.length 2.
  - `_mergeSesiones([{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:5}],[{obraId:'O2',entrada:'10:00',salida:null,_ts:6}])` → 2 sesiones (une obras de celulares distintos).
  - `_mergeSesiones([{obraId:'O1',entrada:'07:00',salida:null,_ts:5}],[{obraId:'O1',entrada:'07:00',salida:'09:00',_ts:9}])` → 1 sesión, la CERRADA gana (más _ts) → salida '09:00'.
- [ ] **Step 2:** `node _asisttest/multisesion.js` → RED (ReferenceError).
- [ ] **Step 3: GREEN** — definir las funciones (código en sección IMPLEMENTACIONES abajo). `node _asisttest/multisesion.js` → PASS.
- [ ] **Step 4:** copiar las 4 funciones IDÉNTICAS a index.html (junto a `computeAsistenciaMark`). Verificar idénticas con script de comparación.

### Task 2: Extender el merge del sync para UNIR sesiones

**Modify:** `_mergeAsistencia` (index.html) + test en `_asisttest/multisesion.js`.

- [ ] **Step 1: RED** — aserción: merge de dos registros del MISMO (fecha,pid) donde uno trae sesión O1 y el otro O2 → el resultado es un session-record con AMBAS sesiones. Y: si un lado es session-record y el otro plano, no se pierde nada.
- [ ] **Step 2:** correr → falla (merge actual hace last-write-wins por _ts, pierde una).
- [ ] **Step 3: GREEN** — en `_mergeAsistencia`, dentro del bucle por (f,pid): si `lr` o `rr` tienen `.sessions` o `.multiSesion`, fusionar vía `_recToSessions`+`_mergeSesiones`+`_asistResumenSesiones` en vez del compare por _ts. (Código abajo.) Mantener el resto idéntico.
- [ ] **Step 4:** correr multisesion.js (incluye este caso) + `_asisttest/run.js` (17/17 — el merge normal NO cambia) → ambos PASS.

### Task 3: Flag `multiSesion` en el colaborador (UI)

**Modify:** el `<select>` de obra del colaborador (`_obraCell` en renderPersonal) + `_asignarObraColaborador`.

- [ ] Agregar opción `<option value="__MULTISESION__">VARIAS OBRAS (MARCA POR OBRA)</option>` al select de obra del colaborador.
- [ ] En `_asignarObraColaborador`: si `obraId==='__MULTISESION__'` → `p.multiSesion=true; p.multiObra=false; p.obraAsignada=''`. Para cualquier otro valor → `p.multiSesion=false` (limpiar) + lógica actual.
- [ ] El select muestra seleccionado `__MULTISESION__` si `p.multiSesion`.
- [ ] Verificar valjs 42/1.

### Task 4: Escaneo — ramificar en `multiSesion`

**Modify:** `_kioskMarcar`, `_marcarAsistenciaFacial`.

- [ ] En `_kioskMarcar(personaId)`, ANTES del branching actual: si `_pAsig && _pAsig.multiSesion`:
  - obtener `rec = _getAsistencia()[todayKey()]?.[personaId]`.
  - si `_asistSesionAbierta(rec)` → `_kioskMarcarConObra(personaId, '', '')` (salida automática; computeMulti ignora la obra al cerrar).
  - else → `_kioskPedirObra(personaId)` (SIEMPRE pregunta la obra al entrar, aun si lo escanea un encargado).
  - return (no caer en el branching normal).
- [ ] En `_marcarAsistenciaFacial(personaId,obraId,obraDesc,geo)`: si la persona tiene `multiSesion` → usar `computeAsistenciaMarkMulti(prev, hhmm, obraId, obraDesc, Date.now())`; geo va en `geoEntrada`/`geoSalida` del registro resumen. Si NO → ruta actual EXACTA.
- [ ] Verificar valjs 42/1.

### Task 5: Aislar lecturas/edición que asumen registro simple

**Modify:** `toggleAsistenciaGlobal` (admin), `_faltanIngreso`.

- [ ] `toggleAsistenciaGlobal`: si la persona es `multiSesion` → `showToast('ESTA PERSONA MARCA POR ESCANEO EN VARIAS OBRAS','red'); return;` (no pisar sus sesiones con un registro simple).
- [ ] `_faltanIngreso`: agregar `if(p.multiSesion) return;` (flotan entre obras, no cuentan como asignados fijos). Actualizar la copia en `_asisttest/faltantes.js` + un test que lo confirme. faltantes debe seguir PASS.
- [ ] El listado de asistencia (asistGrid): para `a.multiSesion`, mostrar las sesiones (cada obra: ENT hh:mm · SAL hh:mm) en `horasTxt`. El resto igual.

### Task 6: Verificar + revisión adversarial + desplegar

- [ ] `node /tmp/valjs.js` → blocks=42 errs=1.
- [ ] `node _recetatest/run.js` → 115/0. `node _asisttest/run.js` → 17/17. `node _asisttest/faltantes.js` → PASS. `node _asisttest/multisesion.js` → PASS.
- [ ] Confirmar funciones puras en index.html IDÉNTICAS a las de los tests (script de comparación).
- [ ] Workflow de revisión adversarial enfocado en: (a) aislamiento (no-multiSesion idéntico), (b) unión de sesiones sin pérdida entre celulares, (c) el resumen espejo no rompe KPIs/faltan-salida/PDF, (d) convergencia del resync.
- [ ] Corregir hallazgos reales. Bump sw.js + chip a v653. Commit + push.

---

## IMPLEMENTACIONES (código de las funciones puras)

```js
function _asistResumenSesiones(sessions){
  var ss=(sessions||[]).slice().sort(function(x,y){return String(x.entrada||'').localeCompare(String(y.entrada||''));});
  var open=null,last=null,first=null,maxTs=0;
  ss.forEach(function(s){ if(!s) return; if(!first) first=s; last=s; if(s.entrada && !s.salida) open=s; var t=(typeof s._ts==='number')?s._ts:0; if(t>maxTs) maxTs=t; });
  var cur=open||last;
  return { presente: ss.length>0, entrada: first?(first.entrada||''):'', salida: open?'':(last?(last.salida||''):''), obraId: cur?(cur.obraId||''):'', obraDesc: cur?(cur.obraDesc||''):'', _ts: maxTs };
}
function _asistSesionAbierta(rec){
  var s=(rec && Array.isArray(rec.sessions))?rec.sessions:[];
  for(var i=s.length-1;i>=0;i--){ if(s[i] && s[i].entrada && !s[i].salida) return true; }
  return false;
}
function computeAsistenciaMarkMulti(rec, hhmm, obraId, obraDesc, nowTs){
  var sessions=(rec && Array.isArray(rec.sessions))?rec.sessions.slice():[];
  var openIdx=-1;
  for(var i=sessions.length-1;i>=0;i--){ if(sessions[i] && sessions[i].entrada && !sessions[i].salida){ openIdx=i; break; } }
  var accion, obra;
  if(openIdx>=0){ sessions[openIdx]=Object.assign({},sessions[openIdx],{salida:hhmm,_ts:nowTs}); accion='salida'; obra=sessions[openIdx].obraId||''; }
  else { sessions.push({obraId:obraId||'',obraDesc:obraDesc||'',entrada:hhmm,salida:null,_ts:nowTs}); accion='entrada'; obra=obraId||''; }
  var resumen=_asistResumenSesiones(sessions);
  var reg=Object.assign({},resumen,{multiSesion:true,sessions:sessions,via:'cara'});
  return { reg:reg, accion:accion, obraId:obra };
}
function _mergeSesiones(a,b){
  var byKey={};
  var add=function(s){ if(!s||!s.entrada) return; var k=String(s.obraId||'')+'|'+String(s.entrada||''); var prev=byKey[k]; var st=(typeof s._ts==='number')?s._ts:0; if(!prev){ byKey[k]=s; return; } var pt=(typeof prev._ts==='number')?prev._ts:0; if(st>pt || (st===pt && s.salida && !prev.salida)) byKey[k]=s; };
  (a||[]).forEach(add); (b||[]).forEach(add);
  return Object.keys(byKey).map(function(k){return byKey[k];}).sort(function(x,y){ return String(x.entrada||'').localeCompare(String(y.entrada||'')); });
}
```

## MERGE (extensión en `_mergeAsistencia`, dentro del bucle por pid)

```js
// helper local
function _recToSessions(r){
  if(!r) return [];
  if(Array.isArray(r.sessions)) return r.sessions.slice();
  return [{ obraId:r.obraId||'', obraDesc:r.obraDesc||'', entrada:(r.entrada||r.hora||null), salida:(r.salida||null), _ts:((typeof r._ts==='number')?r._ts:((typeof r.ausenteTs==='number')?r.ausenteTs:0)) }];
}
// dentro del forEach(pid), antes del compare por _ts:
var lSesh = lr && (Array.isArray(lr.sessions)||lr.multiSesion);
var rSesh = rr && (Array.isArray(rr.sessions)||rr.multiSesion);
if (lSesh || rSesh) {
  var sesh = _mergeSesiones(_recToSessions(lr), _recToSessions(rr));
  var resumen = _asistResumenSesiones(sesh);
  out[f][pid] = Object.assign({}, resumen, { multiSesion:true, sessions:sesh, via:((lr&&lr.via)||(rr&&rr.via)||'cara') });
  changed = true;
  return; // saltar el compare por _ts normal
}
// ... (resto del compare por _ts EXACTO como ahora, para registros simples)
```

## Self-review
- Cobertura: flag (T3), guardar sesiones (T1), flujo escaneo (T4), unión sync (T2), aislamiento (T5), reportes-visibilidad (T5 listado), verificación (T6). PDF detallado por-obra = mejora futura (el resumen espejo hace que el PDF actual funcione: muestra entrada=primera, salida=última, obra=actual).
- Consistencia de tipos: `sessions` siempre `[{obraId,obraDesc,entrada,salida,_ts}]`; resumen siempre `{presente,entrada,salida,obraId,obraDesc,_ts}`; flag `multiSesion`.
- Ambigüedad: salida automática ignora la obra elegida (cierra la sesión abierta). Entrada siempre pregunta obra.
