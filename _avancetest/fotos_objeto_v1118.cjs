/* v1118 — LA CAUSA REAL DE "NO ME ESTÁN SALIENDO LAS FOTOS" (Antonio, tras 3 intentos míos).

   ESSENZA tiene 242 fotos cargadas y el reporte marcaba las 29 unidades como SIN FOTO. Yo había
   supuesto dos veces la causa (que no había fotos de esa semana, que faltaba un fallback) y las
   dos veces me equivoqué. El diagnóstico en consola lo destapó con un error clarísimo:
       "(a.photos || []).reduce is not a function"

   a.photos NO es un arreglo indexado por etapa — es un OBJETO con la etapa como clave STRING:
       photos  = { "5": ["url1", "url2"] }
       photoTs = { "5": [1783519795812, 1783519814765, ...] }

   El lector hacía `for (e = 0; e < ph.length; e++)` y en un objeto `.length` es undefined, así
   que la condición era `0 < undefined` = false: el bucle NUNCA corría. Ninguna foto se leía
   jamás, sin importar la semana ni los fallbacks que le agregué.

   LECCIÓN (la misma de la plancha DUBAI): antes de afinar la lógica, verificar que la ESTRUCTURA
   que se está leyendo sea la real. Dos versiones perdidas por no mirar el dato primero. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('function _repFotosSemana(');
ok('existe _repFotosSemana', z.length > 200);
ok('recorre las claves del objeto, no un índice numérico', /Object\.keys\(ph\)/.test(z));
ok('ya NO usa ph.length', !/e < ph\.length/.test(z));

let f = null; try { f = new Function('return (' + z + ')')(); } catch(e){ console.log('   ('+e.message+')'); }
if (f) {
  console.log('\n— LA ESTRUCTURA REAL de Antonio —');
  /* copiada del diagnóstico: TORRE 3 · NIVEL 9 · APARTAMENTO 901 */
  const real = {
    photos:  { "5": ['https://firebasestorage.googleapis.com/a.jpg','https://firebasestorage.googleapis.com/b.jpg'] },
    photoTs: { "5": [1783519795812, 1783519814765, 1783519824030, 1783519844329] }
  };
  const r = f(real, 0, 9e15);
  ok('AHORA SÍ encuentra las fotos', r.length === 2);
  ok('devuelve las urls, no los índices', /firebasestorage/.test(r[0]));
  ok('la más reciente primero', r[0].indexOf('b.jpg') >= 0);

  console.log('\n— los ts desalineados no rompen nada —');
  /* en el dato real hay 4 marcas de tiempo para 2 fotos */
  ok('con más ts que fotos sigue devolviendo las fotos que hay', f(real, 0, 9e15).length === 2);
  const sinTs = { photos: { "3": ['u1','u2','u3'] } };
  ok('sin photoTs las toma igual (ts 0 = sin fecha, no las descarta)', f(sinTs, 0, 9e15).length === 2);

  console.log('\n— sigue filtrando por fecha cuando SÍ hay —');
  const T = 1783519795812;
  ok('fuera del rango no entra', f(real, T + 999999999, T + 999999999 + 1000).length === 0);
  ok('dentro del rango entra', f(real, T - 1000, T + 1000).length >= 1);

  console.log('\n— varias etapas —');
  const multi = { photos: { "1": ['a'], "4": ['b'] }, photoTs: { "1": [100], "4": [200] } };
  const rm = f(multi, 0, 9e15);
  ok('junta fotos de distintas etapas', rm.length === 2);
  ok('y ordena por fecha, no por etapa', rm[0] === 'b');

  console.log('\n— sigue tolerando la forma vieja (arreglo) por si conviven datos —');
  ok('con arreglo también funciona', f({ photos: [['x','y']], photoTs: [[10,20]] }, 0, 9e15).length === 2);

  console.log('\n— basura —');
  ok('sin fotos', f({}, 0, 9e15).length === 0 && f(null, 0, 9e15).length === 0);
  ok('photos que no es objeto', f({ photos: 'texto' }, 0, 9e15).length === 0);
  ok('una clave que no trae arreglo', f({ photos: { "2": 'no-es-lista' } }, 0, 9e15).length === 0);
  ok('nunca devuelve más de dos', f({ photos: { "1": ['a','b','c','d'] } }, 0, 9e15).length === 2);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
