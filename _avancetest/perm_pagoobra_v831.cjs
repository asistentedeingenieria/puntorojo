/* v831: permiso especial 'personal.pagoObra' para elegir QUIÉN puede marcar
   "COBRA EN PLANILLA DE OBRA". Antes lo veía cualquiera con personal.edit; ahora solo
   quien tenga el permiso nuevo (o admin/users.manage). El checkbox y la acción toggle
   se gatean por el permiso nuevo. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

// 1) catálogo de permisos: entrada nueva en EDICIÓN PERSONAL
ok('catálogo tiene personal.pagoObra en EDICIÓN PERSONAL',
  /\{ key: 'personal\.pagoObra',\s*label: '[^']*COBRA EN PLANILLA DE OBRA[^']*',\s*group: 'EDICIÓN PERSONAL' \}/.test(html));

// 2) helper canPagoObra junto a canEd
ok('define canPagoObra = personal.pagoObra || users.manage',
  /const canPagoObra=\(typeof can==='function'\)&&\(can\('personal\.pagoObra'\)\|\|can\('users\.manage'\)\)/.test(html));

// 3) el checkbox COBRA EN PLANILLA DE OBRA se gatea por canPagoObra (no por canEd)
ok('el checkbox usa canPagoObra', /\$\{\(c\.tipo!=='OFICINA'&&canPagoObra\)\?`<div class="colab-row"[^`]*COBRA EN PLANILLA DE OBRA/.test(html));
ok('el checkbox ya NO se gatea por canEd', !/\$\{\(c\.tipo!=='OFICINA'&&canEd\)\?`<div class="colab-row"[^`]*COBRA EN PLANILLA DE OBRA/.test(html));

// 4) la acción toggle exige el permiso nuevo (doble candado)
ok('_togglePagoObra exige personal.pagoObra',
  /function _togglePagoObra\(personaId\)\{\s*if\(typeof can==='function' && !\(can\('personal\.pagoObra'\)\|\|can\('users\.manage'\)\)\)/.test(html));

// 5) lógica pura del candado (replica can: '*' concede todo)
function puedeMarcar(perms){
  perms = perms || [];
  if (perms.includes('*')) return true;
  return perms.includes('personal.pagoObra') || perms.includes('users.manage');
}
ok('admin (*) puede', puedeMarcar(['*']) === true);
ok('users.manage puede', puedeMarcar(['users.manage']) === true);
ok('con el permiso nuevo puede', puedeMarcar(['personal.pagoObra']) === true);
ok('solo personal.edit YA NO alcanza', puedeMarcar(['personal.edit']) === false);
ok('sin permisos no puede', puedeMarcar([]) === false);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
