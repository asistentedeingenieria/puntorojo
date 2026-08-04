/* v1124 — "TENEMOS ORDENES CON EL NUMERO REPETIDO. DOS NUEVES." (Antonio, 4-ago)

   Dos DESPACHO PRE-PAGO 8 y dos DESPACHO PRE-PAGO 9 en la misma compra anticipada.

   CAUSA RAÍZ (la misma lección de v1068, otra vez): el número del despacho es GLOBAL
   —"DESPACHO PRE-PAGO 9", sin sigla de proyecto que lo distinga— pero el folio libre se
   calculaba barriendo UN SOLO contenedor (cont.ordenes, el de la orden madre), mientras el
   panel y el saldo barren los TRES con _dppOrdenesGlobal(). Un despacho que viva en otro
   contenedor es invisible para el contador: su folio se vuelve a repartir.

   En v1068 Antonio ya había reportado el mismo patrón con los saldos ("tenemos diferentes
   datos de POR LIBERAR, DEBE DE ESTAR IGUAL") y se centralizó la fuente. El correlativo
   quedó fuera de esa centralización. Mismo error, otra ventanilla.

   Aplica igual a los TRASIEGOS ("TRASIEGO 1" también es global).
   NO aplica a las OC normales: su número lleva la sigla del proyecto ("VLA – OC 12"), así
   que el correlativo por contenedor es correcto por diseño y no se toca. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zF = ex(code, 'function _dppFolioLibreGlobal(');
ok('existe el contador global de folios', zF.length > 80);

let f = null;
try {
  f = new Function('_dppOrdenesGlobal','_ocSerieDe','_primerNumeroLibre', zF + '\nreturn _dppFolioLibreGlobal;');
} catch(e){ console.log('   (no compiló: ' + e.message + ')'); }

if (f) {
  const primerLibre = us => { const s = {}; (us||[]).forEach(n => { const v = parseInt(n,10); if (v>0) s[v]=true; }); let i=1; while(s[i]) i++; return i; };
  const serieDe = o => String((o && o.serie) || '');
  /* el escenario real: 9 despachos repartidos en DOS contenedores distintos */
  const enBodega = [1,2,3,4,5,6,7].map(n => ({ serie:'DPP', folio:n }));
  const enOtro   = [8,9].map(n => ({ serie:'DPP', folio:n }));

  console.log('\n— el caso que le pasó a Antonio —');
  const libre = f(() => enBodega.concat(enOtro), serieDe, primerLibre)('DPP');
  ok('mirando los TRES contenedores, el siguiente es el 10', libre === 10);
  const ciego = primerLibre(enBodega.map(o => o.folio));
  ok('mirando uno solo habría repartido el 8 (el bug)', ciego === 8);

  console.log('\n— comportamiento del contador —');
  ok('con la bodega vacía empieza en 1', f(() => [], serieDe, primerLibre)('DPP') === 1);
  ok('rellena un hueco si lo hay',
    f(() => [{serie:'DPP',folio:1},{serie:'DPP',folio:3}], serieDe, primerLibre)('DPP') === 2);
  ok('no cuenta otras series',
    f(() => [{serie:'OC',folio:1},{serie:'TRAS',folio:2}], serieDe, primerLibre)('DPP') === 1);
  ok('sirve igual para los TRASIEGOS',
    f(() => [{serie:'TRAS',folio:1},{serie:'TRAS',folio:2}], serieDe, primerLibre)('TRAS') === 3);
  ok('una orden basura no lo tumba',
    f(() => [null, {serie:'DPP'}, {serie:'DPP',folio:'x'}], serieDe, primerLibre)('DPP') === 1);
}

console.log('\n— quién lo usa —');
const zC = ex(code, 'window._dppCrearDesdeMadre = async function(');
ok('el despacho pre-pago toma su folio del contador global', /_dppFolioLibreGlobal\('DPP'\)/.test(zC));
ok('y ya NO cuenta sobre un solo contenedor',
  !/cont\.ordenes[\s\S]{0,120}_ocSerieDe\(o\) === 'DPP'[\s\S]{0,60}folio/.test(zC));
const zT = ex(code, 'window._trasCrear = async function(') || ex(code, 'window._trasGuardar = async function(') || code;
ok('el trasiego también', /_dppFolioLibreGlobal\('TRAS'\)/.test(code));

/* el OTRO constructor: los despachos y trasiegos que salen DESDE UN PEDIDO. Corre dentro de
   un bucle que puede generar varios de una pasada, así que contar sobre una lista congelada
   repetía folios incluso dentro del mismo lote. */
ok('el despacho generado desde un pedido usa el mismo contador',
  (code.match(/_dppFolioLibreGlobal\('DPP'\)/g) || []).length >= 2);
ok('y el trasiego desde un pedido también',
  (code.match(/_dppFolioLibreGlobal\('TRAS'\)/g) || []).length >= 2);
ok('ya no queda ningún conteo local de folios DPP/TRAS',
  !/_ocSerieDe\(o\) === '(DPP|TRAS)'\)\s*_?usados?D?T?\.push/i.test(code.replace(/\s+/g,' ')));

console.log('\n— lo que NO se debe tocar —');
ok('la OC normal sigue con correlativo por contenedor (lleva sigla de proyecto)',
  /cont\.ordenes[\s\S]{0,140}_ocSerieDe\(o\) === 'OC'/.test(code));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
