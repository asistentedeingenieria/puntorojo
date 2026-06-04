# Plan de implementación: App responsive universal

> **Para workers agénticos:** SUB-SKILL REQUERIDA: usar superpowers:executing-plans o subagent-driven-development para ejecutar tarea por tarea. Los pasos usan checkboxes `- [ ]`.

**Goal:** Que `index.html` se vea y funcione bien en celular, iPad y computadora — sin overflow horizontal, sin targets <44px, sin amontonamiento, sin desalineaciones.

**Arquitectura:** Sistema responsive unificado aplicado sobre el scaffolding existente (`.main` max-width, `.tbl-wrap` overflow, `.pr-resp-row`). Se llena el hueco de iPad (640–1024px), se agrega tipografía fluida + targets táctiles, y dos patrones de tabla (`.tabla-cards` apila en celular, `.tabla-scroll` scrollea). Aplicación peor-primero, una sección por versión, verificada en device real.

**Tech stack:** HTML + CSS (en `<style>` del `<head>`) + JS vanilla en un solo archivo. Service Worker para versionado de caché. Cloudflare Pages despliega en ~30s tras `git push`.

**Modelo de verificación (IMPORTANTE — este proyecto NO tiene test harness):**
La app es un PWA de un solo archivo sin framework de tests. La verificación de cada tarea es:
1. **Sintaxis JS:** el one-liner de `node` que valida cada bloque `<script>`.
2. **Despliegue:** bump de `CACHE_VERSION` en `sw.js` + chip de versión + `git push`.
3. **Visual en device real:** el usuario abre en iPad + iPhone + Android + compu y manda screenshot. Hasta que el usuario confirme con screenshot, la sección NO está "terminada" (regla de verification-before-completion).

El comando de sintaxis (se repite en cada tarea, lo llamamos `VERIFY-JS`):
```bash
cd "/c/Users/Antonio Caravantes/Downloads/puntorojo-work" && node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=h.match(/<script[^>]*>([\s\S]*?)<\/script>/g);let i=0,errs=0;for(const blk of m){i++;const code=blk.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');try{new Function(code)}catch(e){errs++;console.log('script #'+i+' err:',e.message.slice(0,160))}}console.log('errs='+errs)"
```
Nota: hay UN error preexistente en script #25 (no introducido por este trabajo). El criterio es "errs no aumenta de 1", no "errs=0".

---

## Task 1: Fundación responsive (infra device-independent)

Agrega la base que las demás tareas consumen. CSS puro, sin cambiar el render de ninguna sección todavía.

**Files:**
- Modify: `index.html` — bloque `<style>` del `<head>`, insertar después de la línea ~298 (tras la red de seguridad v424, antes de `.proj-switcher`).
- Modify: `sw.js` — `CACHE_VERSION`.
- Modify: `index.html` — chip de versión (`<span ...>v455</span>` → `v456`).

- [ ] **Step 1: Insertar el bloque de sistema responsive**

Insertar este CSS en el `<style>` (después de la línea ~298):

