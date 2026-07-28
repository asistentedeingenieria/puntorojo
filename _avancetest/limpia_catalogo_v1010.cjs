/* v1010 — LIMPIA DEL CATÁLOGO (pedido de Antonio 28-jul):
   "Dame una lista de los que no tienen proveedor y dame la opcion de agregarles proveedor o
    eliminarlos para hacer una limpia. Igual dame la opcion de poder ponerles precio. La
    unidad colocala tu con tu logica."
   Y antes: AGUA PURA SALVAVIDAS GARRAFON (Excel de compras) y AGUA PURIFICADA GARRAFON
   (HINCAPIE) son EL MISMO material — "quiero verlo una sola vez".

   Ninguna fórmula junta esos dos nombres (no comparten ni una palabra clave), así que la
   unión la declara Antonio a mano. Se guarda como una CORRECCIÓN del catálogo, no tocando
   _ocItemMemKey: esa clave sella los saldos de bodegaMovs, los flags de bodega y los items
   congelados de pedidos y OCs — cambiarla partiría el inventario histórico en dos. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── 1. UN solo contenedor para las dos correcciones ──
/* Un array con tipo, en vez de dos arrays: un solo bloque de merge, un solo tombstone,
   una sola superficie de sync nueva. */
ok('existe el store de correcciones', html.includes('function _matFixStore('));
ok('con union-merge por id en applyRemote', /matFix/.test(html) && /_mergeById\(\s*[^)]*matFix/.test(html.replace(/\s+/g, ' ')));
ok('y su tombstone', html.includes('matFixEliminados'));
/* el proyecto no declara estos arrays en un state inicial: los crea el accessor la primera
   vez (mismo patrón que _bodegaMovsList y _getProveedores) */
ok('el accessor lo crea si no existe', /if \(!Array\.isArray\(state\.matFix\)\) state\.matFix = \[\]/.test(html));
ok('el índice se refresca después del merge', /_matFixReset\(\)/.test(html.slice(html.indexOf('merged.matFix ='), html.indexOf('merged.matFix =') + 1200)));

