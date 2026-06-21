# PUNTO ROJO — guía para Claude Code (cualquier dispositivo)

App PWA de gestión de obra para una subcontratista de drywall (Guatemala):
cobro/estimaciones, avance físico, materiales/pedidos, planillas, personal,
asistencia. Dominio: `puntorojo.app`.

Este archivo lo carga automáticamente cualquier sesión de Claude Code (PC,
nube, celular vía `claude.ai/code`). Es el contexto mínimo para trabajar sin
depender de la memoria local de una máquina en particular.

## Cómo me querés trabajando (Antonio)

- **Idioma:** español (Guatemala). Conciso, sin relleno, sin emojis no pedidos.
- **Antes de una feature nueva o cambiar comportamiento:** brainstorming corto
  para confirmar la intención antes de tocar código.
- **Antes de arreglar un bug / "no funciona":** depuración sistemática (causa
  raíz primero, no parches a ciegas).
- **Al escribir código:** TDD. Las pruebas son archivos `.cjs` en `_avancetest/`,
  `_recetatest/`, `_colabtest/`, etc. Extraen funciones del HTML con regex y las
  evalúan con `new Function`. Escribe la aserción que falla primero, luego el fix.
- **Antes de decir "listo/arreglado/desplegado":** verificá de verdad (corré los
  tests y el validador), no lo afirmes sin comprobarlo.

## Dónde vive todo

- **Código + app:** este repo de GitHub. Push a `main` → **Netlify** redeploya
  solo → `puntorojo.app`. No hay workflow de deploy web (Netlify escucha el push).
- **Datos** (planillas, anticipos, asistencia, personal, caras): **Firebase
  Firestore**, proyecto `punto-rojo-3fcf1`. Compartidos en tiempo real entre
  usuarios. ⚠️ **Claude NO puede leer ni modificar Firestore ni el navegador del
  usuario.** Toda operación sobre datos en vivo se entrega como **comandos de
  consola** que Antonio pega en el navegador.

## Archivos clave

| Archivo | Para qué |
|---|---|
| `index.html` | App que sirve la raíz (`start_url:"./"`). **Es el archivo vivo**; casi todo el trabajo reciente va aquí. ~2.9 MB, un solo `<script>`. |
| `mobile.html` | Versión mobile (diseño aparte). |
| `puntorojo.html` | Fuente histórica de la versión web. **Posible drift:** features recientes (p. ej. flujo de anticipos) se hicieron solo en `index.html`. Verificá si un cambio necesita reflejarse aquí antes de asumir que los 3 archivos están iguales. |
| `sw.js` | Service worker. `CACHE_VERSION` fuerza actualización de las PWAs instaladas. |
| `manifest.json` | Config PWA. |

El README documenta la convención original de 3 archivos (web `puntorojo.html` +
`index.html`, mobile `mobile.html`). En la práctica el trabajo reciente es
`index.html`-only; no asumas paridad, comprobala.

## Ritual de versión y deploy (cada cambio que se publica)

1. Subí el chip de versión en `index.html`: `<span style="opacity:.5;font-size:9px">vNNN</span>`.
2. Subí `CACHE_VERSION` en `sw.js` (p. ej. `'vNNN-descripcion-corta'`).
3. Validá: `node _recetatest/valjs.js` → **baseline esperado `blocks=27 errs=1`**;
   el `PARSE ERR block#13` es un **falso positivo conocido** (= PASS).
4. Corré los `.cjs` relevantes de la feature (p. ej. `node _avancetest/flujoanticipos.cjs`).
5. Commit a `main` (footer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`),
   luego `git push origin main`. Netlify redeploya.
6. Antonio recarga; la PWA toma la versión nueva.

Mensajes de commit largos: escribilos a un archivo y usá `git commit -F archivo`
(las here-strings se rompen con comillas internas).

## Trabajo multi-dispositivo

- Siempre `git pull` antes de editar si trabajaste en otra máquina, para no chocar.
- La memoria privada del proyecto (notas vNNN detalladas) vive en la PC principal,
  **no** en el repo. Una sesión en el celular tiene este `CLAUDE.md` + el repo,
  pero menos historial. Si necesitás contexto fino, pedíselo a Antonio o revisá
  el código y los commits.

## Gotchas de sincronización (Firestore ↔ app)

Patrones que ya mordieron y se arreglaron varias veces:

- `applyRemote` históricamente hacía `state = merged` (last-write-wins) y pisaba
  cambios concurrentes. Datos sensibles (asistencia, colaboradores, plata) usan
  **union-merge** por id + `_ts` (`_mergeById`). Si agregás un array nuevo que
  varios dispositivos editan, unilo igual o se va a pisar.
- `saveState()` solo agenda subida con debounce. Para acciones de dinero,
  agregá `CloudSync.forceUploadNow()` o el primer intento no sube.
- `isUserBusy()` pospone `applyRemote` mientras hay un modal abierto, para no
  dejar referencias huérfanas (`p`/`pl`/`ant`/`po`) tomadas antes de un `await`.
  Tras cualquier `await` de modal, re-leé del state vivo.
