/* v1213 (Antonio, 14-ago: "NO ME ESTA DEJANDO AGREGAR MATERIALES DE LA BODEGA CENTRAL...
   YA ESTAN CARGADOS EN LA BODEGA") — LA FILA MUERTA ESCONDE AL PRODUCTO REAL.

   El incidente de salidas por nombre tipeado dejó filas huérfanas en el libro de bodega
   (p. ej. "METRO DE NYLON DELGADO 26" con saldo 0). Al elegir BODEGA CENTRAL:
   1. _bodegaBuscarMaterial devolvía la PRIMERA fila encontrada aunque tuviera saldo 0 —
      la fila muerta tapaba al verdadero "NYLON DELGADO 26" METROS (TRANSPARENTE)" (260).
   2. Como "encontró algo", el modal de parecidos (v1017, el que declara la equivalencia
      para siempre) nunca corría — solo corre cuando NO se encuentra nada. Resultado:
      "BODEGA TIENE 0 DE 15 — SE DESPACHA LO QUE HAYA" sin salida posible.

   FIX: entre las claves equivalentes gana la que SÍ tiene existencia; la fila sin saldo es
   último recurso. Y encontrar una fila SIN existencia también pregunta "¿cuál es?". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— 1. _bodegaBuscarMaterial: la existencia GANA a la fila muerta —');
const zB = ex(code, 'function _bodegaBuscarMaterial(');
ok('existe', !!zB);
try {
  // stubs mínimos: clave = mayúsculas sin símbolos (suficiente para el caso)
  const K = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const K_PEDIDO = K('METRO DE NYLON DELGADO 26"');
  const K_BODEGA = K('NYLON DELGADO 26" METROS ( TRANSPARENTE )');
  const saldos = {};
  saldos[K_PEDIDO] = { name: 'METRO DE NYLON DELGADO 26"', saldo: 0 };      // la fila muerta
  saldos[K_BODEGA] = { name: 'NYLON DELGADO 26" METROS ( TRANSPARENTE )', saldo: 260 };
  const alias = {}; alias[K_PEDIDO] = K_BODEGA;                              // equivalencia declarada
  const mk = (mapa) => new Function('window', 'state', '_ocItemMemKey', '_matAliasCanon', '_matAliasMap', '_precioEntradaBodega',
    'return (' + zB + ')')(
    { _bodegaSaldos: () => saldos }, {}, K,
    k => mapa[k] || k, () => mapa, () => 0);

  const conAlias = mk(alias)('METRO DE NYLON DELGADO 26"');
  ok('EL CASO REAL: con la equivalencia declarada devuelve el producto CON 260 (no la fila en 0)',
    !!conAlias && conAlias.saldo === 260 && /TRANSPARENTE/.test(conAlias.name));

  const sinAlias = mk({})('METRO DE NYLON DELGADO 26"');
  ok('sin equivalencia, la fila en 0 sigue saliendo (último recurso, semántica de siempre)',
    !!sinAlias && sinAlias.saldo === 0);

  ok('lo que no está en bodega sigue dando null', mk({})('CEMENTO GRIS') === null);
} catch(e){ ok('evalúa aislada', false); console.log('  ' + e.message); }

console.log('\n— 2. elegir BODEGA con fila SIN existencia también pregunta "¿cuál es?" —');
const zP = ex(code, 'function updateOcItemProveedor(');
ok('la rama del match exitoso exige saldo > 0', /_res && _res\.saldo > 0/.test(zP));
ok('el camino sin existencia (fila muerta O nada) abre el modal de parecidos', /_bodegaPedirMatch\(idx, item\.name\)/.test(zP));
ok('la fila muerta conserva el aviso "SE DESPACHA LO QUE HAYA" (cerrar el modal no bloquea)',
  (zP.match(/SE DESPACHA LO QUE HAYA/g) || []).length >= 1 && /_bodegaPedirMatch/.test(zP.slice(zP.indexOf('SE DESPACHA LO QUE HAYA'))));

console.log('\n— 3. el título del modal es cierto en los dos casos (no está ≡ no hay existencia) —');
ok('título honesto', /NO HAY EXISTENCIA CON ESE NOMBRE EN BODEGA/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
