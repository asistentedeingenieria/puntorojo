/* v878: el usuario SOLO LECTURA (view.*) ve la app COMPLETA:
   (1) pestaña PERSONAL visible (antes _puedeVerPersonalSeccion exigía permisos explícitos);
   (2) TODAS las sub-pestañas de LIQUIDACIONES (antes _antSoloVer/_v404bEsDescuentosOnly lo
       confundían con el rol "solo-ver anticipos" y lo acotaban a ANTICIPOS);
   (3) badges de pendientes VISIBLES (antes los contadores solo contaban "lo que YO debo atender"
       según permisos de acción → siempre 0 para el solo-lectura). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) PERSONAL visible para solo-lectura — pestaña Y sub-pestañas (v879)
ok('_puedeVerPersonalSeccion abre para isReadOnly', /_puedeVerPersonalSeccion\(\)\{ if \(typeof isReadOnly==='function' && isReadOnly\(\)\) return true;/.test(html));
ok('_puedeVerColaboradores abre para isReadOnly', /_puedeVerColaboradores\(\)\{ if \(typeof isReadOnly==='function' && isReadOnly\(\)\) return true;/.test(html));
ok('_puedeVerAsistencia abre para isReadOnly', /_puedeVerAsistencia\(\)\{ if \(typeof isReadOnly==='function' && isReadOnly\(\)\) return true;/.test(html));

// 2) los filtros de sub-pestañas NO atrapan al solo-lectura
ok('_antSoloVer devuelve false para isReadOnly', /_antSoloVer = function\(\)\{ try \{ if \(typeof isReadOnly==='function' && isReadOnly\(\)\) return false;/.test(html));
ok('_v404bEsDescuentosOnly devuelve false para isReadOnly', /_v404bEsDescuentosOnly\(\)\{ try \{ if \(typeof isReadOnly==='function' && isReadOnly\(\)\) return false;/.test(html));

// 3) badges: el solo-lectura cuenta TODOS los pendientes
ok('_cntAnticipoPend tiene rama solo-lectura', /_cntAnticipoPend = function\(\)\{ try\{ if\(typeof isReadOnly==='function' && isReadOnly\(\)\)/.test(html));
ok('_cntPagoEtapaPend cuenta también para solo-lectura', /if\(_prGerAuth\(\) \|\| \(typeof isReadOnly==='function' && isReadOnly\(\)\)\)\{/.test(html));
ok('_cntAdmin358Pend cuenta también para solo-lectura', /can\('users\.manage'\) \|\| \(typeof isReadOnly==='function' && isReadOnly\(\)\)\)\) return \(\(typeof state/.test(html));
ok('_cntOCsPend cuenta también para solo-lectura', /can\('compras\.autorizar'\)\|\|can\('users\.manage'\)\|\|\(typeof isReadOnly==='function' && isReadOnly\(\)\)/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
