# Catálogo de precios + Órdenes de compra automáticas — Diseño

**Fecha:** 2026-06-10
**Proyecto:** PUNTO ROJO (PWA, `puntorojo.app`)
**Estado:** Diseño aprobado en brainstorming. Pendiente de revisión del usuario → plan → construcción por fases.

## Objetivo

Tener un **catálogo de precios editable** (producto × proveedor → precio) alimentado desde el Excel `DATOS_COMPRAS`, generar **órdenes de compra automáticas por proveedor con el precio más barato**, manejar **compras eventuales / fuera de catálogo**, y que **cambiar un precio fijo requiera autorización** (mínima manipulación por oficina), todo lo más automático posible.

## Lo que YA existe (reusar, no reconstruir)
- Catálogo producto×proveedor→precio: `state.proveedoresGlobales[i].productos[] = {nombre,unidad,precio,rendimiento}` (global). Accessor `_getProveedores()`.
- **OC automática por proveedor con precio más barato:** `generarOrdenCompra()` agrupa por proveedor + `findBestProviderForItem()` elige el más barato. OC en `p.materiales.ordenes[]` (por proyecto), autorización por `compras.autorizar`.
- Edición del catálogo: hoy solo admin (`users.manage`), **inline directo** (a cambiar por flujo de solicitud).
- SheetJS (`XLSX`) ya cargado. Helpers `matchKeyProducto()`/`normOcName()` para normalizar nombres.

## Decisiones aprobadas
| Tema | Decisión |
|---|---|
| Cambio de precio | **Oficina PROPONE, admin/finanzas AUTORIZA**. Nadie cambia un precio fijo directo (salvo admin / un nuevo permiso `precios.autorizar`); el resto manda **solicitud** con motivo → aprobar/rechazar. |
| Compras eventuales | Ítem **manual marcado 'EVENTUAL'** dentro de la OC (nombre+precio+proveedor) + botón **PROMOVER AL CATÁLOGO** (genera solicitud para agregarlo al catálogo fijo, con autorización). |
| Proveedores | Importar la hoja **PROVEEDOR** (N° cuenta, tipo cuenta, banco, método de pago) y enriquecer cada proveedor; mostrar/editar en su ficha. |
| Import | **Merge** (no reemplaza): crea/actualiza proveedores por nombre normalizado y productos por nombre normalizado; redondea precios a 2 decimales; las ~269 filas SIN proveedor → proveedor especial **"SIN PROVEEDOR FIJO / REFERENCIA"**. |

## Modelo de datos
```js
// state.proveedoresGlobales[i] — extendido:
{ id, nombre, contacto, telefono,
  productos: [ { nombre, unidad, precio, rendimiento } ],
  pago: { numeroCuenta, tipoCuenta, banco, metodoPago, tipoCompra } | undefined }

// Solicitudes de cambio/alta de precio (global, como las de pólizas):
state.solicitudesPrecios = [ { id, tipo:'CAMBIO'|'ALTA', proveedorId, proveedorNombre,
  productoNombre, unidad, precioActual, precioNuevo, motivo,
  solicitadoPor, solicitadoNombre, ts, estado:'PENDIENTE'|'AUTORIZADA'|'RECHAZADA' } ]

// OC item — campo nuevo:
items: [ { name, qty, precio, sourceKey, cat, eventual:true|undefined } ]
```

## Componentes / Fases

### Fase 1 — Importador del Excel de precios + datos bancarios de proveedores
1. **Parser puro `parsePreciosExcel(sheets)`** (bloque RECETA-PURE, testeable): de la hoja `PRECIOS_MATERIALES` (cols MATERIALES/PRECIOS/PROVEEDOR) → `{ items:[{material, precio(round2), proveedor}], sinProveedor:[…] }`; de la hoja `PROVEEDOR` → `{ proveedoresPago:[{nombre, numeroCuenta, tipoCuenta, banco}] }`. Detecta encabezados, ignora filas vacías.
2. **Importador `_importarPreciosExcel(file)`** + botón **"SUBIR EXCEL DE PRECIOS"** (admin) en MATERIALES → catálogo. Merge en `state.proveedoresGlobales`: por cada material→buscar/crear proveedor por nombre normalizado, agregar/actualizar producto por nombre normalizado (precio); filas sin proveedor → proveedor `prv-referencia` ("SIN PROVEEDOR FIJO / REFERENCIA"). Enriquecer `proveedor.pago` desde la hoja PROVEEDOR. Overlay de carga + resumen (cuántos creados/actualizados).
3. **Ficha de proveedor con datos de pago:** extender el modal `#modalAddProveedor` con N° cuenta, tipo cuenta, banco, método de pago, tipo de compra; cargarlos/guardarlos en `proveedor.pago`.

