# MATERIALES · Fase 1 — Receta + Precios (diseño)

**Proyecto:** PUNTO ROJO (PWA, `index.html` monolítico). Firebase + CloudSync.
**Fecha:** 2026-06-08
**Alcance:** SOLO Fase 1. Fases 2 (pedir por etapa+nivel → compras) y 3 (OC automática) van en specs aparte.

---

## 1. Objetivo

Que la receta de material de un proyecto (dividida en 4 etapas, con cantidades **totales por nivel**) viva dentro de la app:

1. **Cargar** la receta desde la plantilla Excel (`RECETA ... - PLANTILLA APP.xlsx`) que ya validamos.
2. **Guardar** la receta por nivel × 4 etapas + un catálogo de **precios (1 proveedor + 1 precio por producto)**.
3. **Ver** la receta dentro de MATERIALES (por nivel y por etapa).
4. **Editar** la receta SOLO con autorización (admin o gerente de proyectos directo; cualquier otro envía **solicitud**).

Fuera de alcance en Fase 1: generar pedidos, enviarlos a compras y armar OCs (eso es Fase 2 y 3).

---

## 2. Contexto del código actual (qué reutilizamos)

Confirmado leyendo `index.html`:

- **Librerías ya cargadas:** `XLSX` (SheetJS 0.18.5), `JSZip`, `ExcelJS`. Existe un parser genérico `.xlsx → array de filas` (~L21527) con SheetJS + fallback. **No se agregan librerías.**
- **`p.materiales`** (init ~L7135): `{ items, pedidos, pedidoCounter, ordenes, ordenCounter, proveedores, direccionesEntrega, receta:[{}×6], etapasPedidas }`. Además campos heredados de importadores viejos: `recetaPorTorre`, `recetaPorTipeYNivel`, `recetaPorTipo`, `recetaEtapaLabels`, `recetaMatOrder`, `recetaConfig`.
- **Proveedores** (`p.materiales.proveedores[]`): `{id, nombre, contacto, telefono, productos:[{nombre, unidad, precio}]}`. Existe `openCatalogoProveedores()` (perm `users.manage`). HOY el precio NO está ligado a la receta ni a las OCs.
- **Torres/niveles** (`p.towers[]`): `{id:'t4', name:'TORRE IV', levels:[{id:'t4-n1', name:'NIVEL 1', aptos:[...]}]}`. **levelId = `<torreId>-n<num>`**.
- **Patrón de solicitudes** (`p.solicitudesMover[]`, ~L8712): objeto `{id, ...payload, resumen, by, byNombre, ts, estado:'PENDIENTE'|'APROBADA'|'RECHAZADA', procesadoPor, fechaProceso, motivoRechazo}`; funciones `verSolicitudesMover/autorizarMover/rechazarMover`; listener delegado en `document.body` con `data-action`/`data-id`; gate `can('planilla.authorize') || can('users.manage')`.
- **Permisos** (`can(perm)` ~L4778; admin = `*`): existen `view.materiales`, `materiales.edit`, `receta.edit`, `pedidos.create/advance/receive`, `compras.autorizar`, `users.manage`, etc.
- **Persistencia:** `saveState()` + `CloudSync` (debounced) / `CloudSync.forceUploadNow()` (inmediato). Cada proyecto se sube completo (incluye `materiales`) con hashing por proyecto (`_projHashes`). Cualquier cambio a `p.materiales` ya se sincroniza.

**Decisión:** introducimos una estructura **nueva y limpia** (`recetaV2`) para la receta de Fase 1 en vez de pelear con los campos heredados (que quedaron de intentos viejos con PDF y modelo de 6 etapas). Los campos viejos NO se borran (se dejan en el objeto), pero la nueva pantalla de RECETA usa solo `recetaV2`. La UI vieja de importar receta por PDF se oculta para no confundir.

---

## 3. Modelo de datos (nuevo)

Todo dentro de `p.materiales` (per-proyecto, ya sincronizado):

