#!/usr/bin/env node
/**
 * Convierte los SVG master de assets-source/ a PNG en la carpeta assets/.
 * @capacitor/assets genera despues todos los tamanos derivados (Android, iOS).
 *
 * Uso:
 *   node scripts/build-source-assets.mjs
 *
 * Requiere: sharp (viene con @capacitor/assets como peer)
 */

import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const SRC = join(ROOT, 'assets-source');
const OUT = join(ROOT, 'assets');

async function svgToPng(svgPath, pngPath, size) {
  const svg = await readFile(svgPath);
  // density se calcula segun el size para que el render salga nitido sin
  // exceder el pixel limit interno de sharp.
  // viewBox tipico es 1024 o 2732, asi que ajustamos density proporcionalmente.
  const density = Math.min(600, Math.round((size / 1024) * 200));
  await sharp(svg, { density, limitInputPixels: false })
    .resize(size, size, { fit: 'contain' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(pngPath);
  console.log(`  OK ${pngPath.replace(ROOT, '.')} (${size}x${size}, density ${density})`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  console.log('Generando PNGs master desde assets-source/*.svg ...');

  // icon.png — icono principal (iOS, Android tradicional, web fallback)
  await svgToPng(
    join(SRC, 'icon.svg'),
    join(OUT, 'icon-only.png'),
    1024
  );

  // icon-foreground.png — Adaptive Icon foreground para Android 8+
  await svgToPng(
    join(SRC, 'icon-foreground.svg'),
    join(OUT, 'icon-foreground.png'),
    1024
  );

  // splash.png — Splash screen 2732x2732
  await svgToPng(
    join(SRC, 'splash.svg'),
    join(OUT, 'splash.png'),
    2732
  );

  // splash-dark.png — usamos el mismo (el splash ya es dark)
  await svgToPng(
    join(SRC, 'splash.svg'),
    join(OUT, 'splash-dark.png'),
    2732
  );

  console.log('\nDone. Ahora corre:  npx @capacitor/assets generate --android');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
