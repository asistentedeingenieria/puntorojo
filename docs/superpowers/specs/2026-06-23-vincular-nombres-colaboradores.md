# Vincular nombres de pólizas/anticipos a COLABORADORES (cruce por ID)

**Fecha:** 2026-06-23 · **Aprobado por el usuario:** "DALE ASI"

## Problema
Los nombres en pólizas/anticipos no siempre coinciden exacto con el roster de
COLABORADORES (`_getPersonal()`/`getColaboradoresActivos()`), porque los datos viejos se
cargaron como texto libre (seed PDF) y el form de póliza guarda `aCargoDeColabId: ''`
(hardcodeado vacío). Resultado: el auto-descuento y el CHEQUEO cruzan por nombre y fallan
("NO EMPATÓ"). El campo `aCargoDeColabId` (pólizas) y `colaboradorId` (anticipos) existe pero
está vacío en todos.

## Solución (3 partes)
1. **Herramienta "VINCULAR NOMBRES"** (sub-pestaña en PÓLIZAS):
   - Lista cada póliza/anticipo NO vinculada a un colaborador exacto.
   - Por cada una: sugerencia automática del mejor match + combobox para confirmar/elegir →
     guarda el **ID** del colaborador y corrige el **nombre** al exacto del roster.
   - Botón "VINCULAR AUTOMÁTICO": linkea de una las que tienen match EXACTO, deja solo las dudas.
   - Contador "X vinculadas · Z por revisar".
2. **Los formularios guardan el ID** (nueva/editar póliza y anticipo): al elegir del combobox
   se guarda `aCargoDeColabId`/`colaboradorId` (hoy se pierde).
3. **El CHEQUEO cruza por ID** cuando póliza y pago lo tienen; si no, por **nombre EXACTO**
   (ya alineado al roster tras la auditoría). `yaAplicada`/`cobrada` siguen por `polizaIds`.

## Acotación (riesgo)
NO se reescriben los flujos de pago (código de plata). El cruce usa ID donde está + nombre
exacto como respaldo. OJO: alinear nombres arregla el auto-descuento a FUTURO; las planillas
PASADAS ya enviadas no se re-cobran solas (hay que reenviarlas para re-aplicar).

## Puras (TDD)
- `_colMatchSuggest(nombre, colaboradores)` → `{colab, exact}` mejor match (exacto normalizado
  primero; si no, substring/levenshtein simple) o null.
- `_nombresPorVincular(polizas, anticipos, colaboradores)` → `[{tipo, id, nombreActual,
  colabIdActual, sugerencia, exact}]` solo los NO vinculados a un colaborador exacto.