```js
p.materiales.recetaV2 = {
  version: 2,
  fuente: 'ESSENZA FASE 2',          // etiqueta libre (nombre del archivo/proyecto)
  importadoTs: 1749312000000,        // Date.now() al cargar
  importadoPor: 'correo@...',        // quién la cargó
  etapas: ['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'],
  niveles: {
    // levelId -> array de 4 etapas; cada etapa = array de líneas
    't4-n1': [
      [ {m:'Canal de 2 1/2" calibre 26', u:'U', c:120}, /* ...E1 */ ],
      [ /* ...E2 */ ],
      [ /* ...E3 */ ],
      [ /* ...E4 */ ]
    ],
    't4-n2': [ /* ... */ ]
    // ...
  }
};

// Catálogo de precios: 1 proveedor + 1 precio por PRODUCTO (nombre normalizado)
p.materiales.precios = {
  'Plancha ultra':            { proveedorId:'prv-x', proveedor:'SISTEGUA, S.A.', precio:78.50, unidad:'U' },
  'Poste de 2 1/2" calibre 26 -- H=3.88': { proveedorId:'', proveedor:'', precio:0, unidad:'U' },
  // ... 27 productos
};

// Solicitudes de cambio de receta (cuando quien edita NO tiene receta.edit)
p.solicitudesReceta = [
  {
    id: 'rec_<ts>_<rand>',
    tipo: 'cantidad',                // 'cantidad' | 'agregar' | 'quitar'
    levelId: 't4-n3', etapaIdx: 0,
    material: 'Canal de 2 1/2" calibre 26',
    unidad: 'U',                     // usado en 'agregar'
    cantidadActual: 137,             // 'cantidad' (referencia); en 'agregar' = null
    cantidadNueva: 140,              // 'cantidad' y 'agregar'
    resumen: 'T4 · NIVEL 3 · 1RA ETAPA · Canal... · 137 → 140',
    by:'correo', byNombre:'JUAN', ts: 1749..., estado:'PENDIENTE',
    procesadoPor:'', fechaProceso:'', motivoRechazo:''
  }
];
// Aplicación al autorizar (idéntica a la edición directa):
//   'cantidad' → set c = cantidadNueva en la línea existente
//   'agregar'  → push {m:material, u:unidad, c:cantidadNueva} a niveles[levelId][etapaIdx];
//                si normProducto(material) no está en precios, crear entrada con precio 0
//   'quitar'   → eliminar la línea material de niveles[levelId][etapaIdx]
```

**Normalización de producto** (para el catálogo de precios y para mapear líneas de receta a un precio):
```js
function normProducto(nombre){
  let n = String(nombre).replace(/\s*\/\s*(TABIQUES|ENCHAPES)\s*$/i,'').trim();
  if (/^Clavos de fijaci/i.test(n)) n = 'Clavo de fijación';
  return n;
}
```
Así `Plancha ultra / TABIQUES`, `/ ENCHAPES` y `Plancha ultra` comparten precio; `Clavos de fijación` se unifica con `Clavo de fijación`. Los postes `H=3.88` y `H=3.17` quedan como **dos productos** (precio distinto por altura).

---

## 4. Ingesta de la plantilla (.xlsx → recetaV2 + precios)

**UI:** en MATERIALES → sub-pestaña RECETA, botón **"CARGAR RECETA (EXCEL)"** visible solo con `receta.edit || users.manage`. Abre `<input type="file" accept=".xlsx">` (mismo patrón que `uploadEstimacionExcel`, L2433).

**Parser:** `XLSX.read(arrayBuffer)`; por cada hoja `XLSX.utils.sheet_to_json(ws,{header:1, defval:''})` → array de filas.

**Mapeo por hoja:**
- **Hojas de torre** = cualquier hoja cuyo nombre sea `T<digito>` (ej. `T4`, `T3`). De cada una:
  - `torreNum` = dígito del nombre. `torreId` = `'t'+torreNum`. Validar que exista `p.towers.find(t=>t.id===torreId)`; si no, intentar por número en el nombre (`TORRE IV`→4). Si no se encuentra, **error claro** y abortar esa hoja.
  - Fila 1 = encabezados: `ETAPA | MATERIAL | UNIDAD | NIVEL 1 … NIVEL 12`. Detectar las columnas de nivel por el texto `NIVEL <n>`.
  - Por cada fila de datos: `etapaIdx` desde la columna ETAPA (`1RA→0, 2DA→1, 3RA→2, 4TA→3`); `material`, `unidad`; y por cada columna `NIVEL n` con valor numérico > 0 (o ≥0 según config), encolar `{m:material, u:unidad, c:valor}` en `niveles[torreId+'-n'+n][etapaIdx]`.
    - Mapear nivel→levelId: `levelId = torreId+'-n'+n`; validar que el nivel exista en `p.towers`. Niveles del proyecto sin receta (ej. azotea/13) se ignoran.
- **Hoja `PRECIOS`**: encabezados `PRODUCTO | UNIDAD | PROVEEDOR | PRECIO UNITARIO (Q)`. Por fila: `precios[normProducto(producto)] = {proveedor: prov||'', precio: Number(precio)||0, unidad, proveedorId:''}`. (Si PROVEEDOR coincide con un `p.materiales.proveedores[].nombre`, set `proveedorId`.)

