# Punto Rojo · Gestión de Obra

App web mobile-first para gestión de obra: cobro y estimaciones, avance físico,
materiales y pedidos, planillas, personal y actividad.

## Stack

- HTML/CSS/JS en un solo archivo (`puntorojo.html` y su copia `index.html`)
- PWA — instalable en celular y computadora
- Firebase Auth — login real con email + clave
- Firebase Firestore — datos compartidos en tiempo real entre usuarios
- Firebase Storage — fotos de obra (próximamente)
- Hosting: Netlify (auto-deploy desde este repo)

## Estructura

| Archivo | Para qué |
|---|---|
| `index.html` | Versión que sirve la URL raíz (copia de `puntorojo.html`) |
| `puntorojo.html` | Archivo fuente principal de la app |
| `manifest.json` | Config de la PWA (nombre, ícono, etc.) |
| `sw.js` | Service worker — habilita uso sin internet |
| `icon.svg` | Ícono de la app |

## Cómo actualizar

1. Editá los archivos en este repo (vía GitHub Desktop o web).
2. Hacé "Commit" + "Push" — Netlify detecta el push y redeploya automáticamente.
3. La PWA en cada celular detecta la nueva versión y se actualiza sola.

## Producción

- URL pública: https://puntorojo.netlify.app/
- Firebase project: `punto-rojo-3fcf1`
