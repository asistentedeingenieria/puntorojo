# Punto Rojo · Gestión de Obra

App web mobile-first para gestión de obra: cobro y estimaciones, avance físico,
materiales y pedidos, planillas, personal y actividad.

## Stack

- HTML/CSS/JS en archivos monolíticos (`puntorojo.html`, `index.html`, `mobile.html`)
- PWA — instalable en celular y computadora
- Firebase Auth — login real con email + clave
- Firebase Firestore — datos compartidos en tiempo real entre usuarios
- Firebase Storage — fotos de obra (próximamente)
- Hosting: Netlify (auto-deploy desde este repo) — dominio `puntorojo.app`

## Estructura

| Archivo | Para qué |
|---|---|
| `index.html` | Versión que sirve la URL raíz (copia de `puntorojo.html`) |
| `puntorojo.html` | Archivo fuente de la versión **WEB** (desktop) |
| `mobile.html` | Archivo fuente de la versión **MOBILE** |
| `manifest.json` | Config de la PWA (nombre, ícono, etc.) |
| `sw.js` | Service worker — habilita uso sin internet |
| `icon.svg` | Ícono de la app |

## Versión web vs versión mobile

La app tiene dos archivos HTML separados para poder darle a cada dispositivo el
diseño que mejor le sienta:

- **Web** (desktop / pantallas grandes): `puntorojo.html` y su copia `index.html`
- **Mobile** (celulares y pantallas angostas): `mobile.html`

Los tres archivos comparten **toda la lógica JS** (Firebase, Firestore, validaciones,
flujos de negocio) — eso debe mantenerse idéntico en los tres. Lo que diverge es
el **diseño** (CSS, layout, componentes visuales).

### Routing automático

Al entrar a `puntorojo.app/` el navegador detecta el dispositivo y redirige al
archivo correcto. La detección combina User-Agent + ancho de pantalla (< 820 px
se considera mobile).

### Override manual

Para forzar una versión específica (útil para desarrollar y probar):

| URL | Qué hace |
|---|---|
| `puntorojo.app/?view=web` | Forzar versión web (queda guardada en localStorage) |
| `puntorojo.app/?view=mobile` | Forzar versión mobile (queda guardada en localStorage) |
| `puntorojo.app/?view=clear` | Limpiar la preferencia y volver a auto-detectar |
| `puntorojo.app/mobile.html` | Abrir directo la versión mobile |
| `puntorojo.app/index.html` | Abrir directo la versión web |

La preferencia se persiste en `localStorage` con la key `pr_view`, así que
una vez forzada se respeta en todas las navegaciones siguientes.

## Convención para hacer cambios

- **Cambios de DISEÑO** (CSS, layout, dimensiones, colores, tipografía, espaciado,
  componentes visuales): especificá si el cambio es para `web`, `mobile` o `ambos`.
  - Web → editar `puntorojo.html` Y `index.html` (siempre se mantienen idénticos).
  - Mobile → editar `mobile.html`.
  - Ambos → editar los tres.
- **Cambios de LÓGICA** (Firebase, Firestore, validaciones, flujos, fixes de bugs
  no visuales): se aplican a los **tres archivos**. La lógica nunca debe
  desincronizarse entre web y mobile.

## Cómo actualizar

1. Editá los archivos en este repo (vía GitHub Desktop o web).
2. Hacé "Commit" + "Push" — Netlify detecta el push y redeploya automáticamente.
3. Subí el `CACHE_VERSION` en `sw.js` para forzar que las PWAs ya instaladas
   descarguen la versión nueva.
4. La PWA en cada celular detecta la nueva versión y se actualiza sola.

## Producción

- URL pública: https://puntorojo.app/
- URL antigua (Netlify): https://puntorojo.netlify.app/
- Firebase project: `punto-rojo-3fcf1`
