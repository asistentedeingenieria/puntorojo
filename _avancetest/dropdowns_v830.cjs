/* v830: desplegables/campos unificados (Estilo A nítido).
   Mismo look (alto 40px, borde 1px var(--line)/#E2E8F0, radio 8px, fuente 12.5px/600,
   fondo blanco, foco con anillo rojo) para los selects/inputs/fechas de formularios y filtros.
   NO se tocan: la barra superior (.proj-switcher/.role-bar) ni los editores inline de tablas
   (.inline/.receta-table-row). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

// ── 1) Bloque CSS unificado ──
ok('CSS: existe el bloque unificado v830', /v830 — DESPLEGABLES\/CAMPOS UNIFICADOS/.test(html));
ok('CSS: agrupa .field/.oc-form/.pedido-form-header/.activity-filters/.metal-medida-row + .pr-fld',
  /\.field input,\.field select[\s\S]{0,400}\.oc-form[\s\S]{0,400}\.pedido-form-header[\s\S]{0,400}\.activity-filters[\s\S]{0,400}\.metal-medida-row[\s\S]{0,200}select\.pr-fld/.test(html));
ok('CSS: tokens unificados (min-height:40px + radius 8px + borde var(--line) + 12.5px/600)',
  /min-height:40px;padding:9px 12px;border:1px solid var\(--line\);border-radius:8px;background:#fff;color:var\(--ink\);font-family:inherit;font-size:12\.5px;font-weight:600/.test(html));
ok('CSS: foco rojo con anillo', /border-color:var\(--red\);background:#fff;box-shadow:0 0 0 3px rgba\(200,20,28,\.12\)/.test(html));

// ── 2) Constantes de filtros unificadas ──
const uniTokens = /border:1px solid #E2E8F0;border-radius:8px;font:inherit;font-size:12\.5px;font-weight:600;min-height:40px/;
// los 3 selStyle idénticos (eran #DDD/4px/11px)
ok('selStyle (3 filtros) ya no usa el estilo viejo #DDD/4px/11px',
  !/var selStyle = 'padding:6px 10px;border:1px solid #DDD;border-radius:4px;font:inherit;font-size:11px';/.test(html));
ok('selStyle (3 filtros) usa tokens unificados',
  (html.match(/var selStyle = 'padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font:inherit;font-size:12\.5px;font-weight:600;min-height:40px;box-sizing:border-box;background:#fff;color:#111827;text-transform:uppercase';/g) || []).length === 3);
// el selStyle full-width (era var(--line)/4px/13px)
ok('selStyle full-width unificado', /var selStyle='width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;[^']*min-height:40px/.test(html));
// _antInp
ok('_antInp unificado (#E2E8F0/8px/40px) y conserva margin-top',
  /var _antInp='width:100%;[^']*border:1px solid #E2E8F0;border-radius:8px;[^']*min-height:40px;[^']*margin-top:4px/.test(html));
ok('_antInp ya no usa #DDD/5px', !/var _antInp='width:100%;padding:9px 11px;border:1px solid #DDD;border-radius:5px/.test(html));

// ── 3) .pr-combo alineado a 40px / radius 8 ──
ok('.pr-combo min-height:40px', /\.pr-combo\{[^}]*min-height:40px/.test(html));
ok('.pr-combo border-radius:8px', /\.pr-combo\{[^}]*border-radius:8px/.test(html));

// ── 4) NO se tocó la barra superior ni los inline de tabla ──
ok('navbar .proj-switcher sigue transparente', /\.proj-switcher select\{background:transparent/.test(html));
ok('navbar .role-bar sigue transparente', /\.role-bar select\{background:transparent/.test(html));
ok('inline de tabla sigue compacto/transparente', /input\.inline,select\.inline\{border:none;background:transparent/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
