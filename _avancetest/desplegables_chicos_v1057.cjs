/* v1057 — DESPLEGABLES CHICOS Y SIMÉTRICOS (Antonio, 29-jul): "QUIERO QUE TODAS LAS
   LISTAS DESPLEGABLES DE LA APP ME LAS HAGAS MAS PEQUEÑAS… SIMETRICO E IGUAL TODO".
   El patrón es .pr-obra-sel (34px, v1052) que él ya aprobó. Bajan JUNTOS los selects de
   formularios/filtros y los inputs/buscadores que comparten fila (solo bajar el select
   dejaría la fila chueca). Bloque ADITIVO al final de la cascada — las reglas v830/v960
   quedan como base y NO se editan (menos riesgo de romper el resto del look).
   EXCLUIDOS a propósito (catálogo del reconocimiento): navbar, .inline de tablas,
   .colab-obra-sel, kiosko/MI ASISTENCIA oscuro, planilla-toolbar/stage y los
   mini-selects de compras — ya son iguales o MÁS chicos; tocarlos los agrandaría. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. el bloque nuevo existe y es aditivo —');
const iB = html.indexOf('id="v1057-desplegables-chicos"');
ok('bloque v1057-desplegables-chicos', iB > 0);
const bloque = iB > 0 ? html.slice(iB, html.indexOf('</style>', iB)) : '';
ok('va DESPUÉS de las reglas base (v830 y pr-filtro)', iB > html.indexOf('select.pr-filtro{') && iB > html.indexOf('v830 — DESPLEGABLES'));
ok('la base v830 NO se editó (sigue 40px)', /select\.pr-fld,input\.pr-fld,textarea\.pr-fld\{min-height:40px/.test(html));

console.log('\n— 2. bajan a 34px selects Y compañeros de fila —');
ok('regla a 34px', /min-height:34px/.test(bloque));
['.field select', '.oc-form select', '.pedido-form-header select', '.activity-filters select', 'select.pr-filtro', '.pr-buscador', 'select.pr-fld'].forEach(s => {
  ok('cubre ' + s, bloque.indexOf(s) >= 0);
});
ok('el pr-filtro conserva espacio para su chevron', /select\.pr-filtro\{padding:5px 30px 5px 12px\}/.test(bloque));

console.log('\n— 3. la regla sagrada del móvil (16px anti-zoom iOS) —');
ok('móvil 16px y altura táctil', /@media \(max-width:820px\)\{[\s\S]*?min-height:40px;font-size:16px/.test(bloque));

console.log('\n— 4. los excluidos NO aparecen en el bloque —');
['.inline', '.colab-obra-sel', '.planilla-toolbar', '.planilla-stage', '.proj-switcher', '_miAsisObra'].forEach(s => {
  ok('no toca ' + s, bloque.indexOf(s) < 0);
});

console.log('\n— 5. los inline rebeldes migran a la clase —');
/* modales de PDF de asistencia: tenían 13px/radius 6 inline (asimetría visible) */
ok('pdfSemMondaySel con clase', /id="pdfSemMondaySel"[^>]*class="pr-fld"/.test(html) && !/id="pdfSemMondaySel"[^>]*font-size:13px/.test(html));
ok('pdfMesSel con clase', /id="pdfMesSel"[^>]*class="pr-fld"/.test(html) && !/id="pdfMesSel"[^>]*font-size:13px/.test(html));
/* ficha de proveedor y receta: radius 2 inline (chocaba con el radius 8 de todo lo demás) */
ok('_provTipoCuenta sin inline viejo', /id="_provTipoCuenta"(?![^>]*border-radius:2px)/.test(html));
ok('_provTipoCompra sin inline viejo', /id="_provTipoCompra"(?![^>]*border-radius:2px)/.test(html));
ok('recetaAddSelect sin inline viejo', /id="recetaAddSelect"(?![^>]*border-radius:2px)/.test(html));

console.log('\n— 6. los selStyle de planilla (strings en JS) bajan igual —');
const selStyles = html.match(/var selStyle = '[^']*'/g) || [];
ok('hay 3+ selStyle', selStyles.length >= 3);
ok('todos a 34px/12px', selStyles.every(s => /min-height:34px/.test(s) && /font-size:12px/.test(s)));

console.log('\n— 7. el patrón aprobado no se movió —');
ok('.pr-obra-sel sigue en 34px', /\.pr-obra-sel\{[^}]*height:34px/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
