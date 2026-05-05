#!/usr/bin/env node
/**
 * Genera los assets master (PNG) a partir del logo real de Punto Rojo
 * (logo.png en la raiz del repo) para que @capacitor/assets distribuya
 * a todos los tamanos de Android e iOS.
 *
 * Master fuente: logo.png (anillo blanco sobre patron de cuadrados rojos)
 *
 * Genera 4 archivos en assets/:
 *   - icon-only.png        (1024x1024) — logo sobre fondo rojo institucional
 *                                        (usado por iOS y Android tradicional)
 *   - icon-foreground.png  (1024x1024) — logo con padding extra, fondo transparente
 *                                        (usado por Adaptive Icon de Android 8+,
 *                                         el sistema lo recorta dinamicamente)
 *   - splash.png           (2732x2732) — logo centrado sobre fondo dark
 *   - splash-dark.png      (2732x2732) — igual al splash (ya es dark)
 *
 * Uso:
 *   node scripts/build-source-assets.mjs
 *
 * Despues correr:
 *   npx capacitor-assets generate --android \
 *     --iconBackgroundColor "#C8141C" --splashBackgroundColor "#0F172A"
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const LOGO = join(ROOT, 'logo.png');
const OUT = join(ROOT, 'assets');

// Color rojo institucional Punto Rojo
const RED = { r: 200, g: 20, b: 28, alpha: 1 };
// Color dark slate institucional (mismo que la PWA)
const DARK = { r: 15, g: 23, b: 42, alpha: 1 };

/**
 * Carga el logo y lo escala al tamano dado, manteniendo aspect ratio.
 * Devuelve un buffer PNG con padding transparente para llegar al cuadrado.
 */
async function loadLogo(size) {
  return await sharp(LOGO)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3' // mejor calidad para upscaling
    })
    .toBuffer();
}

/**
 * Crea un canvas cuadrado del color dado y compone el logo en el centro.
 */
async function compose({ canvasSize, logoSize, bgColor, outPath }) {
  const logo = await loadLogo(logoSize);

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bgColor
    }
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);

  console.log(`  OK ${outPath.replace(ROOT, '.')} (${canvasSize}x${canvasSize}, logo ${logoSize}px)`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  console.log('Generando PNGs master desde logo.png ...');

  // icon-only.png — icono principal completo, 1024x1024
  // Usamos fit:'cover' para que el logo llene TODO el canvas (mas impacto
  // visual). Como el logo es ~423x400 (ratio 1.05), el recorte es minimo.
  await sharp(LOGO)
    .resize(1024, 1024, { fit: 'cover', position: 'center', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(OUT, 'icon-only.png'));
  console.log(`  OK ./assets/icon-only.png (1024x1024, fit:cover)`);

  // icon-foreground.png — Adaptive Icon foreground (Android 8+)
  // Android puede recortar hasta 33% en mascaras dinamicas, asi que
  // dejamos el logo con padding generoso. Fondo transparente — Android
  // compone sobre el background-color (#C8141C) del config.
  const fg = await loadLogo(640);
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: fg, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(OUT, 'icon-foreground.png'));
  console.log(`  OK ./assets/icon-foreground.png (1024x1024, logo 640px, transparente)`);

  // splash.png — splash screen 2732x2732, fondo dark, logo grande (1300px = ~48% del canvas)
  await compose({
    canvasSize: 2732,
    logoSize: 1300,
    bgColor: DARK,
    outPath: join(OUT, 'splash.png')
  });

  // splash-dark.png — mismo (ya es dark)
  await compose({
    canvasSize: 2732,
    logoSize: 1300,
    bgColor: DARK,
    outPath: join(OUT, 'splash-dark.png')
  });

  console.log('\nDone. Ahora ejecutar:');
  console.log('  npx capacitor-assets generate --android \\');
  console.log('    --iconBackgroundColor "#C8141C" --iconBackgroundColorDark "#9F0F16" \\');
  console.log('    --splashBackgroundColor "#0F172A" --splashBackgroundColorDark "#0F172A"');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