// ── 2. las correcciones se aplican al armar la lista ──
const zProds = ex('function _bodegaProductosGlobal(');
ok('la lista colapsa los nombres unidos', /_matAliasCanon\(|_matAliasMap\(/.test(zProds));
ok('y esconde los eliminados', /_matEstaOculto\(/.test(zProds));

// ── 3. se comporta ──
const FIX = [
  { id:'f1', tipo:'ALIAS', key:'AGUA PURIFICADA GARRAFON', hacia:'AGUA PURA SALVAVIDAS GARRAFON', ts:2, _ts:2 },
  { id:'f2', tipo:'OCULTO', key:'MATERIAL QUE YA NO USO', ts:1, _ts:1 },
];
const ctxFix = {
  state: { matFix: FIX },
  _matFixStore: () => FIX,
  _ocItemMemKey: s => String(s||'').toUpperCase().replace(/\s+/g,' ').trim(),
};
let fCanon = null, fOculto = null;
try {
  const src = [ex('function _matAliasMap('), ex('function _matAliasCanon('), ex('function _matEstaOculto('), ex('function _matFixReset(')].filter(Boolean).join('\n');
  const f = new Function(...Object.keys(ctxFix), src + '\n return { canon: _matAliasCanon, oculto: _matEstaOculto };');
  const r = f(...Object.values(ctxFix));
  fCanon = r.canon; fOculto = r.oculto;
} catch(e){ console.log('   (no evaluable: ' + e.message + ')'); }

if (fCanon && fOculto) {
  ok('el nombre unido apunta al canónico', fCanon('AGUA PURIFICADA GARRAFON') === 'AGUA PURA SALVAVIDAS GARRAFON');
  ok('el canónico se queda como está', fCanon('AGUA PURA SALVAVIDAS GARRAFON') === 'AGUA PURA SALVAVIDAS GARRAFON');
  ok('un material sin corrección no se toca', fCanon('LAMINA DE FIBROCEMENTO') === 'LAMINA DE FIBROCEMENTO');
  ok('el eliminado queda oculto', fOculto('MATERIAL QUE YA NO USO') === true);
  ok('los demás no', fOculto('AGUA PURA SALVAVIDAS GARRAFON') === false);
  /* TRAMPA: si alguien une A→B y después B→C, una resolución ingenua deja A en B.
     Y si une A→B y B→A, un while() ingenuo se cuelga para siempre. */
  const CAD = [
    { id:'c1', tipo:'ALIAS', key:'A', hacia:'B', _ts:1 },
    { id:'c2', tipo:'ALIAS', key:'B', hacia:'C', _ts:2 },
    { id:'c3', tipo:'ALIAS', key:'X', hacia:'Y', _ts:3 },
    { id:'c4', tipo:'ALIAS', key:'Y', hacia:'X', _ts:4 },
  ];
  try {
    const src2 = [ ex('function _matAliasMap('), ex('function _matAliasCanon(')].filter(Boolean).join('\n');
    const f2 = new Function('state', '_matFixStore', '_ocItemMemKey', src2 + '\n return _matAliasCanon;');
    const c2 = f2({ matFix: CAD }, () => CAD, s => String(s||'').toUpperCase().trim());
    ok('la cadena A→B→C resuelve hasta el final', c2('A') === 'C');
    let colgo = false;
    const t0 = Date.now();
    try { c2('X'); } catch(e){ colgo = true; }
    ok('el círculo A→B→A no cuelga la app', !colgo && (Date.now() - t0) < 1000);
  } catch(e){ ok('cadena y círculo', false); ok('círculo', false); }
} else {
  ['canónico','se queda','sin corrección','oculto','los demás','cadena','círculo'].forEach(n => ok(n + ' (evaluable)', false));
}

// ── 4. la pantalla de limpia ──
const zLimpia = ex('function _abrirLimpiaCatalogo(');
ok('existe la pantalla', zLimpia.length > 300);
ok('lista los materiales SIN proveedor', /!x\.precio|x\.precio\s*\?|sinProv/.test(zLimpia));
ok('deja asignarles proveedor y precio', html.includes('window._limpiaAsignar'));
ok('deja unirlos a otro material', html.includes('window._limpiaUnir'));
ok('deja eliminarlos', html.includes('window._limpiaEliminar'));
ok('se puede deshacer una corrección', html.includes('window._limpiaDeshacer'));
ok('tiene buscador unificado (v960)', /class="pr-buscador"/.test(zLimpia));
ok('la unidad la pone el clasificador, no el usuario', /_bodegaUnidadDelNombre\(|x\.u/.test(zLimpia));

// ── 5. quién puede ──
/* El catálogo maestro es SOLO ADMINISTRADOR (dice el propio encabezado del modal); eliminar
   materiales y declarar equivalencias es de la misma familia. */
ok('la limpia es solo de quien administra', /users\.manage/.test(zLimpia) || /_puedeLimpiarCatalogo/.test(html));

// ── 6. reglas de sync ──
const zAdd = ex('function _matFixAdd(');
ok('cada corrección sella su _ts', /const t = Date\.now\(\)/.test(zAdd) && /_ts: t/.test(zAdd));
ok('y queda firmada por quien la hizo', /por:/.test(zAdd) && /porUsername/.test(zAdd));
/* la primera aparición de window._limpiaX es el onclick del botón; la definición se busca
   por su asignación */
const zDeshacer = ex('window._limpiaDeshacer = function');
const zAsignar  = ex('window._limpiaAsignar = function');
ok('deshacer escribe tombstone, no borra en silencio', /matFixEliminados/.test(zDeshacer));
/* Asignar proveedor SÍ escribe el catálogo (es su propósito), y ese array es LAST-WRITE-WINS:
   tiene que subir de inmediato para achicar la ventana en que otro lo pisa. */
ok('asignar sube de inmediato (el catálogo es LWW)', /forceUploadNow/.test(zAsignar));
ok('y tira los índices que quedaron viejos', /_precioIndexReset\(\)/.test(zAsignar));
ok('no duplica el producto si el proveedor ya lo tenía', /yaEsta/.test(zAsignar));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
