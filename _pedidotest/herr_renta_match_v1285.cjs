/* v1285 (Antonio, 26-ago: "me salió NINGUNA ESTÁ COMO SE RENTA cuando SÍ está en el
   catálogo pero con un nombre NO exacto — el pedido pide los RODOS y el catálogo lo
   tiene con otro nombre"): el RENTAR de herramientas (v1283) matcheaba por igualdad
   EXACTA de matchKeyProducto, así que "RODOS" jamás encontraba "RODO PARA ANDAMIO".
   FIX: matcher tolerante PURO — normaliza (mayúsculas, tildes, puntuación), tira
   palabras vacías (DE/PARA/…), singulariza (RODOS≡RODO, TABLONES≡TABLON) y acepta
   prefijos de tamaño real (ANDA≡ANDAMIO). Regla de oro: TODOS los tokens del nombre
   corto deben estar en el largo (nada de medio-parecidos); a más tokens sobrantes,
   menos puntaje. El match EXACTO sigue mandando (rango 2 > parecido ≤1) y el diálogo
   de confirmación muestra QUÉ producto del catálogo se eligió — el humano valida. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* ── 1. helpers PUROS, evaluables solos ── */
const src = ['function _rentaTokCanon', 'function _rentaNombreTokens', 'function _rentaTokIgual', 'function _rentaNombresParecidos'].map(ex).join('\n');
ok('los 4 helpers existen', src.split('function ').length >= 5);
let toks, parecidos;
try {
  const f = new Function(src + '\nreturn { toks: _rentaNombreTokens, parecidos: _rentaNombresParecidos };');
  ({ toks, parecidos } = f());
} catch(e){ ok('helpers evaluables solos', false); console.log('  ' + e.message); }

if (toks) {
  /* tokenización */
  ok('normaliza tildes/mayúsculas/puntuación', JSON.stringify(toks('  Tablón, de madera ')) === JSON.stringify(['TABLON','MADERA']));
  ok('singulariza: RODOS→RODO, TABLONES→TABLON, CAMAS→CAMA',
    toks('RODOS')[0] === 'RODO' && toks('TABLONES')[0] === 'TABLON' && toks('CAMAS')[0] === 'CAMA');
  ok('tira palabras vacías y números sueltos', JSON.stringify(toks('RODO PARA EL ANDAMIO DE 8')) === JSON.stringify(['RODO','ANDAMIO']));

  /* el caso real de Antonio */
  ok('RODOS ≈ RODO PARA ANDAMIO', parecidos('RODOS', 'RODO PARA ANDAMIO') > 0);
  ok('RODO PARA ANDAMIO ≈ RODO PARA ANDA (nombre cortado en el catálogo)', parecidos('RODO PARA ANDAMIO', 'RODO PARA ANDA') > 0);
  ok('ANDAMIOS ≈ MÓDULO ANDAMIO', parecidos('ANDAMIOS', 'MÓDULO ANDAMIO') > 0);

  /* lo que NO debe matchear */
  ok('TABLON ≉ CAMA PARA ANDAMIO (cero tokens en común)', parecidos('TABLON', 'CAMA PARA ANDAMIO') === 0);
  ok('prefijos enanos no valen: RO ≉ RODO', parecidos('RO', 'RODO PARA ANDAMIO') === 0);
  ok('el corto debe estar COMPLETO en el largo: RODO TABLON ≉ RODO PARA ANDAMIO', parecidos('RODO TABLON', 'RODO PARA ANDAMIO') === 0);

  /* puntaje: menos tokens sobrantes = mejor candidato */
  ok('a igual cobertura gana el nombre más ceñido',
    parecidos('RODOS', 'RODO PARA ANDAMIO') < parecidos('RODOS', 'RODO') && parecidos('RODOS', 'RODO') === 1);
}

/* ── 2. integración en el RENTAR del pedido ── */
const zFn = ex('window._herrRentarDePedido = async function');
ok('el generador usa el matcher tolerante', /_rentaNombresParecidos/.test(zFn));
ok('el match exacto sigue mandando (rango 2)', /matchKeyProducto/.test(zFn));
ok('solo compiten productos SE RENTA', /_prodRentaInfo\(q\)\.renta/.test(zFn));
ok('el diálogo muestra el nombre del pedido cuando difiere del catálogo', /dePedido/.test(zFn));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