**Validaciones antes de aplicar** (mostrar resumen en `prConfirm` y pedir confirmación):
- Conteo de niveles encontrados por torre (esperado 12) y total de líneas.
- Materiales en receta cuyo `normProducto` NO está en la hoja PRECIOS → listar como "sin precio" (no bloquea; aviso).
- Torres/niveles de la plantilla que no existen en el proyecto → listar (no se cargan).
- Si la plantilla no tiene hojas `T*` ni `PRECIOS` → error "Archivo no parece la plantilla de receta".

**Aplicación:** al confirmar, set `p.materiales.recetaV2` y `p.materiales.precios` (reemplazo completo, es una recarga), `importadoTs/Por`, `saveState()`, `CloudSync.forceUploadNow()`, toast verde "RECETA CARGADA". Re-render.

**Idempotencia:** recargar el mismo archivo deja el mismo estado. Recargar un archivo editado reemplaza la receta (esto es intencional: el Excel es la fuente para recargas masivas; los ajustes finos se hacen en la app, ver §6).

---

## 5. Ver la receta (per nivel × 4 etapas)

Sub-pestaña **RECETA** en MATERIALES. Si no hay `recetaV2`, mostrar estado vacío + botón CARGAR (si tiene permiso).

Con `recetaV2`:
- Selectores: **TORRE** (chips/dropdown desde las torres con receta) y **NIVEL** (1..12 del torre elegido). Por defecto, primer torre / primer nivel.
- Para el nivel elegido, mostrar **4 bloques de etapa** (mismos colores de la plantilla). Cada bloque: tabla `MATERIAL | UNIDAD | CANTIDAD | PRECIO U. | SUBTOTAL`, donde PRECIO U. = `precios[normProducto(m)].precio` (o "—" si sin precio) y SUBTOTAL = c × precio.
- Pie por etapa: total de la etapa (Q). Pie del nivel: total general.
- Responsive (celular): reutilizar estilos de tarjetas/colapso existentes.

Solo lectura para quien no tiene `receta.edit` (ver §6).

---

## 6. Editar la receta (con autorización)

**Quién edita directo (sin solicitud):** `receta.edit || users.manage` (admin tiene `*`). El gerente de proyectos debe tener `receta.edit` en su perfil. **Todos los demás (con `view.materiales`) mandan solicitud** para CUALQUIER cambio; nada se aplica hasta que admin/gerente lo autorice.

**Tres operaciones** (mismas para edición directa y para solicitud), sobre `recetaV2.niveles[levelId][etapaIdx]`:
- **Cambiar cantidad** de una línea existente (set `c`).
- **Agregar** material: nombre + unidad + cantidad → push de la línea; si `normProducto(material)` no está en `precios`, se crea su entrada con precio 0 (aparecerá en el catálogo §7 como "sin precio").
- **Quitar** una línea.

**Edición directa (admin/gerente):** cada operación abre un modal simple (standalone, no `prConfirm`) → guarda en `recetaV2` → `saveState()` + `forceUploadNow()` + toast. Los precios se editan en el catálogo (§7).

**Edición con solicitud (no autorizado, con `view.materiales`):**
- Las MISMAS acciones (cambiar/agregar/quitar) en vez de aplicar, **crean solicitud**: el modal recoge los datos de la operación (+ motivo opcional) → push a `p.solicitudesReceta` con `tipo` correspondiente y `estado:'PENDIENTE'` → `saveState()` + `forceUploadNow()` + toast "SOLICITUD ENVIADA". La receta NO cambia hasta autorizar.
- En MATERIALES aparece botón **"SOLICITUDES (n)"** solo si hay pendientes (patrón existente).
- `verSolicitudesReceta()` (modal `prConfirm`): caja ámbar con PENDIENTES (resumen + botones AUTORIZAR/RECHAZAR vía `data-action`/`data-id` en listener delegado) + caja gris con HISTORIAL.
- `autorizarReceta(id)` / `rechazarReceta(id)`: gate `can('receta.edit') || can('users.manage')`. Autorizar **aplica la operación según `tipo`** a `recetaV2` (misma lógica que la edición directa), marca `estado='APROBADA'`, `procesadoPor`, `fechaProceso`. Rechazar marca `RECHAZADA` + `motivoRechazo`. Ambos `saveState()` + `forceUploadNow()`.

**Espejo del patrón `solicitudesMover`** (L8712-8865): misma forma de objeto, mismas funciones ver/autorizar/rechazar, mismo listener delegado. Esto minimiza código nuevo y riesgo.

---

## 7. Catálogo de precios (producto → 1 proveedor + 1 precio)

