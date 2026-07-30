/* v1074 — CORRUPCIÓN DEL CATÁLOGO + SUBIDA POR CADA TECLA (regresiones que introduje en v1070).
   Halladas por la revisión adversarial de perf y verificadas a mano:
   1. _fuseProds llamaba matchKeyProducto(pr) con el OBJETO producto; esa función espera el
      NOMBRE (normProducto(String(nombre))). Resultado: TODOS los productos colapsaban a la
      clave "[OBJECT OBJECT]" → la fusión no fusionaba nada y podía PISAR filas del catálogo
      (y con win.productos vacío, dejar el proveedor con un solo producto).
   2. Lo fusionado no marcaba needsResync → se quedaba local y nunca subía (justo el síntoma
      "no me cambia el precio" que v1070 decía cerrar).
   3. Los dos needsResync nuevos de v1070 no respetaban SOLO LECTURA: para esos usuarios la
      subida es no-op, así que marcarlo solo cicla (el comentario de applyRemote ya lo avisa).
   4. nombre y unidad del catálogo usan oninput y v1070 les metió saveState+forceUploadNow →
      serializar el state y subir el core POR CADA TECLA. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la clave de fusión sale del NOMBRE, no del objeto —');
const iF = html.indexOf('const _fuseProds = function');
const zF = iF > -1 ? html.slice(iF, html.indexOf('\n        };', iF) + 11) : '';
ok('existe _fuseProds', zF.length > 200);
ok('la clave usa pr.nombre (no el objeto entero)', /matchKeyProducto\(pr && pr\.nombre\)|matchKeyProducto\(\(pr \|\| \{\}\)\.nombre\)/.test(zF));
let fuse = null;
try { fuse = new Function('matchKeyProducto', 'return (' + zF.replace(/^\s*const _fuseProds = /, '') .replace(/;\s*$/, '') + ')'); } catch(e){}
ok('se puede ejecutar aislada', !!fuse);
if (fuse) {
  const mk = n => String(n == null ? '' : n).trim().toUpperCase();
  const f = fuse(mk);
  /* dos personas editan productos DISTINTOS del mismo proveedor: deben quedar LOS DOS */
  const win = { id: 'p1', productos: [{ nombre: 'TORNILLO', precio: 1, _ts: 10 }, { nombre: 'CLAVO', precio: 2, _ts: 10 }] };
  const lose = { id: 'p1', productos: [{ nombre: 'TORNILLO', precio: 1, _ts: 10 }, { nombre: 'CLAVO', precio: 9, _ts: 99 }] };
  f(win, lose);
  ok('no se pierde ningún producto', win.productos.length === 2);
  ok('gana el precio con sello más nuevo', (win.productos.find(x => x.nombre === 'CLAVO') || {}).precio === 9);
  ok('el otro producto queda INTACTO (antes lo pisaba)', (win.productos.find(x => x.nombre === 'TORNILLO') || {}).precio === 1);
  /* producto que solo tiene uno de los dos: se agrega, no se descarta */
  const w2 = { id: 'p1', productos: [{ nombre: 'A', precio: 1 }] };
  f(w2, { id: 'p1', productos: [{ nombre: 'B', precio: 2 }, { nombre: 'C', precio: 3 }] });
  ok('los que faltaban se suman', w2.productos.length === 3);
  /* ganador SIN productos: debe absorber TODO el catálogo del perdedor, no solo uno */
  const w3 = { id: 'p1', productos: [] };
  f(w3, { id: 'p1', productos: [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }] });
  ok('ganador vacío absorbe el catálogo completo', w3.productos.length === 3);
  /* idempotente: correrlo dos veces no cambia nada (regla v856) */
  const antes = JSON.stringify(win.productos);
  f(win, lose);
  ok('idempotente (correrlo de nuevo no cambia nada)', JSON.stringify(win.productos) === antes);
}

console.log('\n— 2. lo fusionado SÍ sube; y solo-lectura no cicla —');
const iB = html.indexOf('const _spTomb = Object.assign');
const zB = iB > -1 ? html.slice(iB, iB + 3000) : '';
ok('la fusión marca que hay que re-subir', /_fusionoAlgo|_fuseCambio/.test(zB) && /needsResync = true/.test(zB));
ok('solicitudesPrecios respeta SOLO LECTURA', /_mSolPre\.changed && !\(typeof isReadOnly === 'function' && isReadOnly\(\)\)/.test(zB));
ok('proveedoresGlobales respeta SOLO LECTURA', /_mProv\.changed && !\(typeof isReadOnly === 'function' && isReadOnly\(\)\)/.test(zB));

console.log('\n— 3. el catálogo ya no sube el state entero por cada tecla —');
ok('nombre y unidad guardan al salir del campo (onchange), no en cada tecla', !/oninput="updateCatProvProducto\(\$\{origIdx\}, 'nombre'/.test(html) && !/oninput="updateCatProvProducto\(\$\{origIdx\}, 'unidad'/.test(html));
const zU = ex('function updateCatProvProducto(');
/* implementado como guard invertido: nombre/unidad salen ANTES del forceUploadNow */
ok('la subida inmediata queda solo para el PRECIO', /field !== 'precio'\)[\s\S]{0,120}return;[\s\S]{0,400}forceUploadNow/.test(zU));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
