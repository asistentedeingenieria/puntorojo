# PERSONAL global + asistencia por obra (diseño)

**Decisión del usuario (brainstorming):** personal **GLOBAL con EMPRESA**; **asistencia global eligiendo obra**; **cargo texto libre**. Importar desde el Excel "LISTADO DE PERSONAL 2026".

## Excel origen
Hoja `GENERAL` = listado maestro. Encabezados (fila 2): `No · NOMBRE · CARGO · EMPRESA · DPI · TELÉFONO · … · FACTURADO X · NOMBRE · DPI · TELÉFONO`. EMPRESA ∈ {DRYMIX, PALADIUS, KANZERVERUS}. Bloque "FACTURADO X" (opcional) = quien factura por esa persona.

## Modelo (global)
```js
state.personalGlobal = [ { id, nombre, cargo, empresa, dpi, telefono,
                           facturadoPor:{nombre,dpi,telefono}|undefined, activo:true, ts } ];
state.asistenciaGlobal = { 'YYYY-MM-DD': { '<personaId>': { presente:true, obraId:'<projId|OTRA>', obraDesc:'' } } };
```
- Accessors globales `_getPersonal()` / `_getAsistencia()` (como `_getProveedores`).
- Migración en `ensureDataV9`: crea los arrays; migra `p.personal.colaboradores` (por proyecto, legacy) → `personalGlobal` (dedupe por nombre normalizado; cargo = puesto). No borra la planilla.

## Partes
1. **Parser puro `parsePersonalExcel(sheets)`** → `{personas, avisos}` (detecta hoja GENERAL/encabezados, columnas por nombre, bloque FACTURADO). Testeable.
2. **Importador**: `_parsePersonalFromFile(file)` + botón "SUBIR EXCEL DE PERSONAL" en PERSONAL. **Merge** por DPI (si hay) si no por nombre normalizado: actualiza cargo/empresa/dpi/tel/facturadoPor, agrega nuevos, conserva existentes (overlay de carga).
3. **Lista (sub-pestaña COLABORADORES)**: tabla global NOMBRE·CARGO·EMPRESA·DPI·TELÉFONO·FACTURADO POR; **filtro por EMPRESA**; agregar/editar/quitar (`personal.edit`/admin).
4. **Asistencia (sub-pestaña ASISTENCIA)**: selector de **fecha** (hoy); por persona: **presente ✓** + **selector de OBRA** (proyectos de la app + `OTRA` → input descripción). "TODOS PRESENTES"; filtro por empresa (`personal.asistencia`).

## Permisos
`view.personal` (ver), `personal.edit`/`users.manage` (editar lista + importar), `personal.asistencia` (marcar).

## Persistencia
`personalGlobal` y `asistenciaGlobal` viajan en el estado global (saveState + CloudSync), igual que `polizasGlobales`/`proveedoresGlobales`. (Sin arrays anidados: asistenciaGlobal es objeto→objeto→objeto.)

## Fuera de alcance (futuro)
Unificar `personalGlobal` con los colaboradores de planilla/pagos (hoy quedan separados).
