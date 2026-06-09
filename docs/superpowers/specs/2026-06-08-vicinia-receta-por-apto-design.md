# VICINIA DEL CARMEN · Receta por apto (diseño)

**Proyecto:** PUNTO ROJO (`index.html`). Aplica el modelo por-apto (v3, ESSENZA v516) al proyecto `vicinia-dc` (Torre A + Torre B).
**Fecha:** 2026-06-08
**Decisiones del usuario:** ambas torres (A y B); nombres de material iguales a ESSENZA (+ 6 nuevos); Vicinia ya está creada en la app.

---

## 1. Datos de origen (PDF `RECETA DE MATERIAL.pdf`)

8 páginas, "TORRES A / B", por apto (columnas por espacio), individuales, 4 etapas. Niveles en **rangos**:

| Página PDF | Niveles app | Aptos PDF |
|---|---|---|
| SÓTANO 1 (solo A) | `va-s1` | SOTANO 01 |
| NIVEL 1 amenidades (solo A) | `va-n1` | LOBBY, LOCAL COMERCIAL 01, GIMNASIO, GAME ZONE, SALÓN SOCIAL, COWORKING, CINEMA |
| NIVEL 2 al 5 | n2–n5 (A y B) | 01–08 (+PASILLO) |
| NIVEL 6 | n6 | 01–06 (+PASILLO) |
| NIVEL 7 al 15 | n7–n15 | 01–06 (+PASILLO) |
| NIVEL 16 | n16 | 01–04 (+PASILLO) |
| NIVEL 17 al 21 | n17–n21 | 01–04 (+PASILLO) |
| NIVEL 22 | n22 | 01–02 PH (+PASILLO) |

Etapas por orden de renglón (igual a ESSENZA): bare `Plancha ultra` abre E2; `Angular` abre E3; bare `Plancha ultra` (en E3) abre E4.

## 2. Estructura app (seed `mkViciniaCarmen`)

- Torres: `va` ("TORRE A"), `vb` ("TORRE B"). Ids de nivel: `va-s1`, `va-n1`, `va-n2`…`va-n22`, `vb-n2`…`vb-n22`.
- Nombres de apto (los que deben ir como encabezado de columna en la plantilla, para que mapeen exacto):
  - s1: `Sótano 1`. n1: `Lobby Recepción`, `Locales comerciales`, `Gimnasio`, `Game zone`, `Área social (salón social)`, `Coworking`, `Cinema`.
  - n2–n21: `Pasillos` + `Apartamento <n><0i>` (ej. `Apartamento 201`).
  - n22: `Pasillos`, `Penthouse 1`, `Penthouse 2`.

## 3. Cambio de código (importador, retrocompatible)

Generalizar `parseRecetaPorApto` + el gate `tieneApto` de `importarRecetaExcel` para **resolver la hoja por el ID de nivel** (case-insensitive) contra `towers[].levels[].id`. Fallback: lógica `T<n>-N<n>` existente.
- ESSENZA sigue: hoja `T4-N1` → su nombre en minúscula `t4-n1` ya es el id de nivel.
- Vicinia: hoja `va-n2` → nivel `va-n2`. Sin inventar números de torre.

## 4. Generación de la plantilla (Claude, una vez)

`genvic.js`: parsea el PDF por página → expande rangos a niveles individuales → por (torre, nivel) una hoja **nombrada por el id de nivel** → columnas = **nombres exactos de apto de la app** (mapeo PDF→app por significado) → materiales renombrados (mapa ESSENZA + 6 nuevos) → individuales → etapas tal cual el PDF.
- Torre A: s1 + n1 + n2…n22 (23 hojas). Torre B: n2…n22 (21 hojas). + LEEME.
- Torre B usa los mismos valores por apto que A para n2–n22 (receta A/B compartida).

**Mapeo PDF apto → app apto:** `PASILLO→Pasillos`; `SOTANO 01→Sótano 1`; `0X PH→Penthouse X`; `0X (TIPO …)→Apartamento <nivel><0X>`; amenidades por diccionario (LOBBY→Lobby Recepción, LOCAL COMERCIAL→Locales comerciales, GIMNASIO→Gimnasio, GAME ZONE→Game zone, SALÓN SOCIAL→Área social (salón social), COWORKING→Coworking, CINEMA→Cinema).

**6 materiales nuevos:** Canal 3⅝→`CANAL DE 3⅝" X 10' (0.35) CAL. 26`; Poste 3⅝→`POSTE DE 3⅝" X 10' (0.35) CAL. 26`; Madera 12x1x8→`REGLA MADERA TRATADA 1" X 12" X 8'`; Reborde Z→`REBORDE Z ½" X 10'`; Reborde Ciza→`REBORDE CIZA 1" X ½"`; Registro plástico→`REGISTRO PLÁSTICO 14" X 14"`.

## 5. Pruebas
- Pura (Node): `parseRecetaPorApto` resuelve hoja por id de nivel (`va-n2`) → nivel/torre correctos; ESSENZA `T4-N1` sigue resolviendo. `errs=1`.
- Validación plantilla (Excel COM): abre; columnas = nombres de apto app; totales = suma; etapas correctas; 6 nuevos presentes.
- En la app: cargar la plantilla en proyecto VICINIA → receta por apto poblada, mapeo sin avisos.

## 6. Fuera de alcance
VICINIA LAS AMÉRICAS (otra estructura), Fase 2/3 (pedidos/OC/rendimiento). Precios: catálogo aparte por proyecto.
