# Catálogo de proveedores GLOBAL (diseño)

**Proyecto:** PUNTO ROJO (`index.html`). Hoy `proveedores` es por-proyecto (`p.materiales.proveedores`); pasa a ser **único/global** para todos los proyectos.
**Fecha:** 2026-06-08
**Decisión del usuario:** el catálogo de proveedores (proveedores + productos + **precios + rinde**) es el mismo en TODOS los proyectos. Totalmente global (un producto = un precio para todos).

## Patrón (igual a pólizas/anticipos globales)
- Store: `state.proveedoresGlobales` (array). Accessor `_getProveedores()` (ignora el proyecto, asegura array) — espejo de `_getPolizas`.
- Migración en `ensureDataV9`: junta `p.materiales.proveedores` de todos los proyectos → `state.proveedoresGlobales` (dedupe por id); seed `SISTEGUA` si queda vacío; limpia el per-proyecto (`= []`). Corre una vez.

## Cambios
1. **Accessor** `_getProveedores()` cerca de `_getPolizas` (~L38146).
2. **Migración** cerca de la de anticipos (~L7367): merge + seed + limpiar.
3. **Quitar el seed per-proyecto** (`if(!Array.isArray(p.materiales.proveedores)){ ... SISTEGUA ... }` + el forEach de productos, ~L7618-7626).
4. **`precioDeProductoReceta`** (pura): cambia firma a `(proveedores, materialNombre)`; `const provs = proveedores||[]`. Callers de la app pasan `_getProveedores()`. Tests pasan el array.
5. **Reemplazar los demás `p.materiales.proveedores`** (~20 sitios: órdenes de compra + catálogo modal + render precios) por `_getProveedores()`. Excepciones: el delete reasigna `state.proveedoresGlobales = _getProveedores().filter(...)`; los `if(!Array.isArray(...)) = []` se quitan (el accessor ya asegura array).

## Persistencia
`state.proveedoresGlobales` sincroniza como parte del estado global (igual que `polizasGlobales`) vía saveState + CloudSync.

## Pruebas
- Pura: `precioDeProductoReceta(arr, nombre)` con la nueva firma (precio + rinde) — `errs=1`, `FAIL=0`.
- App: editar el catálogo en un proyecto → se ve igual en otro proyecto; precios de receta calzan en ambos; OCs usan el mismo catálogo. Migración no pierde proveedores existentes.

## Fuera de alcance
Precio por proyecto (se descartó: es totalmente global). Merge por nombre de duplicados (dedupe solo por id).
