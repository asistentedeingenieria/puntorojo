# Cobro: hoja estándar "RESUMEN PR" (diseño)

**Problema:** las estimaciones reales son enormes y distintas por proyecto (ESSENZA 1000×33, VICINIA 382×24, TORELO 2935×12); la app batalla para parsearlas.
**Decisión del usuario (brainstorming):** una **pestaña estándar "RESUMEN PR"** dentro de su Excel de estimación; la app lee SOLO esa hoja e ignora todo lo demás. Carga **acumulativa** (la hoja lista todas las estimaciones; al subir, **reemplaza** el cobro).

## Formato de la hoja "RESUMEN PR"
Fila de encabezado (en cualquier fila): `DESCRIPCIÓN | MONTO CON IVA | FECHA FACTURA | FECHA PAGO | NO. FACTURA | ESTADO | TIPO`. Debajo, una fila por estimación (incluido el anticipo). Se detecta la fila de encabezado por las palabras DESCRIPCIÓN + MONTO…IVA; las columnas se ubican por nombre (orden flexible).
- **MONTO CON IVA:** número (acepta "Q", comas).
- **FECHA FACTURA / FECHA PAGO:** texto DD/MM/YYYY, fecha ISO, o serial de Excel (se normaliza).
- **ESTADO:** PAGADO / EN AUTORIZACIÓN / PENDIENTE (default PENDIENTE).
- **TIPO:** vacío / ANTICIPO / SIN AMORT.
- Amortización, retención, saldo: **los calcula la app** con los % del proyecto (NO van en la hoja).

## Lectura (app)
- En `uploadEstimacionCobro` (.xlsx), ANTES del parser viejo: si el libro tiene una hoja cuyo nombre normalizado contiene "RESUMEN PR" (o "RESUMEN PUNTO ROJO" / "PUNTO ROJO"), se usa la **ruta nueva**: leer esa hoja (`sheet_to_json header:1 raw:true`), `parseResumenPR(aoa)`, confirmar, **reemplazar** `p.cobro.rows` (ids nuevos con `uid()`), `saveState()` + `CloudSync.uploadCurrent()` + `renderCobro()`. Si no hay hoja RESUMEN PR → parser viejo (sin cambios).
- Permiso: `cobro.edit || users.manage`.

## Puro / pruebas
`parseResumenPR(aoa)` + `_resumenFecha(v)` + `_resumenNum(v)` en el bloque puro (testeables en Node). Casos: detección de encabezado, monto con "Q"/comas, ANTICIPO/SIN AMORT, PAGADO/PENDIENTE, serial 25569 → 01/01/1970, ISO → DD/MM/YYYY.

## Entregable
Plantilla `RESUMEN PR - PLANTILLA.xlsx` con la hoja "RESUMEN PR" (encabezado + filas de ejemplo con los datos actuales) para que el usuario la copie como pestaña a su Excel y enganche el MONTO CON IVA con fórmula del mismo archivo.

## Fuera de alcance
% del proyecto en la hoja (se quedan en la app). Auto-detección de la fila/columna fuera del bloque RESUMEN PR.
