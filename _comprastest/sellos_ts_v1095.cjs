/* v1095 — SELLOS _ts QUE FALTABAN EN LOS ESCRITORES (barrido que v1070 dejó incompleto).
   REGLA de la app, ya pagada con cinco incidentes de pérdida: todo objeto que viaja en un
   contenedor union-merged debe sellar ._ts al mutarlo. Si no sella, el merge no tiene forma de
   saber cuál versión es la nueva y resuelve a favor de la del otro dispositivo — la edición
   se deshace sola y nadie ve un error.

   v1070 metió state.proveedoresGlobales en union-merge (_mergeById + _fuseProds) pero NO
   barrió a todos los que lo escriben. Quedaron sin sellar:
     - _limpiaAsignar        (asignar proveedor y precio desde la limpia del catálogo)
     - _importarPreciosExcel (el Excel de precios: precios, productos nuevos y forma de pago)
     - importarPersonalExcel (personal; ojo: _mergePersonal lee SOLO _ts, no cae a .ts)
   Encima, el comentario sobre _limpiaAsignar afirmaba que proveedoresGlobales era LWW sin
   union-merge: falso desde v1070, y es el tipo de comentario que hace tomar la decisión
   equivocada al siguiente que pase por ahí.

   FUERA DE ALCANCE A PROPÓSITO: setProvRecetaProducto (mover un producto de un proveedor a
   otro). Sellar ahí da FALSA sensación de arreglo: _fuseProds re-empuja el producto al
   proveedor origen porque no existe tombstone por producto. Es cambio de contrato de sync
   (APP_SYNC_VERSION + minSyncVersion) y necesita decisión de Antonio. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 0. POR QUÉ importa: el merge real resuelve por _ts —');
const zM = ex('function _mergeById(');
let mg = null;
try { mg = new Function('return (' + zM + ')')(); } catch(e){ console.log('   (no evaluable: '+e.message+')'); }
ok('_mergeById existe y es aislable', !!mg);
if (mg) {
  /* dos dispositivos con el MISMO proveedor: el local lo acaba de editar, el remoto es viejo */
  const remoto = [{ id: 'prv-1', nombre: 'SISTEGUA', precio: 0,  _ts: 5000 }];
  const editadoSinSello = [{ id: 'prv-1', nombre: 'SISTEGUA', precio: 23, _ts: 5000 }];
  const editadoConSello = [{ id: 'prv-1', nombre: 'SISTEGUA', precio: 23, _ts: 9000 }];
  const sin = mg(editadoSinSello, remoto, {});
  const con = mg(editadoConSello, remoto, {});
  const val = r => ((r.list || []).find(x => x.id === 'prv-1') || {}).precio;
  ok('SIN sellar, la edición local NO gana (así se pierde el precio en silencio)', val(sin) !== 23);
  ok('SELLANDO, la edición local gana', val(con) === 23);
}

console.log('\n— 1. la limpia del catálogo sella —');
const zL = ex('window._limpiaAsignar = function(');
ok('_limpiaAsignar existe', zL.length > 200);
ok('sella el PRODUCTO tocado', /_ts\s*[:=]/.test(zL));
ok('sella también el PROVEEDOR (el objeto que viaja union-merged)', /prv\._ts\s*=/.test(zL));
ok('el producto nuevo nace sellado', /push\(\{[^}]*_ts/.test(zL.replace(/\n/g, ' ')));
/* el comentario que mandaba al siguiente lector en dirección contraria */
ok('ya no dice que proveedoresGlobales es last-write-wins',
  !/proveedoresGlobales[^]{0,120}LAST-WRITE-WINS sin\s*\n?\s*union-merge/i.test(html));

console.log('\n— 2. el Excel de precios sella —');
const zE = ex('async function _importarPreciosExcel(');
ok('_importarPreciosExcel existe', zE.length > 400);
ok('sella lo que toca', (zE.match(/_ts/g) || []).length >= 3);
ok('un solo timestamp para todo el import (no uno por fila)', /const\s+\w*[Tt]Imp\s*=\s*Date\.now\(\)/.test(zE));

console.log('\n— 3. el Excel de personal sella —');
const zP = ex('async function importarPersonalExcel(');
ok('importarPersonalExcel existe', zP.length > 300);
/* _mergePersonal lee SOLO _ts — el ts: que ya estaba NO es un sello y no lo sustituye */
ok('la persona actualizada queda sellada', /_ts\s*=\s*/.test(zP) || /_ts\s*:/.test(zP));
const zMP = ex('function _mergePersonal(');
ok('_mergePersonal sigue leyendo _ts (no se tocó el merge)', /_ts/.test(zMP));

console.log('\n— 4. lo que NO se tocó —');
ok('setProvRecetaProducto queda fuera de esta tanda (necesita tombstone por producto)',
  !/v1095/.test(ex('function setProvRecetaProducto(')));
ok('no se tocó _fuseProds', !/v1095/.test(ex('const _fuseProds = function(')));
ok('no se tocó _mergeById', !/v1095/.test(zM));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
