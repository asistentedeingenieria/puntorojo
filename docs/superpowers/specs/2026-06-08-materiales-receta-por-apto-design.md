# MATERIALES · Receta por apto (diseño)

**Proyecto:** PUNTO ROJO (`index.html` monolito). Evoluciona la receta de Fase 1 (v514) + precios desde catálogo (v515).
**Fecha:** 2026-06-08
**Decisiones del usuario (brainstorming):** el por-apto es el **dato base** y el total del nivel se calcula (suma de aptos); vista por **chips de apto**; editar el por-apto = **igual que la receta** (admin/gerente directo, los demás por solicitud); cantidades en **unidades individuales/de consumo** (la unidad de compra y su conversión van en el precio/OC → Fase 3).

---

## 1. Objetivo

La receta guarda la cantidad **por apto** de cada material; el total del nivel = suma de los aptos. Se ve y edita por apto en la app (chips). Reemplaza el modelo "total por nivel" de las fases previas.

---

## 2. Contexto (qué existe)

- **Hoy** (`recetaV2`): `niveles[levelId][etapaIdx] = [{ m, u, c }]` con `c` = total por nivel. La vista (`renderRecetaV2`) y `aplicarOperacionReceta` usan `c`. El precio sale del catálogo (`precioDeProductoReceta`).
- **Aptos del proyecto:** `p.towers[].levels[].aptos[] = { id, name }` con nombres `APARTAMENTO 101`, `CINE`, `PASILLO`, `SALÓN DE JÓVENES`, `AZOTEA`.
- **Datos por apto:** extraídos del PDF original (columnas por apto: `101…`, `CINE`/`SALÓN`, `PASILLO`), **individuales**, enteros que suman el total. Verificado.

---

## 3. Modelo de datos (cambio)

```js
recetaV2.version = 3;
recetaV2.niveles[levelId][etapaIdx] = [
  { m: 'CANAL DE 2 ½" X 10\' (0.35) CAL. 26', u: 'U', aptos: { '<aptoId>': 26, '<aptoId>': 24, … } }
];
```
- **Se elimina el campo `c`.** El total de un material en un nivel = `sum(values(aptos))`.
- Helper nuevo: `totalMaterialNivel(item) = Object.values(item.aptos).reduce(...)`.
- **Migración:** si un proyecto tiene `recetaV2.version < 3` (con `c` y sin `aptos`), la receta queda "vieja" — se muestra un aviso "recargá la receta por apto" (no se intenta repartir `c` automáticamente). Re-importar reemplaza con el modelo por apto.

---

## 4. Plantilla por apto (nueva) + generación

- **Formato:** **una hoja por nivel** (`T4-N1` … `T3-N12`), columnas `ETAPA | MATERIAL | UNIDAD | <apto1> <apto2> … | TOTAL`. Espejo del PDF (verificable por nivel). El `TOTAL` es informativo (la app recalcula = suma).
- **Generación (una vez, la hace Claude):** combino el por-apto del PDF (individuales) con los **nombres renombrados** del Excel del usuario (mapeo **por posición**, verificado por los totales de los materiales que NO cambió de unidad) y **normalizo a individuales** la inconsistencia T4/T3. Entrego el archivo; el usuario lo sube. *(Editar después es en la app; el Excel es para la carga.)*
- **Nombres (DECIDIDO):** los materiales `CIENTO DE…` se **renombran a su unidad de consumo** quitando el prefijo `CIENTO DE ` y con cantidad **individual**:
  - `CIENTO DE TORNILLO DE ½" PUNTA FINA` → `TORNILLO DE ½" PUNTA FINA` (1600)
  - `CIENTO DE TORNILLO DE 1" PUNTA FINA` → `TORNILLO DE 1" PUNTA FINA` (13600)
  - `CIENTO DE TACHUELON DE 1"` → `TACHUELON DE 1"` (420)
  
  `CIENTO DE TORNILLO` será el **producto de compra (rinde 100)** en el catálogo en Fase 3 (la OC convierte). El resto de los nombres del usuario se preservan tal cual.

---

## 5. Importar (reescritura del parser)

