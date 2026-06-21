# Flujo de Anticipos (solicitud → cotización → autorización → alta automática)

**Fecha:** 2026-06-19
**Estado:** Aprobado por el user (Antonio), listo para plan/implementación.

## Objetivo

Digitalizar dentro de la app el proceso de anticipos que hoy se hace por correo:
el supervisor pide un préstamo → la persona de compras sube la cotización →
el gerente (Antonio) revisa la cotización y autoriza/rechaza → al autorizar, el
anticipo se crea automáticamente en el catálogo y queda listo para descontarse.

## Roles y permisos

Dos permisos NUEVOS (asignables en USUARIOS, junto a los demás `PERMS`):
- `anticipos.solicitar` — "Solicitar anticipos" → supervisores. Crean la solicitud.
- `anticipos.cotizar` — "Cotizar anticipos (Compras)" → persona de compras. Suben la cotización.

Autoriza / rechaza la cotización: el **gerente/admin** con los permisos existentes
`planilla.authorize` || `users.manage` (no se crea permiso nuevo para esto).

"El flujo de anticipos" (para notificar a TODOS) = titulares de cualquiera de:
`anticipos.solicitar`, `anticipos.cotizar`, `planilla.authorize`, `users.manage`.

## Máquina de estados

Objeto `solicitud` con `estado`:

1. **`pendiente_cotizacion`** — el supervisor creó la solicitud. Se notifica a TODOS
   los del flujo. La persona de compras debe subir la cotización. El **creador**
   (supervisor) puede **CANCELAR** la suya en este estado (o en `pendiente_autorizacion`)
   si se confundió → `cancelada`.
2. **`pendiente_autorizacion`** — compras subió la cotización (proveedor + monto +
   archivo). Se notifica al gerente/admin.
3. **`autorizada`** — el gerente autorizó → **se crea el anticipo automáticamente**
   en `anticiposGlobales` con los datos de la solicitud + cotización. Se notifica a
   compras y al supervisor.
4. **`rechazada`** — solo el gerente/admin puede rechazar (en `pendiente_autorizacion`),
   con motivo. Se notifica al solicitante y a compras.
5. **`cancelada`** — el creador la canceló antes de autorizar.

Transiciones permitidas:
- crear → `pendiente_cotizacion` (perm `anticipos.solicitar`).
- `pendiente_cotizacion` → `pendiente_autorizacion` (perm `anticipos.cotizar`, al subir cotización).
- `pendiente_cotizacion`|`pendiente_autorizacion` → `cancelada` (solo el creador).
- `pendiente_autorizacion` → `autorizada` | `rechazada` (gerente/admin).

## Datos

`solicitud = {`
- `id` ('solant-…'), `_ts`, `estado`,
- `projectId`, `projectName`,
- `colaboradorId`, `colaboradorNombre` (para quién es el préstamo),
- `subtipo` (tipo de anticipo: préstamo/equipo/herramienta/etc., reusa los del catálogo),
- `descripcion` (qué necesita),
- `montoEstimado` (opcional, lo pone el supervisor),
- `solicitadoPor` / `solicitadoPorNombre` / `solicitadoEn`,
- **cotización** (la llena compras): `cotProveedor`, `cotMonto`, `cotArchivoUrl`,
  `cotArchivoNombre`, `cotNota`, `cotizadoPor` / `cotizadoEn`,
- **decisión** (la llena el gerente): `decididoPor`, `decididoEn`, `motivoRechazo`,
  `cuotas` (confirmadas/ajustadas al autorizar), `anticipoIdCreado`.
`}`

Almacenado en `state.solicitudesAnticipo` (array global).

## Alta automática del anticipo (al autorizar)

Al autorizar, crear un anticipo en `state.anticiposGlobales` que **matchee el modelo
actual del catálogo** (mismo shape que produce el alta manual `_guardarDesdeCaptura`):
- `colaboradorNombre`/`colaboradorId` ← de la solicitud,
- `montoTotal` ← `cotMonto` (monto de la cotización),
- `cantidadCuotas` ← `cuotas` (el gerente confirma/ajusta; propuesta auto por monto
  como ya hace el catálogo, cap 6 — ver v416),
- `subtipo` ← de la solicitud,
- `desc` ← concepto + proveedor,
- `cuotasPagadasInicial: 0`,
- `_ts: Date.now()` (para el union-merge de dinero, v752),
- `origenSolicitud: <solicitud.id>` (trazabilidad).
Queda listo para que el motor de auto-descuentos (v771) lo aplique en planilla.

## UI

Nueva sub-pestaña **"SOLICITUDES"** en ANTICIPOS (5ta, junto a RESUMEN / LISTADO /
DESCUENTOS / CONTROL). Contenido según el rol del usuario:
- Botón **"+ SOLICITAR ANTICIPO"** (visible con `anticipos.solicitar`) → modal de
  alta (colaborador, subtipo, descripción, monto estimado opcional).
- Lista de solicitudes (las relevantes para el usuario), cada una con su estado y el
  botón de acción del paso actual:
  - Compras (`anticipos.cotizar`): en `pendiente_cotizacion` → botón **SUBIR COTIZACIÓN**
    (proveedor, monto, archivo foto/PDF, nota).
  - Gerente/admin: en `pendiente_autorizacion` → ver la cotización (incl. archivo) +
    **AUTORIZAR** (confirmar cuotas) / **RECHAZAR** (motivo).
  - Creador: en estados pre-autorización → **CANCELAR**.
- Badge/contador de pendientes por rol; banner en la pestaña.

## Notificaciones

Sistema B (`prAddNotif`, campanita — ver [[notificaciones-dos-sistemas]]):
- Al crear: `toPerms` = los 4 del flujo (a TODOS).
- Al subir cotización: `toPerms` `planilla.authorize`+`users.manage` (al gerente).
- Al autorizar/rechazar: `toEmails` el solicitante + `toPerms` `anticipos.cotizar` (compras).

## Sync

`state.solicitudesAnticipo` se une en `applyRemote` con `_mergeById` (id + `_ts`),
igual que `solicitudesPagoEtapa` (v775) y las otras solicitudes (v752). Cada mutación
(crear/cotizar/autorizar/rechazar/cancelar) reescribe `_ts` y hace `forceUploadNow`.
El archivo de cotización va a Firebase Storage (`anticipos-cotizaciones/<id>`), se
guarda solo la URL (no base64).

## Reúso

- Patrón solicitud→autorización: espejo del **candado del instalador** (v775,
  `solicitudesPagoEtapa`, `autorizar/rechazar...`, banner+modal).
- Alta del anticipo: el helper de creación del catálogo (`_guardarDesdeCaptura` / el
  shape de `anticiposGlobales`).
- Subida de archivo: patrón `ref.put(file) + getDownloadURL()` (como fotos/PDFs).

## Testing

Lógica pura testeable (`.cjs`): transiciones de estado (`_anticipoSolicTransicion`
o validadores: quién puede hacer qué en cada estado) + el armado del objeto anticipo
desde la solicitud+cotización. Tests estructurales: perms nuevos, merge en applyRemote,
notificaciones por campanita.

## Fuera de alcance (YAGNI)

- Historial/auditoría detallada por solicitud (más allá de los campos de decisión).
- Editar una cotización ya autorizada (si se equivocaron, se rechaza y se rehace).
- Integración con OCs de materiales (es otro flujo).
