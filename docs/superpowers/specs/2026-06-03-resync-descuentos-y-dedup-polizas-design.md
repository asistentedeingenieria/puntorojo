# Diseño: Resync de descuentos + dedup de pólizas entre proyectos

**Fecha:** 2026-06-03
**Estado:** Aprobado para planificar

## Objetivo

Dos correcciones al sistema de descuentos de planilla:

1. **Resync automático:** cuando cambia el catálogo de pólizas o anticipos,
   recalcular los descuentos de TODAS las planillas ABIERTAS (de todos los
   proyectos) para que siempre reflejen el catálogo actual.
2. **Dedup de pólizas entre proyectos:** una póliza se cobra en UN solo
   proyecto por persona, nunca duplicada cuando la persona cobra en dos.

## Contexto verificado (estado actual del código)

- **Pólizas:** `state.polizasGlobales[]`, match por `aCargoDeNombre`
  (nombre normalizado), estatus `ACTIVA`/`EN PROCESO` aplican, monto default
  44.95. Hoy se aplican por-planilla **SIN dedup cross-proyecto → se duplican.**
- **Anticipos:** `state.anticiposGlobales[]`, match por `colaboradorNombre`.
  YA hacen dedup cross-proyecto contando cuotas en planillas de otros proyectos.
- **Motor:** `_v411AplicarDescuentosInline(planilla, p)` (línea ~32888) corre
  AL ENVIAR (línea ~33062) + fallback al render. El resultado se guarda como
  **snapshot congelado** en `planilla.descuentosPlanilla[]`. **No hay resync.**
- **Estados:** `pendiente_pm` → `aprobada_inicial` → `pendiente_pm_final` →
  `aprobada` → `archivada` (+ `rechazada`). **Abiertas = los 3 primeros.**
- Planillas en `p.planilla.planillasArmadas[]`. Pólizas `bloqueado:true`
  (no se quitan); anticipos `bloqueado:false` (gerente puede QUITAR).

## Decisiones tomadas

| # | Decisión | Elección |
|---|---|---|
| 1 | Alcance del resync | **Solo planillas ABIERTAS** (pendiente_pm, aprobada_inicial, pendiente_pm_final). Nunca aprobada/archivada/rechazada. |
| 2 | Dedup de póliza | **Primera planilla abierta armada** (menor fechaEnvio/creación) se queda la póliza; las demás la saltan. |
| 3 | Disparador | **Al guardar el catálogo** (póliza o anticipo: alta/edición/baja). |
| 4 | Quites manuales | **El catálogo manda** — recompute completo sobreescribe; ignora quites manuales de anticipos. Pólizas siempre forzadas. |
| 5 | Aviso | **Notificar a la gerente** cuando una planilla abierta cambia por resync. |

## Arquitectura

### Función pura: `_computeDescuentosPlanilla(planilla, p, polizaOwnerByPersona)`

Extraer de `_v411AplicarDescuentosInline` la lógica de "qué descuentos
corresponden a esta planilla", como función determinística que devuelve el
array de descuentos nuevo. Recibe `polizaOwnerByPersona` (mapa
personaNormalizada → planillaId dueña de la póliza) para aplicar el dedup:
la póliza se agrega solo si `planilla.id === polizaOwnerByPersona[persona]`.

- **Pólizas:** del catálogo (ACTIVA/EN PROCESO), solo si esta planilla es la
  dueña de esa persona. `bloqueado:true`, `autoAplicado:true`.
- **Anticipos:** cuota que corresponda (lógica cross-proyecto existente),
  ignorando quites manuales (catálogo manda).

### Función orquestadora: `resyncDescuentosAbiertas()`

1. Recolecta todas las planillas ABIERTAS de todos los `state.projects`.
2. Construye `polizaOwnerByPersona`: para cada persona, entre sus planillas
   abiertas (todos los proyectos), la de menor `(fechaEnvio || fechaCreacion)`
   es la dueña. Tie-break determinístico por `projectId + planillaId`.
3. Para cada planilla abierta: calcula `_computeDescuentosPlanilla(...)`,
   compara con `descuentosPlanilla` previo; si cambió, reemplaza y marca la
   planilla como "cambiada".
4. Persiste (`saveState`), sube (`CloudSync.forceUploadNow`), y por cada
   planilla cambiada notifica a la gerente.

### Hooks de catálogo

Después de `saveState()` en las funciones de guardar/editar/baja de PÓLIZAS y
ANTICIPOS, llamar `resyncDescuentosAbiertas()`. Ubicaciones a hookear:
guardar/editar/dar-de-baja póliza; guardar/editar/eliminar anticipo.

### Dedup también en el flujo normal de armar/enviar

`_v411AplicarDescuentosInline` (flujo al enviar) debe consultar el mismo
`polizaOwnerByPersona` para que, al enviar la 2.ª planilla de la persona, la
póliza NO se duplique desde el inicio (no solo en el resync).

### Notificación

Por cada planilla cambiada: `_notifyByPerm('planilla.authorize'/'users.manage',
{ title:'DESCUENTOS ACTUALIZADOS', body: proyecto + planilla + resumen del
cambio })`.

## Edge cases y riesgos

- **Solo abiertas:** filtro de estado estricto; planillas cerradas se quedan
  con su snapshot congelado del último resync.
- **Idempotencia:** `_computeDescuentosPlanilla` es determinístico → correr el
  resync dos veces no cambia nada la segunda vez.
- **Persona en 2 planillas del MISMO proyecto:** el dedup es por persona global,
  igual designa una sola dueña.
- **Pólizas EN PROCESO** cuentan como activas (v380): se respeta.
- **Performance:** recorrer todas las planillas abiertas de todos los proyectos
  en cada save de catálogo. Aceptable (pocas abiertas). Optimizar solo si crece.
- **No romper el snapshot al cerrar:** al aprobar/archivar, los descuentos
  quedan congelados con el último valor del resync.

## Fuera de alcance (YAGNI)

- No cambiar planillas cerradas/pagadas/archivadas.
- No cambiar la lógica de cuotas de anticipos (ya dedup correctamente).
- No UI nueva salvo la notificación.

## Criterio de "terminado"

- Dar de baja una póliza → desaparece de todas las planillas abiertas que la
  tenían.
- Persona en 2 proyectos con planillas abiertas → póliza solo en la primera
  armada; la segunda NO la tiene.
- Agregar/editar un anticipo → la cuota correspondiente aparece/actualiza en la
  planilla abierta.
- La gerente recibe notificación cuando una planilla abierta cambió.
- Las planillas cerradas no cambian nunca.