```css
/* ═══════════ v456: SISTEMA RESPONSIVE UNIFICADO ═══════════
   Breakpoints canónicos (las secciones migran a estos gradualmente):
     Micro   <= 380px   ·  Celular <= 639px
     iPad    640–1024px (NUEVO — antes caía al layout desktop apretado)
     Compu   >= 1025px
   El scaffolding previo (.main max-width:1400px, .tbl-wrap overflow-x,
   .pr-resp-row) se CONSERVA; esto lo complementa. */

/* — Tipografía fluida — */
:root{
  --fs-base: clamp(14px, 0.9vw + 12.4px, 15.5px);
  --fs-title: clamp(19px, 3.2vw + 9px, 24px);
}
html,body{ font-size: var(--fs-base); }
h1.view-title{ font-size: var(--fs-title); }

/* — iPad / tablet (640–1024): el hueco grande de hoy —
   Punto de enganche; cada sección agrega aquí sus ajustes al probarse en iPad. */
@media (min-width:640px) and (max-width:1024px){
  .main{ padding: 22px 20px; }
}

/* — Targets táctiles 44px solo en dispositivos touch — */
@media (hover: none) and (pointer: coarse){
  button, .btn, .mat-tab, select,
  input[type=text], input[type=number], input[type=search], input[type=tel],
  [role=button], .tab{
    min-height: 44px;
  }
}

/* — Patrón TABLA → TARJETAS en celular (.tabla-cards) —
   Requiere que cada <td> tenga data-label="ETIQUETA" (lo agregan las tareas 3-5). */
@media (max-width:639px){
  table.tabla-cards thead{ display:none; }
  table.tabla-cards, table.tabla-cards tbody,
  table.tabla-cards tr, table.tabla-cards td{ display:block; width:100%; }
  table.tabla-cards tr{
    border:1px solid var(--line); border-radius:8px;
    margin-bottom:10px; background:var(--white); overflow:hidden;
  }
  table.tabla-cards td{
    display:flex; justify-content:space-between; align-items:center; gap:12px;
    text-align:right; white-space:normal; border:none;
    border-bottom:1px solid var(--line-soft); padding:9px 13px;
  }
  table.tabla-cards td:last-child{ border-bottom:none; }
  table.tabla-cards td::before{
    content: attr(data-label);
    font-size:9px; letter-spacing:1px; text-transform:uppercase;
    color:var(--mute); font-weight:700; text-align:left; flex:0 0 40%;
  }
  table.tabla-cards td:empty{ display:none; }
}

/* — Patrón TABLA con scroll horizontal marcado (.tabla-scroll) —
   .tbl-wrap ya tiene overflow-x:auto; esto agrega pista visual de "deslizá". */
@media (max-width:639px){
  .tabla-scroll{ position:relative; }
  .tabla-scroll::after{
    content:'⟷ DESLIZÁ PARA VER TODO';
    display:block; position:sticky; left:0;
    font-size:8px; letter-spacing:1px; color:var(--mute); font-weight:700;
    text-align:center; padding:5px 8px; background:var(--cream);
    border-top:1px dashed var(--line);
  }
}
```

- [ ] **Step 2: Verificar sintaxis JS** — correr `VERIFY-JS`. Esperado: `errs=1` (el preexistente).

- [ ] **Step 3: Bump de versión**

`sw.js`: `CACHE_VERSION = 'v456-fundacion-responsive-breakpoint-iPad-tipografia-fluida-targets-44px'`
`index.html`: chip `v455` → `v456`.

- [ ] **Step 4: Commit + push**

```bash
git add index.html sw.js && git commit -m "v456 fundacion responsive: breakpoint iPad + tipografia fluida + targets 44px + patrones tabla" && git push origin main
```

- [ ] **Step 5: CHECKPOINT device real** — el usuario abre en iPad + iPhone + Android + compu y confirma que NADA se rompió (esta tarea casi no cambia lo visible; es infra). Si algo se descuadró por la tipografía fluida, ajustar los `clamp()` antes de seguir.

---

## Task 2: Planillas + Planilla OC (lo más roto)

La Planilla OC (v454) es la tabla más ancha — formato PDF con muchas columnas. Va con `.tabla-scroll` (conserva forma PDF). Las tablas de etapas/pagos de la vista Planillas se evalúan en device.

**Files:**
- Modify: `index.html` — `renderPlanillaOCs` (~línea 37157+): agregar clase `tabla-scroll` al wrapper de la tabla OC.
- Modify: `index.html` — CSS `@media (min-width:640px) and (max-width:1024px)` para ajustes de iPad en planillas.

- [ ] **Step 1: Marcar la tabla OC como scroll**

En `renderPlanillaOCs`, el wrapper actual es:
`'<div class="tbl-wrap" style="border:none;overflow-x:auto">...'`
Cambiar a:
`'<div class="tbl-wrap tabla-scroll" style="border:none;overflow-x:auto">...'`

- [ ] **Step 2: Verificar sintaxis** — `VERIFY-JS`. Esperado `errs=1`.

- [ ] **Step 3: Bump versión** — `v457-...` + chip.

- [ ] **Step 4: Commit + push.**

- [ ] **Step 5: CHECKPOINT device real** — usuario manda screenshot de PLANILLAS y PLANILLA OC en iPad + iPhone + Android. Aquí se finalizan los ajustes finos de iPad (padding, font de la tabla) contra lo que se vea. NO avanzar sin screenshot OK.

