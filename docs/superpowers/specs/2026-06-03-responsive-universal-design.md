# Diseño: App responsive universal (todos los devices)

**Fecha:** 2026-06-03
**Autor:** Antonio Caravantes + Claude
**Estado:** Aprobado para planificar

## Objetivo

Que la app PUNTO ROJO se vea y funcione bien en **celular, tablet/iPad y
computadora**, eliminando los 4 síntomas confirmados por el usuario:

1. Contenido que se corta / scroll horizontal involuntario
2. Letra y botones demasiado chicos para el dedo
3. Elementos amontonados / encimados
4. Aspecto descuidado ("feo") en ciertos tamaños

## Contexto y hallazgos (verificados)

- **`index.html` (38,099 líneas) es el ÚNICO archivo vivo** servido a todos
  los devices en `puntorojo.app`. Confirmado: comentario `v426` ("mobile.html
  retirado, index.html sirve para TODOS"), no hay `_redirects`, Cloudflare
  Pages sirve `index.html` en `/`, y NINGÚN archivo enlaza a `puntorojo.html`
  ni `mobile.html` como destino de navegación.
- `puntorojo.html` (41,475 líneas) y `mobile.html` (27,288 líneas) son
  **legacy/muertos** — solo aparecen en el fallback offline del Service Worker.
- `index.html` ya tiene **59 media queries** pero con **9 breakpoints ad-hoc**
  (380/420/480/560/600/640/720/900/1100px) y **sin manejo propio de iPad**
  (768px portrait cae al layout de escritorio apretado).

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Enfoque | **A** — sistema unificado aplicado peor-primero |
| Tablas en celular | **Híbrido**: Planilla OC = scroll horizontal (mantiene forma PDF); demás tablas = tarjetas apiladas |
| Archivos muertos | **Borrar** `puntorojo.html` + `mobile.html` + limpiar fallback del SW |
| Devices objetivo | Todos: iPhone, Android, iPad/tablet, computadora |
| Verificación | Usuario prueba en devices reales y manda screenshot por sección |

## Sistema responsive

### Breakpoints canónicos (reemplazan los 9 ad-hoc)

```css
/* Micro  */ @media (max-width: 380px)                          /* iPhone SE */
/* Celular*/ @media (max-width: 639px)
/* Tablet */ @media (min-width: 640px) and (max-width: 1024px)  /* iPad — NUEVO */
/* Compu  */ @media (min-width: 1025px)
```

Migración gradual: cada sección que se toque adopta estos breakpoints. No se
hace un find-replace masivo (riesgoso); se migra sección por sección.

### Contenedor y espaciado

- Ancho máximo del contenido principal: ~1280px, centrado, para que en
  monitores grandes no se estire de borde a borde.
- Padding fluido: `clamp(12px, 4vw, 32px)`.
- Conservar el manejo de safe-area (notch iPhone) que ya funciona — NO tocar.

### Tipografía fluida

- Texto base con `clamp()` para que escale solo y sea legible en celular.
- Títulos, KPIs y montos con su propia escala fluida.

### Targets táctiles

- `min-height: 44px` en botones, tabs, inputs y filas clickeables en touch.
- Espaciado mínimo entre targets para evitar toques erróneos.

### Tablas — patrón estándar (2 clases reutilizables)

- **`.tabla-cards`** — en <640px cada fila colapsa a tarjeta vertical con
  etiquetas. Para: Resumen por Persona, Anticipos, Retenciones, Materiales,
  Colaboradores, catálogos.
- **`.tabla-scroll`** — en <640px el contenedor scrollea horizontal con
  indicador visual. Para: **Planilla OC (v454)** que imita el PDF y debe
  conservar su forma de tabla.

### Navegación

- Tabs superiores (Dashboard/Cobro/.../Planillas) y sub-tabs de Planillas:
  en celular/tablet se vuelven scroll horizontal táctil o colapso, sin
  romper el orden ni esconder opciones.

## Orden de rollout (cada paso = 1 versión, verificada en device real)

1. **Fundación** — breakpoints canónicos, `.app-container`, tipografía fluida,
   targets 44px, clases `.tabla-cards` y `.tabla-scroll`. Infra; cambio visible
   mínimo.
2. **Planillas + Planilla OC** — las tablas más anchas (lo más roto).
3. **Resumen por Persona · Anticipos · Retenciones** — tablas densas.
4. **Dashboard + grids de KPIs.**
5. **Materiales · Personal · Cobro · Avance Físico.**
6. **Modales globales + navegación (tabs).**
7. **Limpieza** — borrar `puntorojo.html` + `mobile.html`, limpiar el fallback
   del SW que los referencia.

## Verificación (loop por sección)

Por cada paso del rollout:

1. Aplicar cambios solo en `index.html`.
2. `node --check` del JS (atrapar typos como el de v449/v450).
3. Bump de versión: `sw.js` CACHE_VERSION + chip de versión en `index.html`.
4. `git commit` + `git push` (Cloudflare despliega en ~30s).
5. Usuario abre en **iPad + iPhone + Android + computadora** y manda screenshot.
6. Ajustar lo que salga mal; recién entonces avanzar a la siguiente sección.

## Riesgos y mitigaciones

- **Quirks de iOS Safari** (ya peleados en v429/v433): probar en iPhone real
  ANTES de declarar terminada cada sección. No asumir.
- **App de 38k líneas en producción usada a diario**: cambios incrementales,
  una sección por versión. Rollback siempre disponible vía git.
- **No romper el formato PDF de la Planilla OC (v454)**: por eso esa tabla usa
  scroll horizontal y NO tarjetas.
- **Migración de breakpoints**: gradual por sección, nunca un find-replace
  global que podría descuadrar todo a la vez.

## Fuera de alcance (YAGNI)

- Rediseño visual completo / nuevo design system desde cero.
- Cambios de lógica de negocio, Firebase, auth, o estructura de datos.
- Tocar `clientes.html` / `bienvenida.html` salvo que el usuario lo pida.
- App Check / captcha (tema aparte, ya cerrado en v455).

## Criterio de "terminado"

Cada sección se considera lista cuando, en los 4 tipos de device del usuario,
no hay: overflow horizontal involuntario, targets <44px, elementos encimados,
ni desalineaciones evidentes — confirmado por screenshot del usuario.
