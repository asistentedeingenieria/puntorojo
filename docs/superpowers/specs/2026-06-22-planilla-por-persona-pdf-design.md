# Planilla por persona (PDF) — nueva sub-pestaña en PLANILLAS

**Fecha:** 2026-06-22
**Estado:** Aprobado por el user (Antonio). Orden de build: #1.

## Objetivo

Una nueva sub-pestaña en PLANILLAS que, para la quincena generada del **proyecto
activo**, entregue **un PDF por persona** con su planilla individual (pagos por
etapa + retención + descuentos + neto), en el formato que la app ya usa. Si una
persona tiene planilla en dos proyectos, su PDF de cada proyecto sale en la pestaña
de ese proyecto (alcance = proyecto activo, decidido en brainstorming).

## Decisiones (aprobadas)

1. **Alcance:** solo el **proyecto activo**.
2. **Qué quincena:** **automáticamente la última planilla armada**; si hay varias
   quincenas guardadas, un **selector chico** para elegir otra (default: la más reciente).
3. **Formato del PDF por persona:** reusa el comprobante de planilla que la app ya
   genera (mismo look), pero un PDF independiente por persona.
4. **Acciones:** por cada persona, **VER / DESCARGAR PDF**; y un **DESCARGAR TODAS**.
5. **Android:** el PDF se muestra con el **visor in-app** (v782, `_pdfDescargar`/`_pdfAbrirVisor`);
   en escritorio/Chrome se descarga normal.

## Datos

Las planillas armadas viven en `p.planilla.planillasArmadas[]` (por proyecto). Cada
una tiene su quincena (fecha sábado), sus `pagosIds` y las personas que recibieron
pago. La pestaña:
- Toma la planilla armada seleccionada (default: la última por fecha).
- Lista las personas de esa planilla (las que recibieron pago).
- Para cada persona, arma su PDF individual a partir de los pagos/etapas/retención/
  descuentos de esa persona en esa planilla.

## Componentes

1. **Sub-pestaña UI** (en el render de PLANILLAS): botón/tab nuevo + panel con el
   selector de quincena, la lista de personas y los botones VER/DESCARGAR (por persona)
   + DESCARGAR TODAS.
2. **`_planillaPersonas(planillaArmada)`** (puro, testeable): devuelve la lista de
   personas de esa planilla con su data (nombre, pagos, retención, descuentos, neto).
3. **`_planillaPdfPersona(persona, planillaArmada, proyecto)`**: arma el jsPDF de UNA
   persona reusando el dibujo de planilla existente (refactor del bloque por-trabajador).
   Sale por `_pdfDescargar` (descarga en escritorio, visor en Android).

## Manejo de errores / bordes

- Proyecto sin planillas armadas → mensaje "No hay planillas generadas todavía."
- Planilla sin personas → "Esta planilla no tiene personas con pago."
- jsPDF no cargó → el toast existente.

## Testing

- **Puro (.cjs):** `_planillaPersonas` agrupa/extrae bien (una entrada por persona con
  su neto); el selector default es la planilla más reciente por fecha.
- **Estructural:** existe la sub-pestaña y los botones; `_planillaPdfPersona` existe.
- El render del PDF se verifica visualmente (el user, en la app).

## Fuera de alcance (YAGNI)

- Cruce de todos los proyectos en una sola lista (queda en proyecto activo).
- Enviar los PDFs por correo/WhatsApp automáticamente (eso es el tema del plugin nativo).