### Fase 2 — Autorización de cambios de precio (solicitud)
1. Nuevo permiso **`precios.autorizar`** ("Autorizar cambios de precio del catálogo", grupo EDICIÓN MATERIALES). Admin o `precios.autorizar` cambian directo; el resto NO.
2. Cambiar `updateCatProvProducto` (edición inline del precio) y `setPrecioRecetaProducto`: si admin/`precios.autorizar` → aplica directo. Si no → crea `solicitudPrecio` (tipo CAMBIO) con motivo + notifica al autorizador; NO aplica.
3. UI "SOLICITUDES DE PRECIO" (botón con contador en el catálogo, visible al autorizador) → modal con pendientes + AUTORIZAR / RECHAZAR. Al autorizar → aplica el precio nuevo al producto.
4. `_crearSolicitudPrecio`, `autorizarSolicitudPrecio`, `rechazarSolicitudPrecio` (patrón de las solicitudes de pólizas/SIN AMORT existentes).

### Fase 3 — Compras eventuales + promover al catálogo
1. En el modal de OC, marcar los ítems agregados manualmente (no del catálogo) como **`eventual:true`** (etiqueta visible "EVENTUAL"). Ya se permite precio/proveedor manual; solo agregar el flag + el rótulo.
2. Botón **PROMOVER AL CATÁLOGO** en un ítem eventual → crea `solicitudPrecio` (tipo ALTA) con nombre+unidad+precio+proveedor → al autorizar, agrega el producto al catálogo del proveedor.

## Permisos
- Importar precios / editar catálogo directo: **admin (`users.manage`) o `precios.autorizar`**.
- Proponer cambio de precio: cualquiera con acceso a materiales (genera solicitud).
- Autorizar solicitudes de precio: **`precios.autorizar`** o admin.
- Generar/autorizar OC: `compras.autorizar` (existente).

## Errores / casos borde
- Excel con columnas/hoja faltante → aviso claro, no rompe.
- Producto en 2 proveedores con precio distinto (17 casos reales) → se permite; la OC elige el más barato.
- Precio inválido (no numérico) → se omite con aviso.
- Proveedor del Excel que ya existe → merge (no duplica).
- Solicitud de precio pendiente duplicada para el mismo producto → bloquear segunda.

## Pruebas
- **Unitarias (puras):** `parsePreciosExcel` (filas con/sin proveedor, redondeo, hoja PROVEEDOR, encabezados). En `_recetatest/tests.js`.
- **Manuales:** importar el Excel real (verificar conteos), editar precio como no-admin → genera solicitud; autorizar → aplica; generar OC desde un pedido → agrupa por proveedor con el más barato; agregar ítem eventual + promover.

## Criterios de éxito
1. Importar `DATOS_COMPRAS` deja el catálogo cargado (precios + proveedores con datos de pago) y editable.
2. Cambiar un precio fijo sin ser admin/autorizador NO aplica directo: genera solicitud que el autorizador aprueba/rechaza.
3. Generar OC desde un pedido produce una OC por proveedor con el precio más barato auto-seleccionado.
4. Se pueden agregar compras eventuales en la OC y promover un eventual al catálogo (con autorización).
5. No rompe el sistema actual de pedidos/OC/inventario.

## Fuera de alcance (futuro)
- Generar OC sin partir de un pedido; órdenes de pago a proveedor desde los datos bancarios; histórico de cambios de precio.
