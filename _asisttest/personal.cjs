/* TDD: blindaje de personalGlobal en el sync (Bug 1 "se borra una persona" + Bug 2 "obra se revierte").
   _mergePersonal une por id (el remoto NUNCA borra uno local que no trae), elige por _ts más nuevo
   (una edición local nueva gana a una copia vieja remota), y respeta tombstones por id (borrado real). */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _mergePersonal\([\s\S]*?\n\}/);
if (!m) { console.log('NO _mergePersonal FOUND'); process.exit(2); }
const fn = new Function(m[0] + '\nreturn _mergePersonal;')();

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));
const byId = list => { const o = {}; list.forEach(p => o[p.id] = p); return o; };

// Bug 1: persona local que el remoto NO trae → se conserva (no se borra de la nada)
{
  const local = [{ id: 'a', nombre: 'ANA', _ts: 5 }, { id: 'b', nombre: 'BETO', _ts: 5 }];
  const remote = [{ id: 'a', nombre: 'ANA', _ts: 5 }]; // a BETO no lo trae (copia vieja)
  const r = fn(local, remote, {});
  ok('Bug1: conserva persona local ausente en remoto', !!byId(r.list)['b']);
  ok('Bug1: marca changed para re-subir', r.changed === true);
}
// Bug 2: edición local más nueva (obra) gana a la copia vieja del remoto
{
  const local = [{ id: 'a', nombre: 'ANA', obraAsignada: 'X', _ts: 100 }];
  const remote = [{ id: 'a', nombre: 'ANA', obraAsignada: '', _ts: 50 }];
  const r = fn(local, remote, {});
  ok('Bug2: gana la edicion local mas nueva (_ts)', byId(r.list)['a'].obraAsignada === 'X');
}
// Remoto más nuevo gana (otro admin cambió después)
{
  const local = [{ id: 'a', obraAsignada: 'X', _ts: 50 }];
  const remote = [{ id: 'a', obraAsignada: 'Y', _ts: 100 }];
  const r = fn(local, remote, {});
  ok('remoto mas nuevo gana', byId(r.list)['a'].obraAsignada === 'Y');
}
// Tombstone: persona borrada de verdad NO revive
{
  const local = [{ id: 'a', _ts: 5 }, { id: 'b', _ts: 5 }];
  const remote = [{ id: 'a', _ts: 5 }];
  const r = fn(local, remote, { b: 1 }); // b fue borrada
  ok('tombstone: b borrada no revive', !byId(r.list)['b']);
}
// Remoto-only se mantiene
{
  const r = fn([], [{ id: 'z', _ts: 1 }], {});
  ok('remoto-only se mantiene', !!byId(r.list)['z']);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