---

## Task 3: Resumen por Persona · Anticipos · Retenciones (tablas densas → tarjetas)

Estas tablas se vuelven tarjetas en celular (`.tabla-cards` + `data-label` por celda).

**Files:**
- Modify: `index.html` — funciones de render de estas 3 sub-pestañas (Resumen ~22792, Anticipos ~36100, Retenciones): agregar `tabla-cards` a las tablas y `data-label="..."` a cada `<td>`.

- [ ] **Step 1: Resumen por Persona** — agregar `class="tabla-cards"` a su tabla y `data-label` (NOMBRE, BRUTO, RETENCIÓN, DESCUENTOS, NETO) a cada celda. (Ya existe `.rpp-grid` responsive — evaluar si conviene `.tabla-cards` o mantener el grid actual; decidir contra el render real.)

- [ ] **Step 2: Anticipos (listado)** — `tabla-cards` + `data-label` (PERSONA, TIPO, MONTO, CUOTAS, SALDO).

- [ ] **Step 3: Retenciones** — `tabla-cards` + `data-label` (PERSONA, BRUTO, RETENCIÓN, ESTADO).

- [ ] **Step 4: Verificar sintaxis** — `VERIFY-JS`. Esperado `errs=1`.

- [ ] **Step 5: Bump versión** — `v458-...` + chip.

- [ ] **Step 6: Commit + push.**

- [ ] **Step 7: CHECKPOINT device real** — screenshot de las 3 sub-pestañas en celular (tarjetas) + iPad. Ajustar etiquetas/orden contra lo que se vea. NO avanzar sin OK.

---

## Task 4: Dashboard + grids de KPIs

Los grids de KPI (`.kpi-grid`) deben reacomodarse: 1 columna en celular, 2 en iPad, todas en compu.

**Files:**
- Modify: `index.html` — CSS de `.kpi-grid` / `.kpi` con los breakpoints canónicos.

- [ ] **Step 1: Responsive de KPI grid**

Agregar/ajustar:
```css
.kpi-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; }
@media (min-width:640px) and (max-width:1024px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:639px){ .kpi-grid{ grid-template-columns:1fr; gap:10px; } }
```
(Verificar el nombre real de la clase del grid contra el markup antes de escribir.)

- [ ] **Step 2: Verificar sintaxis** — `VERIFY-JS`. Esperado `errs=1`.

- [ ] **Step 3: Bump versión** — `v459-...` + chip.

- [ ] **Step 4: Commit + push.**

- [ ] **Step 5: CHECKPOINT device real** — screenshot de Dashboard en los 4 devices.

---

## Task 5: Materiales · Personal · Cobro · Avance Físico

Tablas/grids de estas 4 vistas con el patrón apropiado (`.tabla-cards` donde aplique; grids con breakpoints canónicos).

**Files:**
- Modify: `index.html` — renders y CSS de las vistas `view-materiales`, `view-personal`, `view-cobro`, `view-avance`.

- [ ] **Step 1: Materiales** — tabla de inventario (4 col: MATERIAL/UNIDAD/STOCK/✕, ya simplificada en v452) → `tabla-cards` + `data-label`.

- [ ] **Step 2: Personal · Cobro · Avance** — aplicar breakpoints canónicos a sus grids/tablas; los ajustes finos se finalizan contra device.

- [ ] **Step 3: Verificar sintaxis** — `VERIFY-JS`. Esperado `errs=1`.

- [ ] **Step 4: Bump versión** — `v460-...` + chip.

- [ ] **Step 5: Commit + push.**

- [ ] **Step 6: CHECKPOINT device real** — screenshot de las 4 vistas en celular + iPad.

---

## Task 6: Modales + navegación

Modales de ancho fijo deben caber en celular; los tabs superiores y sub-tabs deben ser táctiles y no cortarse.

**Files:**
- Modify: `index.html` — CSS de `.modal` / `.modal-bg`, `.mat-tabs` / `.mat-tab`, tabs superiores de navegación.

- [ ] **Step 1: Modales fluidos**