Por cada hoja `T<t>-N<n>`:
- Torre + nivel del nombre de la hoja → `levelId` (resuelto por nombre, robusto, como hoy).
- Fila 1 = encabezados: detectar columnas de apto (las que no son ETAPA/MATERIAL/UNIDAD/TOTAL).
- Por fila de material: `etapaIdx` de la columna ETAPA; por cada columna de apto con valor numérico, `aptos[aptoId] = valor` (0/ vacío se omite).
- **Mapeo apto-label → aptoId** (ver §6).
- Validaciones (no bloquean, se listan): niveles/aptos de la plantilla sin equivalente en el proyecto; materiales sin precio (informativo).

---

## 6. Mapeo de aptos (label de la plantilla → apto del proyecto)

`resolveAptoId(level, label)`:
1. Si `label` es numérico (`101`): buscar el apto del nivel cuyo nombre contiene ese número (`APARTAMENTO 101`).
2. Si es texto (`CINE`, `PASILLO`, `SALÓN`, `AZOTEA`): buscar por substring del nombre (insensible a may/acentos).
3. Sin match → se omite ese apto con aviso.

(El `SALÓN DE JÓVENES` del PDF se normaliza a un solo label al generar la plantilla.)

---

## 7. Vista (chips de apto)

`renderRecetaV2` pasa a tener un tercer nivel de chips:
- **TORRE** → **NIVEL** → **APTO** (`101`, `102`, …, `CINE`/`SALÓN`, `PASILLO`, **+ TOTAL**).
- **Apto seleccionado:** los 4 bloques de etapa muestran sus materiales con la **cantidad de ese apto** (editable según permiso). P.U./subtotal desde el catálogo (precio × cantidad del apto).
- **TOTAL:** muestra, por material, la **suma de aptos** (solo lectura) + subtotales/total del nivel. Es la vista por defecto.

---

## 8. Editar (igual que la receta)

`aplicarOperacionReceta` se extiende para operar por apto:
- **cantidad**: cambia `aptos[aptoId]` de un material (requiere `aptoId` en la op).
- **agregar**: agrega material a la etapa con `aptos` = {} (o el apto actual con su valor); aplica al nivel.
- **quitar**: elimina el material de la etapa (todos sus aptos).
- Admin/gerente directo; los demás → **solicitud** (`solicitudesReceta` extendida con `aptoId` y el resumen del apto). `autorizarReceta` aplica con la op por apto.

---

## 9. Precios / OC

- El precio sigue siendo **por producto** (catálogo), sin cambio.
- La OC (Fase 3) usará el **total del nivel = suma de aptos** y aplicará el **rendimiento** (unidad de compra) en ese momento.

---

## 10. Permisos y persistencia
- Editar por apto: `receta.edit || users.manage` directo; resto por solicitud (`view.materiales`).
- Cargar plantilla: `receta.edit || users.manage`.
- Todo persiste vía `saveState()` + `CloudSync.forceUploadNow()`.

---

## 11. Pruebas
1. **Puras (Node):** `parseRecetaPorApto` (hoja por nivel → `aptos` por material); `totalMaterialNivel` (suma); `resolveAptoId` (número y especiales). Con datos reales: 24 niveles, totales = suma de aptos = totales del PDF.
2. **Import:** subir la plantilla por apto → `recetaV2.version=3`, `aptos` poblados; aviso de aptos/niveles sin match si aplica.
3. **Vista:** TOTAL muestra sumas; elegir apto muestra/edita sus cantidades; cambiar apto recalcula total.
4. **Editar/solicitud:** admin cambia un apto y el total se reajusta; no-admin manda solicitud; autorizar aplica al apto correcto.
5. **No-regresión:** `errs=1`; precios/catálogo siguen igual.

---

## 12. Fuera de alcance
- **Fase 2** (pedir por etapa+nivel → compras) y **Fase 3** (OC automática + **rendimiento/unidad de compra** = donde "ciento/caja/rollo" convierte el total individual a unidades de compra).
- Renombrar materiales en la app (se hace en el Excel / re-carga).

---

## 13. Riesgos / decisiones
- **Nombres `CIENTO DE…`:** DECIDIDO — se renombran a consumo (quitar `CIENTO DE `), cantidad individual; el `ciento` pasa a ser unidad de compra con rendimiento en el catálogo (Fase 3).
- **Modelo nuevo (v3) vs proyectos con v2:** se pide recarga; no hay reparto automático de `c` a aptos.
- **Volumen:** ~24 niveles × ~38 materiales × ~8 aptos ≈ 7.000 datos; va dentro del proyecto (texto), sincroniza normal.
