#!/usr/bin/env node
/**
 * Genera los assets de marketing requeridos por Google Play Console:
 *
 *   - assets/play-store/icon-512.png         (App icon HD: 512x512)
 *   - assets/play-store/feature-graphic.png  (Feature graphic banner: 1024x500)
 *
 * Estos archivos los subis a Play Console al crear el listing.
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const LOGO = join(ROOT, 'logo.png');
const OUT = join(ROOT, 'assets', 'play-store');

const RED = { r: 200, g: 20, b: 28, alpha: 1 };       // #C8141C
const RED_DARK = { r: 159, g: 15, b: 22, alpha: 1 };  // #9F0F16
const DARK = { r: 15, g: 23, b: 42, alpha: 1 };       // #0F172A

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log('Generando assets de Play Store ...');

  // ─────────────────────────────────────────────────────────
  // 1) ICON HD 512x512
  // Google Play exige PNG 512x512 sin transparencia.
  // Reusa el logo con fit:cover para que llene todo el canvas.
  // ─────────────────────────────────────────────────────────
  await sharp(LOGO)
    .resize(512, 512, { fit: 'cover', position: 'center', kernel: 'lanczos3' })
    .flatten({ background: RED })  // remove alpha, fill with red bg si quedara transparencia
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(OUT, 'icon-512.png'));
  console.log('  OK assets/play-store/icon-512.png (512x512)');

  // ─────────────────────────────────────────────────────────
  // 2) FEATURE GRAPHIC 1024x500
  // Banner promocional que aparece arriba del listing en Play Store.
  // Diseño: gradiente dark a rojo, logo a la izquierda, texto a la derecha.
  // ─────────────────────────────────────────────────────────

  // Logo escalado (450x450 sobre canvas 1024x500, ocupa la zona izquierda)
  const logoBuffer = await sharp(LOGO)
    .resize(380, 380, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // SVG con texto + gradiente de fondo (el SVG se renderiza nitido a cualquier resolucion)
  const svgFeature = `<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="60%" stop-color="#1F0507"/>
        <stop offset="100%" stop-color="#9F0F16"/>
      </linearGradient>
      <radialGradient id="glow" cx="30%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#C8141C" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#C8141C" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <rect width="1024" height="500" fill="url(#glow)"/>

    <!-- Tagline arriba -->
    <text x="500" y="130" fill="#FCE6E7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="6" text-transform="uppercase">GESTION DE OBRA</text>

    <!-- Titulo principal -->
    <text x="500" y="220" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="68" font-weight="900" letter-spacing="-1">PUNTO ROJO</text>

    <!-- Subtitulo -->
    <text x="500" y="280" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="500" opacity="0.9">Tablayeso digital para constructoras</text>

    <!-- Bullet points -->
    <text x="500" y="345" fill="#FCE6E7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16" font-weight="600" letter-spacing="0.4">- Acuses de recepcion con firma digital</text>
    <text x="500" y="375" fill="#FCE6E7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16" font-weight="600" letter-spacing="0.4">- Reportes fotograficos semanales</text>
    <text x="500" y="405" fill="#FCE6E7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16" font-weight="600" letter-spacing="0.4">- QR rotativo para firma instantanea</text>
  </svg>`;

  // Compose: fondo SVG + logo overlay
  const bgBuffer = await sharp(Buffer.from(svgFeature))
    .png()
    .toBuffer();

  await sharp(bgBuffer)
    .composite([{ input: logoBuffer, top: 60, left: 60 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(OUT, 'feature-graphic.png'));
  console.log('  OK assets/play-store/feature-graphic.png (1024x500)');

  console.log('\nDone. Subir a Play Console -> Store listing -> Graphics:');
  console.log('  - App icon: assets/play-store/icon-512.png');
  console.log('  - Feature graphic: assets/play-store/feature-graphic.png');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
