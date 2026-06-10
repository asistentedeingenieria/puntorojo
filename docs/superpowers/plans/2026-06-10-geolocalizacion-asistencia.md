# Geolocalización en asistencia facial — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Capturar GPS al marcar asistencia por cara (obligatorio) y mostrar EN OBRA / FUERA (geocerca) en el reporte.

**Architecture:** Lógica pura (haversine + geocerca) en el bloque RECETA-PURE, testeada con `node _recetatest/run.js`. Config de ubicación por obra en el modal de proyecto. Captura GPS via `navigator.geolocation.watchPosition` en el kiosko (bloquea si no hay permiso). Geocerca calculada al renderizar (lista + PDF). Datos en `project.geo` y `asistenciaGlobal[fecha][id].geoEntrada/geoSalida`.

**Tech Stack:** PWA single-file, `navigator.geolocation`, jsPDF (reporte). Tests Node sin framework.

---

## Convenciones
- Pruebas puras entre `// ===RECETA-PURE-START===` y `// ===RECETA-PURE-END===`; exponer en `_recetatest/run.js` (`api.X=typeof X!=="undefined"?X:undefined;`, archivo local). Tests en `_recetatest/tests.js` con `t.eq`/`t.ok`.
- Verificación: `node _recetatest/valjs.js` → `blocks=26 errs=1`; `node _recetatest/run.js` → `FAIL=0`.
- Deploy: bump `sw.js` CACHE_VERSION + chip footer; commit con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; push SOLO cuando el usuario lo apruebe.
- CRLF: re-Read antes de cada Edit.

---

## Task 1: Lógica pura (haversineMeters + evalGeocerca)

**Files:** `index.html` (RECETA-PURE), `_recetatest/run.js`, `_recetatest/tests.js`

- [ ] **Step 1: Tests que fallan** (append a `tests.js` antes del `};` final):
```js
  // --- haversineMeters / evalGeocerca ---
  const d0 = t.api.haversineMeters(14.6349,-90.5069,14.6349,-90.5069);
  eq('hav.zero', Math.round(d0), 0);
  const d1 = t.api.haversineMeters(14.6349,-90.5069,14.6358,-90.5069); // ~100m al norte
  eq('hav.~100', (d1 > 90 && d1 < 110), true);
  const g1 = t.api.evalGeocerca({lat:14.6349,lng:-90.5069},{lat:14.6349,lng:-90.5069,radio:150});
  eq('geo.dentro', g1.enObra, true);
  eq('geo.dist0', Math.round(g1.distancia), 0);
  const g2 = t.api.evalGeocerca({lat:14.6500,lng:-90.5069},{lat:14.6349,lng:-90.5069,radio:150});
  eq('geo.fuera', g2.enObra, false);
  eq('geo.fueraDist', g2.distancia > 150, true);
  eq('geo.nullMark', t.api.evalGeocerca(null,{lat:1,lng:1,radio:150}), null);
  eq('geo.nullObra', t.api.evalGeocerca({lat:1,lng:1},null), null);
```
- [ ] **Step 2: Exponer en run.js:** agregar
```
api.haversineMeters=typeof haversineMeters!=="undefined"?haversineMeters:undefined;api.evalGeocerca=typeof evalGeocerca!=="undefined"?evalGeocerca:undefined;
```
- [ ] **Step 3: Correr — FALLA** (`node _recetatest/run.js`).
- [ ] **Step 4: Implementar (antes de RECETA-PURE-END):**
```js
// Distancia en metros entre dos coordenadas (haversine). Puro.
function haversineMeters(lat1, lng1, lat2, lng2){
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
// Evalúa geocerca. markGeo={lat,lng}, obraGeo={lat,lng,radio}. Devuelve {enObra,distancia} o null. Puro.
function evalGeocerca(markGeo, obraGeo){
  if (!markGeo || !obraGeo || markGeo.lat==null || obraGeo.lat==null) return null;
  const dist = haversineMeters(markGeo.lat, markGeo.lng, obraGeo.lat, obraGeo.lng);
  const radio = Number(obraGeo.radio) || 150;
  return { enObra: dist <= radio, distancia: dist };
}
```
- [ ] **Step 5: Correr — PASA** (`FAIL=0`).
- [ ] **Step 6: Validar + commit:** `node _recetatest/valjs.js` → `blocks=26 errs=1`; commit `feat(asistencia): logica pura de geocerca (haversine + evalGeocerca)`.

---

## Task 2: Configurar ubicación de la obra (modal de proyecto)

