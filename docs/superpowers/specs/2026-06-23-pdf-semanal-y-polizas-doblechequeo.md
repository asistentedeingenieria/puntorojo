# PDF semanal de asistencia + doble chequeo de pólizas

**Fecha:** 2026-06-23 · **Estado:** Aprobado por el user (3 decisiones confirmadas).

## Feature 1 — PDF semanal de asistencia (por proyecto)

**Qué:** botón en la pestaña ASISTENCIA que genera un PDF con una **grilla**:
filas = personas; columnas = **lunes a sábado** con su fecha; celda = **✓** si la
persona llegó a la obra ese día, **✗** si no. Un PDF **por proyecto** (cada obra su
registro semanal). **Selector de semana** (default la semana actual; permite semanas
pasadas).

- **Roster (filas):** personal activo relevante al proyecto/obra (mismo criterio que el
  resto de reportes de asistencia; reusa `_getPersonalActivo` + la obra efectiva).
- **Presencia por día:** se lee de `state.asistenciaGlobal` (vía `_getAsistencia`),
  por persona y por fecha (clave de día). Presente = tuvo marca/sesión ese día en la obra.
- **Semana:** lunes..sábado. Helper puro `_semanaLunSab(fechaBase)` → array de 6 fechas.
- **PDF:** jsPDF, con logo, encabezado proyecto + rango de semana, grilla con ✓/✗,
  total de días presentes por persona. Baja con `_pdfDescargar` (móvil-aware).
- **Permiso:** `personal.asistenciaPdf` (el mismo que PDF PRESENTES).

## Feature 2 — Doble chequeo de pólizas

Confirmado en código: la póliza solo se descuenta a quien **tuvo pago en esa planilla**
(`_v411AplicarDescuentosInline` itera sobre los colaboradores con pago). Si alguien tiene
póliza ACTIVA y no tuvo pago esa quincena → **no se le descontó**.

**Definición de "pendiente" (opción completa elegida):** persona con póliza ACTIVA/EN
PROCESO a la que NO se le aplicó la póliza en la planilla. Dos razones:
- **SIN PAGO:** no aparece en los pagos de la planilla.
- **NO EMPATÓ:** sí tuvo pago pero ningún descuento POLIZA quedó a su nombre (atrapa
  errores de tipeo en el catálogo).

Función pura `_polizasPendientesDePlanilla(pl, p, state)` → `[{persona, polizas:[...],
razon:'SIN PAGO'|'NO EMPATO'}]`. Reusa la normalización `_v464NormKey` y el match de
`_v411` para ser consistente.

### (a) Chip en cada planilla
Cuando ya están aplicados los descuentos, un chip **"PÓLIZAS PENDIENTES POR DESCONTAR: N"**.
Al tocarlo → modal/listado con quiénes y por qué. Aparece en el render de la planilla
armada (donde se ven los descuentos).

### (b) Reporte comparativo (nueva sub-pestaña en PÓLIZAS)
Sub-pestaña "CHEQUEO QUINCENAL" en PÓLIZAS: un cuadro **por quincena** (planilla armada
del proyecto) con: cuántas pólizas se aplicaron, cuántas faltaron, y el listado de a
quién le faltó (con razón). + PDF.

## Testing
- Puro `.cjs`: `_semanaLunSab` (6 fechas lun–sáb), `_polizasPendientesDePlanilla`
  (detecta SIN PAGO y NO EMPATO; no marca pendiente a quien sí recibió la póliza).
- Estructural: botón PDF semanal, sub-pestaña CHEQUEO QUINCENAL, chip en planilla.

## Orden de entrega
- v802: PDF semanal de asistencia.
- v803: pólizas — función pura + chip en planilla + sub-pestaña comparativa.
