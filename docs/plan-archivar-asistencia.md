# Plan: Archivar asistencia vieja (#3 — blindaje de escala)

**Objetivo:** que `appState/asistencia` (que crece TODOS los días y eventualmente choca con el límite
de 1MB de Firestore) nunca sea problema. El doc CALIENTE lleva solo lo reciente; lo viejo va a un
archivo que se carga **bajo demanda** (decisión del user: "casi siempre miramos lo reciente").

## Hallazgos de la investigación (jun-26)
- `state.asistenciaGlobal` está **indexado por fecha**: `{ 'YYYY-MM-DD': { pid: rec } }`.
- Casi todos los lectores hacen `_getAsistencia()[fecha]` (consulta por fecha puntual, casi siempre
  `_asistFechaActual()` = hoy). ~20 call-sites; los de rango (PDF semanal, resumen) iteran fechas.
- La asistencia ya vive en su PROPIO doc (`appState/asistencia`, v649) + ruta liviana de subida.
- `_mergeAsistencia` ya es idempotente (v856) y hay alarma de tamaño (>900KB).

## Diseño (seguro, sin perder ni ocultar nada)
1. **Ventana caliente generosa:** mantener en `appState/asistencia` las fechas de los últimos **N meses**
   (propongo N=12 — cubre casi todo reporte real, deja margen). Más viejo → archivo.
2. **Archivo por año:** `appState/asist_arch_<YYYY>` (un doc por año; cada año << 1MB). NO se carga al
   abrir la app.
3. **Accesor único `_getAsistenciaDia(fecha)`:** devuelve las marcas de esa fecha; si no está en lo
   caliente, carga (una vez, cache) el doc de archivo del año correspondiente y la trae. Reemplazar
   los ~20 `_getAsistencia()[fecha]` por este accesor (transparente; hoy el archivo está vacío → mismo
   comportamiento).
4. **Migración/trim al subir (la parte delicada):** en `uploadAsistencia`, separar fechas > N meses,
   escribirlas al doc de archivo del año, y SOLO tras confirmar esa escritura, quitarlas del caliente.
   NUNCA borrar de lo caliente sin que el archivo esté confirmado (a prueba de pérdida).

## Pasos (TDD, por fases — cada una verde antes de la siguiente)
- **Fase A (additiva, riesgo CERO):** `_asistSplitByAge(asis, hoy, meses)` PURO (separa reciente/viejo
  por fecha) + test. Accesor `_getAsistenciaDia(fecha)` con carga perezosa del archivo + test. Cablear
  los ~20 lectores al accesor. **No mueve ni borra nada todavía** → comportamiento idéntico.
- **Fase B (la migración, con red):** en `uploadAsistencia`, escribir lo viejo al archivo y recién
  entonces recortar el caliente. Test del split + de "no recorta si el archivo no confirmó".
- **Fase C (verificación):** probar UNO POR UNO los reportes que iteran fechas (PDF semanal con una
  semana vieja, resumen, estado de fuerza, KPIs) — que traigan el archivo sin romperse.

## Reglas Firestore (consola) a agregar
`match /appState/{docId}` ya cubre `asist_arch_*` (mismo patrón `appState/*`). No hace falta regla
nueva, pero confirmar que `hasAnyPerm()` aplica (sí, es `appState/{docId}`).

## Por qué con CUIDADO
Es una **migración de datos** (mover marcas entre documentos) = el cambio más riesgoso. Un error
oculta o pierde historial de asistencia. Por eso va por fases (la additiva primero, sin tocar datos;
la migración con confirmación-antes-de-borrar) y se prueba cada reporte antes de soltar.