**Files:** `index.html` (modal editProject ~L2915-2962, `openEditProjectModal` ~L16786, `saveProjectSpecs` ~L17076)

- [ ] **Step 1:** Grep `id="epLocation"` (o `saveProjectSpecs`) para ubicar el form del modal de proyecto. Agregar al final del form (antes de los botones) una sección:
```html
<div style="border-top:1px solid var(--line);margin-top:12px;padding-top:12px">
  <div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--mute);margin-bottom:8px">UBICACIÓN DE LA OBRA (GEOCERCA)</div>
  <div id="epGeoStatus" style="font-size:12px;color:var(--mute);margin-bottom:8px">Sin configurar</div>
  <input type="hidden" id="epGeoLat"><input type="hidden" id="epGeoLng">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <button type="button" class="btn ghost sm" onclick="_epUsarMiUbicacion()">USAR MI UBICACIÓN ACTUAL</button>
    <label style="font-size:11px;color:var(--mute)">Radio (m): <input id="epGeoRadio" type="number" class="inline" style="width:90px" value="150" min="10"></label>
  </div>
</div>
```
- [ ] **Step 2:** Agregar la función global:
```js
function _epUsarMiUbicacion(){
  if (!navigator.geolocation){ showToast('ESTE DISPOSITIVO NO TIENE GPS','red'); return; }
  showToast('OBTENIENDO UBICACIÓN…','');
  navigator.geolocation.getCurrentPosition(function(pos){
    const la=pos.coords.latitude, ln=pos.coords.longitude;
    document.getElementById('epGeoLat').value=la; document.getElementById('epGeoLng').value=ln;
    document.getElementById('epGeoStatus').textContent='✓ '+la.toFixed(6)+', '+ln.toFixed(6)+' (±'+Math.round(pos.coords.accuracy)+'m)';
    showToast('UBICACIÓN TOMADA','green');
  }, function(err){ showToast('NO SE PUDO OBTENER LA UBICACIÓN (activá el permiso)','red'); }, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
}
```
- [ ] **Step 3:** En `openEditProjectModal` (cargar valores), después de cargar los demás campos, agregar:
```js
  const _g=(p.geo||{});
  document.getElementById('epGeoLat').value = (_g.lat!=null?_g.lat:'');
  document.getElementById('epGeoLng').value = (_g.lng!=null?_g.lng:'');
  document.getElementById('epGeoRadio').value = (_g.radio!=null?_g.radio:150);
  document.getElementById('epGeoStatus').textContent = (_g.lat!=null) ? ('✓ '+Number(_g.lat).toFixed(6)+', '+Number(_g.lng).toFixed(6)) : 'Sin configurar';
```
- [ ] **Step 4:** En `saveProjectSpecs`, antes de `saveState()`, agregar:
```js
  const _gl=parseFloat(document.getElementById('epGeoLat').value), _gn=parseFloat(document.getElementById('epGeoLng').value), _gr=parseInt(document.getElementById('epGeoRadio').value,10);
  if (!isNaN(_gl) && !isNaN(_gn)) p.geo = { lat:_gl, lng:_gn, radio:(!isNaN(_gr)&&_gr>0?_gr:150) };
```
- [ ] **Step 5:** Verificar (`valjs` `blocks=26 errs=1`; `run` `FAIL=0`). Manual: abrir editar proyecto → USAR MI UBICACIÓN → guardar → reabrir → coords persisten. Commit `feat(asistencia): config de ubicacion (geocerca) por obra en el modal de proyecto`.

---

## Task 3: Captura de GPS al marcar (obligatoria)

**Files:** `index.html` (`_marcarAsistenciaFacial` ~L16372, `_abrirKioskoCaras` ~L16435, `_kioskMarcar`, `_cerrarKiosko`)

