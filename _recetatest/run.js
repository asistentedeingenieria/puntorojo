const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const A = '// ===RECETA-PURE-START===', B = '// ===RECETA-PURE-END===';
const i = html.indexOf(A), j = html.indexOf(B);
if (i < 0 || j < 0) { console.log('NO SENTINELS FOUND — Task 1 not done yet'); process.exit(2); }
const code = html.slice(i + A.length, j);
const api = {};
new Function('api', code + '\napi.normProducto=normProducto;api.torreSheetToTowerId=torreSheetToTowerId;api.parseRecetaWorkbook=typeof parseRecetaWorkbook!=="undefined"?parseRecetaWorkbook:undefined;api.aplicarOperacionReceta=typeof aplicarOperacionReceta!=="undefined"?aplicarOperacionReceta:undefined;api.matchKeyProducto=typeof matchKeyProducto!=="undefined"?matchKeyProducto:undefined;api.precioDeProductoReceta=typeof precioDeProductoReceta!=="undefined"?precioDeProductoReceta:undefined;api.resolveAptoId=typeof resolveAptoId!=="undefined"?resolveAptoId:undefined;api.totalMaterialNivel=typeof totalMaterialNivel!=="undefined"?totalMaterialNivel:undefined;api.parseRecetaPorApto=typeof parseRecetaPorApto!=="undefined"?parseRecetaPorApto:undefined;api._etapas=typeof _etapas!=="undefined"?_etapas:undefined;api.parseResumenPR=typeof parseResumenPR!=="undefined"?parseResumenPR:undefined;api._resumenFecha=typeof _resumenFecha!=="undefined"?_resumenFecha:undefined;api._resumenNum=typeof _resumenNum!=="undefined"?_resumenNum:undefined;api.parseAvanceExcel=typeof parseAvanceExcel!=="undefined"?parseAvanceExcel:undefined;api.parsePersonalExcel=typeof parsePersonalExcel!=="undefined"?parsePersonalExcel:undefined;api.computeAsistenciaMark=typeof computeAsistenciaMark!=="undefined"?computeAsistenciaMark:undefined;api.pickFaceCandidates=typeof pickFaceCandidates!=="undefined"?pickFaceCandidates:undefined;')(api);

let pass = 0, fail = 0;
function eq(name, got, exp) {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { pass++; } else { fail++; console.log('FAIL ' + name + '\n  got=' + g + '\n  exp=' + e); }
}
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + name); } }
module.exports = { api, eq, ok, done: () => { console.log('PASS=' + pass + ' FAIL=' + fail); process.exit(fail ? 1 : 0); } };
const t = module.exports;
require('./tests')(t);
t.done();