```css
@media (max-width:639px){
  .modal{ width:94vw!important; max-width:94vw!important; max-height:90vh; margin:5vh auto; }
}
```
(Verificar nombre real de la clase de modal contra el markup.)

- [ ] **Step 2: Tabs táctiles con scroll horizontal**

```css
@media (max-width:1024px){
  .mat-tabs{ overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; }
  .mat-tab{ white-space:nowrap; flex:0 0 auto; }
}
```

- [ ] **Step 3: Verificar sintaxis** — `VERIFY-JS`. Esperado `errs=1`.

- [ ] **Step 4: Bump versión** — `v461-...` + chip.

- [ ] **Step 5: Commit + push.**

- [ ] **Step 6: CHECKPOINT device real** — abrir varios modales y navegar tabs en celular + iPad.

---

## Task 7: Limpieza — borrar archivos muertos

Confirmado que `puntorojo.html` y `mobile.html` no son navegados por nadie. Borrarlos + limpiar el fallback del SW que los referencia.

**Files:**
- Delete: `puntorojo.html`, `mobile.html`
- Modify: `sw.js` — quitar `'./puntorojo.html'` y `'./mobile.html'` de `CORE_ASSETS` y del fallback offline (líneas ~17-18 y ~105-109).

- [ ] **Step 1: Quitar referencias en sw.js**

En `CORE_ASSETS` borrar las líneas `'./puntorojo.html',` y `'./mobile.html',`.
En el fallback de `fetch` (navigate), simplificar:
```js
// antes: const isMobileUrl = ...; if (isMobileUrl) return caches.match('./mobile.html')...
// después:
return caches.match('./index.html');
```
(Reemplazar todo el bloque de fallback que distinguía mobile/desktop por un único `caches.match('./index.html')`.)

- [ ] **Step 2: Borrar los archivos**

```bash
git rm puntorojo.html mobile.html
```

- [ ] **Step 3: Verificar sintaxis** — `VERIFY-JS` (solo index.html ya) + `node --check sw.js`. Esperado: `errs=1` y sw.js OK.

- [ ] **Step 4: Bump versión** — `v462-borrar-archivos-muertos-puntorojo-mobile` + chip en index.html.

- [ ] **Step 5: Commit + push.**

```bash
git add -A && git commit -m "v462 borrar archivos muertos puntorojo.html + mobile.html + limpiar fallback SW" && git push origin main
```

- [ ] **Step 6: CHECKPOINT** — usuario confirma que `puntorojo.app` carga normal (online) y que offline también (el SW ahora cae a index.html). Probar en 1 device.

---

## Self-review (cobertura vs spec)

| Requisito del spec | Tarea |
|---|---|
| Breakpoints canónicos + iPad | Task 1 |
| Contenedor máx (ya existe 1400px) | Task 1 (conservado, no se cambia a 1280 para no alterar desktop sin pedido) |
| Tipografía fluida | Task 1 |
| Targets 44px | Task 1 |
| `.tabla-cards` / `.tabla-scroll` | Task 1 (def) + Tasks 2,3,5 (aplicación) |
| Planillas + OC | Task 2 |
| Resumen/Anticipos/Retenciones | Task 3 |
| Dashboard/KPIs | Task 4 |
| Materiales/Personal/Cobro/Avance | Task 5 |
| Modales + nav | Task 6 |
| Borrar archivos muertos + SW | Task 7 |
| Verificación device-real por sección | Checkpoint en cada tarea |

**Desviación documentada:** el spec proponía contenedor 1280px; el código YA tiene `.main` a 1400px centrado, que cumple el objetivo ("no estirar de borde a borde"). Se conserva 1400 para no alterar el layout de escritorio sin que el usuario lo haya pedido.

**Nota sobre granularidad:** Tasks 2–6 definen el patrón y los offenders conocidos, pero el ajuste fino de CSS por elemento se finaliza contra el screenshot del usuario en device real — porque el render exacto en iPad/iOS no se puede predecir sin verlo (es la naturaleza del trabajo responsive y el loop explícito del spec). No es placeholder: cada tarea tiene su archivo, su cambio concreto de arranque, su verificación y su checkpoint.
