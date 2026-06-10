# Geolocalización en asistencia facial (GPS + geocerca) — Diseño

**Fecha:** 2026-06-10
**Proyecto:** PUNTO ROJO (PWA, `puntorojo.app`)
**Estado:** Diseño aprobado por el usuario. Listo para plan + construcción.

## Objetivo

Al marcar asistencia por reconocimiento facial, capturar la **ubicación GPS en tiempo real** donde se hace la marca, y mostrar en el reporte si fue **EN OBRA o FUERA** (geocerca), para verificar que la asistencia se registró en la obra.

## Decisiones aprobadas

| Tema | Decisión |
|---|---|
| Captura | Cada marca facial (entrada/salida) guarda **lat/long + precisión + timestamp**. |
| Permiso | **OBLIGATORIO**: sin permiso/ubicación NO se puede marcar la cara. |
| Ubicación de la obra | Por proyecto: botón **"USAR MI UBICACIÓN ACTUAL"** (parado en la obra) + **radio** (default **150 m**). Configurable solo por **admin**, en la config del proyecto. |
| Geocerca | Al marcar, compara la posición contra la ubicación de la obra del mark → **EN OBRA** (dentro del radio) o **FUERA** (con la distancia en metros). |
| Reporte | En la lista de asistencia y en el PDF: cada marca muestra **EN OBRA / FUERA (Xm)** + **link a Google Maps** del punto (el link clickeable solo en la lista; en el PDF va el texto). |
| Alcance | Solo el flujo **facial/kiosko** exige ubicación. El marcado **manual** (checkbox) no cambia. |

## Modelo de datos

```js
// state.projects[i] — campo nuevo:
project.geo = { lat:Number, lng:Number, radio:Number };   // radio en metros (default 150)

// asistenciaGlobal['YYYY-MM-DD'][personaId] — campos nuevos:
{
  // ...presente, entrada, salida, obraId, obraDesc, via,
  geoEntrada: { lat, lng, acc, ts } | undefined,
  geoSalida:  { lat, lng, acc, ts } | undefined
}
```
La geocerca (EN OBRA/FUERA) NO se persiste: se **calcula al mostrar** (lista/PDF) comparando `geoEntrada`/`geoSalida` contra `project[reg.obraId].geo`. Así si se reconfigura la obra, el reporte se recalcula.

## Componentes

1. **Lógica pura (testeable, bloque RECETA-PURE):**
   - `haversineMeters(lat1,lng1,lat2,lng2)` → distancia en metros (fórmula haversine).
   - `evalGeocerca(markGeo, obraGeo)` → `{ enObra:Boolean, distancia:Number }` o `null` si falta algún dato. `enObra = distancia <= obraGeo.radio`.

2. **Config de ubicación de obra** (modal de edición de proyecto, L≈2915-2962 + `openEditProjectModal` L≈16786 + `saveProjectSpecs` L≈17076):
   - Sección "UBICACIÓN DE LA OBRA (GEOCERCA)": muestra coords actuales o "sin configurar"; botón **USAR MI UBICACIÓN ACTUAL** (`navigator.geolocation.getCurrentPosition` → llena coords + las muestra); input de **radio** (default 150). Solo admin.
   - `openEditProjectModal` carga `p.geo`; `saveProjectSpecs` guarda `p.geo = {lat,lng,radio}`.

3. **Captura de GPS al marcar (obligatoria)** (kiosko `_abrirKioskoCaras` L≈16435, `_marcarAsistenciaFacial` L≈16372):
   - Al abrir el kiosko: `navigator.geolocation.watchPosition` → guarda `_kioskGeo = {lat,lng,acc,ts}` y lo mantiene fresco. Si el permiso es denegado o no hay fix → mensaje bloqueante y **no se permite marcar** (el botón/loop no marca).
   - `_marcarAsistenciaFacial(personaId, obraId, obraDesc, geo)`: si `!geo` → no marca (toast "ACTIVÁ LA UBICACIÓN PARA MARCAR"). Si hay geo, tras `computeAsistenciaMark`, adjunta `geo` a `geoEntrada` (si accion=entrada) o `geoSalida` (si accion=salida).
   - `_kioskMarcar` pasa `_kioskGeo`; si es null, bloquea con el toast.

4. **Reporte (lista + PDF)** (asist-row status L≈16329, `descargarAsistenciaPDF` L≈16387):
   - Por cada marca, calcular geocerca con `evalGeocerca` contra la obra del mark. Mostrar **EN OBRA** (verde) o **FUERA (Xm)** (rojo) + link a `https://maps.google.com/?q=lat,lng` (lista). En el PDF, columna/línea "UBICACIÓN" con el texto EN OBRA / FUERA (Xm).

## Permisos
- Configurar ubicación de la obra: **admin** (`users.manage`, ya lo exige `saveProjectSpecs`).
- Marcar por cara: requiere ubicación (cualquiera con `personal.asistencia`).

## Errores / casos borde
- Permiso de ubicación denegado → no se marca; mensaje claro de cómo activarlo.
- Obra sin geo configurada → la marca igual guarda GPS, pero el reporte muestra "SIN GEOCERCA" (no puede decir EN OBRA/FUERA sin la ubicación de la obra).
- Baja precisión (acc grande) → se guarda igual; opcional mostrar la precisión.
- Registros viejos sin geo → muestran "—" en ubicación (sin romper).

## Pruebas
- **Unitarias (puras):** `haversineMeters` (distancias conocidas), `evalGeocerca` (dentro/fuera/sin datos). En `_recetatest/tests.js`.
- **Manuales:** configurar ubicación de obra; marcar dentro y fuera del radio; verificar EN OBRA/FUERA + link en lista y PDF; verificar que sin permiso de ubicación NO marca.

## Criterios de éxito
1. Admin puede fijar la ubicación + radio de cada obra con "usar mi ubicación actual".
2. Marcar la cara exige ubicación; sin permiso no marca.
3. Cada marca guarda GPS y el reporte (lista + PDF) muestra EN OBRA / FUERA (distancia) + link al mapa.
4. No rompe el marcado manual, el reconocimiento facial existente, ni el reporte previo.

## Fuera de alcance (futuro)
- Geocerca en el marcado manual; historial de mapa por persona; alertas automáticas por marcas FUERA.