Sub-sección **PRECIOS** dentro de RECETA (o pestaña hermana). Editable con `receta.edit || users.manage`.

- Tabla de los productos de `precios`: `PRODUCTO | UNIDAD | PROVEEDOR | PRECIO`.
- PROVEEDOR = dropdown desde `p.materiales.proveedores[].nombre` (+ opción texto libre). Al elegir, set `proveedorId` + `proveedor`.
- PRECIO = input numérico (Q). Guarda en `precios[producto]`, `saveState()`, `forceUploadNow()`.
- Indicador de cuántos productos faltan precio/proveedor (los que la app necesitará en Fase 3 para la OC automática).
- El precio se llena desde la plantilla en la carga; aquí se ajusta sin re-importar.

No se duplica el "catálogo maestro" de proveedores existente; PRECIOS es el mapa **producto→proveedor+precio** específico de este proyecto, que en Fase 3 alimentará la OC automática.

---

## 8. Permisos (resumen)

| Acción | Permiso |
|---|---|
| Ver receta y precios | `view.materiales` (implícito si tiene cualquier `materiales.*`/`receta.edit`) |
| Cargar receta (Excel), editar cantidades directo, editar precios, aprobar/rechazar solicitudes | `receta.edit` **o** `users.manage` |
| Solicitar cambio de cantidad | `view.materiales` sin `receta.edit` |

El gerente de proyectos = rol con `receta.edit`. Admin = `*`.

---

## 9. Persistencia y errores

- **Persistencia:** todo vía `saveState()` + `CloudSync` existente. Sin nuevos documentos Firestore; `recetaV2`, `precios` y `solicitudesReceta` viajan dentro del proyecto.
- **Errores de ingesta:** archivo que no es la plantilla, hojas faltantes, torres/niveles inexistentes, celdas no numéricas → mensajes claros en `prConfirm`/toast rojo; nunca aplicar a medias (validar → confirmar → aplicar todo o nada).
- **Concurrencia:** misma semántica que `solicitudesMover` (último en escribir gana; CloudSync con hashing por proyecto). Aceptable para el volumen real.

---

## 10. Pruebas (cómo verificar)

Como `index.html` es monolito sin suite, la verificación es funcional + scripts puntuales:

1. **Parser de plantilla (unidad):** función pura `parseRecetaWorkbook(aoaPorHoja)` → `{recetaV2, precios, avisos}`. Probar con la plantilla real: 24 niveles, 4 etapas, totales coinciden con `recipe.json` (ya validado, 456 totales T4), PRECIOS = 27 productos. Probar archivo basura → error.
2. **Mapeo torre/nivel:** `T4`→`t4`, `NIVEL 3`→`t4-n3`; nivel inexistente se ignora con aviso.
3. **Permisos:** con usuario sin `receta.edit`, toda acción (cambiar/agregar/quitar) genera solicitud y NO puede cargar/editar directo; con `receta.edit` o admin, cambia/agrega/quita directo.
4. **Solicitud (flujo, 3 tipos):** crear solicitud de cantidad/agregar/quitar → aparece "SOLICITUDES (1)" → autorizar aplica la operación correcta a `recetaV2` (cantidad cambia / línea agregada / línea quitada; 'agregar' de producto nuevo crea precio 0) → estado APROBADA en historial. Rechazar guarda motivo y no cambia la receta.
5. **Persistencia:** recargar la app (otro dispositivo) trae `recetaV2`/`precios`/solicitudes desde la nube.
6. **No-regresión:** la pantalla vieja de receta/PDF queda oculta pero no rompe `renderMateriales`; `validar JS` (errs=1) intacto; bump `sw.js` + chip de versión.

---

## 11. Fuera de alcance (Fase 2 y 3)

- **Fase 2:** seleccionar ETAPA + NIVEL → generar pedido automático desde `recetaV2` → enviar a compras (`pedidos[]`, `etapasPedidas`).
- **Fase 3:** compras genera **OC automática** agrupada por proveedor con `precios`, IVA y total → PDF listo, sin autorización de Erlin (`ordenes[]`, `compras.autorizar`).

---

## 12. Riesgos / decisiones

- **Agregar/quitar materiales:** INCLUIDO en Fase 1 (decisión del usuario), con el mismo orden de autorización: admin/gerente directo, los demás por solicitud.
- **Modelo paralelo:** `recetaV2` convive con la receta heredada. Riesgo bajo (UI vieja oculta); en Fase 2 se migra el flujo de pedidos a `recetaV2` y se puede retirar lo viejo.
- **Rol gerente:** requiere que el perfil del gerente tenga `receta.edit` asignado (tarea de configuración de usuarios, no de código).
