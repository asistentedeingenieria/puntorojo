/* v1086 — LA FIRMA DEL DOCUMENTO ES LA DE QUIEN FIRMÓ, NO LA DE QUIEN LO ABRE.
   Antonio (30-jul, con el PDF del TRASIEGO): "yo abro ese documento y se ve bien mi firma,
   pero lo abre otra persona y deja el nombre de la persona que realmente firmó pero le pone
   la firma de la persona que descarga el documento".
   CAUSA RAÍZ: _miFirmaImg(username) caía al usuario ACTUAL cuando el argumento venía vacío
   (`username || getCurrentUser().username`). Los documentos que no guardaron el username del
   firmante — el TRASIEGO nunca guardó autorizadoPorUsername — entraban por ese respaldo y
   estampaban la firma del lector. Es un problema de integridad del documento, no cosmético.
   FIX en dos capas: (1) si se pasa un argumento, se respeta aunque sea vacío — sin firma
   conocida NO se estampa ninguna; (2) el trasiego guarda el username de quien autoriza. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la firma solo sale si se sabe DE QUIÉN es —');
const zF = ex('function _miFirmaImg(');
let f = null;
try { f = new Function('state','getCurrentUser','return (' + zF + ')'); } catch(e){}
ok('existe _miFirmaImg', !!f && zF.length > 100);
if (f) {
  const st = { firmasUsuarios: { 'ana': 'FIRMA-DE-ANA', 'beto': 'FIRMA-DE-BETO' } };
  const yo = () => ({ username: 'beto' });           // el que abre el documento
  const g = f(st, yo);
  ok('con el firmante conocido, trae SU firma', g('ana') === 'FIRMA-DE-ANA');
  /* EL BUG DE ANTONIO: documento sin username del firmante → NO se estampa la de nadie */
  ok('sin username del firmante NO usa la del lector', g('') === '' && g(undefined) === '' && g(null) === '');
  /* pero "mi firma" (sin argumentos) tiene que seguir funcionando: la usa el modal de firma */
  ok('llamada SIN argumentos sigue devolviendo la mía', g() === 'FIRMA-DE-BETO');
  ok('un firmante sin firma registrada no revienta', g('carlos') === '');
  ok('no distingue mayúsculas', g('ANA') === 'FIRMA-DE-ANA');
  ok('sin nadie logueado tampoco revienta', f(st, () => null)() === '');
}

console.log('\n— 2. el trasiego ya guarda quién autorizó —');
const zT = ex('window._trasRegistrar = async function');
ok('el trasiego guarda autorizadoPorUsername', /autorizadoPorUsername/.test(zT));
ok('y sigue guardando el nombre visible', /autorizadoPor:/.test(zT));
ok('igual el que nace desde el pedido', /autorizadoPorUsername/.test(ex('async function generarOrdenCompra(')));

console.log('\n— 3. el impreso pide la firma por username, nunca genérica —');
const iP = html.indexOf('_miFirmaImg(oc.autorizadoPorUsername)');
ok('el bloque de AUTORIZADO usa el username del firmante', iP > -1);
ok('no queda ninguna llamada sin argumento dentro del impreso', !/_miFirmaImg\(\)\s*\?/.test(ex('function printOrdenCompra(')));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