- [ ] **Step 1:** Vars + watch. Grep `let _kioskMatcher`. Agregar en esa línea `_kioskGeo=null, _kioskGeoWatch=null`. 
- [ ] **Step 2:** En `_abrirKioskoCaras`, después de armar la pantalla, iniciar el watch (obligatorio):
```js
  if (navigator.geolocation){
    _kioskGeo=null;
    _kioskGeoWatch = navigator.geolocation.watchPosition(
      function(pos){ _kioskGeo={ lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy, ts:Date.now() }; },
      function(err){ _kioskGeo=null; _kioskSetResult('⚠ ACTIVÁ LA UBICACIÓN PARA MARCAR','#FBBF24'); },
      { enableHighAccuracy:true, maximumAge:15000, timeout:20000 });
  } else { _kioskSetResult('ESTE DISPOSITIVO NO TIENE GPS','#FBBF24'); }
```
- [ ] **Step 3:** En `_cerrarKiosko`, limpiar el watch:
```js
  try{ if(_kioskGeoWatch!=null && navigator.geolocation){ navigator.geolocation.clearWatch(_kioskGeoWatch); _kioskGeoWatch=null; } }catch(e){}
  _kioskGeo=null;
```
- [ ] **Step 4:** `_marcarAsistenciaFacial` acepta `geo` y lo exige. Reemplazar su firma/cuerpo: agregar 4º parámetro `geo`; después de obtener `out`, hacer:
```js
  if (out.accion==='entrada') reg.geoEntrada = geo || null; else reg.geoSalida = geo || null;
```
(La validación de "obligatorio" se hace en `_kioskMarcar`, no acá, para no romper otros llamados.)
- [ ] **Step 5:** En `_kioskMarcar`, ANTES de llamar a `_marcarAsistenciaFacial`, exigir geo:
```js
  if (!_kioskGeo){ _kioskSetResult('⚠ SIN UBICACIÓN · ACTIVÁ EL GPS PARA MARCAR','#FBBF24'); return; }
```
y pasar `_kioskGeo` como 4º argumento: `const r=_marcarAsistenciaFacial(personaId, obraId, obraDesc, _kioskGeo);`
- [ ] **Step 6:** Verificar (`valjs`/`run`). Commit `feat(asistencia): GPS obligatorio al marcar por cara (watchPosition + geoEntrada/geoSalida)`.

---

## Task 4: Reporte — EN OBRA / FUERA + link al mapa (lista + PDF)

**Files:** `index.html` (asist-row status ~L16326, `descargarAsistenciaPDF` ~L16387)

- [ ] **Step 1:** Helper global para el texto de geocerca de un registro+obra:
```js
function _geoTxtMarca(reg, geoKey){
  const g = reg && reg[geoKey];
  if (!g || g.lat==null) return '';
  const p = activeProj(); // la obra del mark; si reg.obraId apunta a otra, buscarla:
  let obra = null;
  try { const _pid = reg.obraId; obra = (typeof state!=='undefined' && state.projects ? state.projects.find(x=>x.id===_pid) : null); } catch(e){}
  const og = obra && obra.geo;
  const ev = (typeof evalGeocerca==='function') ? evalGeocerca(g, og) : null;
  const maps = 'https://maps.google.com/?q='+g.lat+','+g.lng;
  if (!ev) return { txt:'SIN GEOCERCA', enObra:null, maps:maps };
  return { txt: ev.enObra ? 'EN OBRA' : ('FUERA · '+Math.round(ev.distancia)+'m'), enObra: ev.enObra, maps: maps };
}
```
- [ ] **Step 2:** En el status cell de la asist-row (donde se muestra ENT/SAL), agregar debajo una línea con la geocerca de la entrada (y salida si hay), con color verde (EN OBRA) / rojo (FUERA) y link al mapa. Construir el HTML usando `_geoTxtMarca(rg,'geoEntrada')`; si devuelve objeto, mostrar `<a href="${maps}" target="_blank" style="color:${enObra?green:red}">${txt}</a>`.
- [ ] **Step 3:** En `descargarAsistenciaPDF`, agregar una columna "UBICACIÓN" al head y al row: usar `_geoTxtMarca(rg,'geoEntrada')` → `txt` (o '—'). (El link no aplica en PDF; solo el texto.)
- [ ] **Step 4:** Verificar (`valjs`/`run`). Manual: marca dentro del radio → EN OBRA (verde) + link; fuera → FUERA (Xm) (rojo) + link; en PDF la columna UBICACIÓN. Registros viejos sin geo → '—'. Commit `feat(asistencia): mostrar EN OBRA/FUERA + link al mapa en lista y PDF`.

---

## Task 5: Verificación final y deploy

- [ ] `node _recetatest/valjs.js` → `blocks=26 errs=1`; `node _recetatest/run.js` → `PASS=NN FAIL=0`.
- [ ] Bump `sw.js` + chip footer a `vNNN-geocerca-asistencia`.
- [ ] Commit `release vNNN: geolocalizacion en asistencia facial (GPS obligatorio + geocerca)`; **push solo con OK del usuario** (deploy a producción).
- [ ] Prueba de aceptación: configurar obra, marcar dentro/fuera, verificar reporte + que sin permiso de ubicación no marca.
