// Test de _mergeColaboradores (blindaje de colaboradores en el sync).
// Extrae la función REAL de index.html y la prueba.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/function _mergeColaboradores\([\s\S]*?\n\}/);
if (!m) { console.log('NO _mergeColaboradores FOUND'); process.exit(2); }
const _mergeColaboradores = new Function(m[0] + '\nreturn _mergeColaboradores;')();

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL ' + name); } }
function ids(r) { return (r.list || []).map(c => c.id).sort(); }

// 1) Adición: colaborador local que el remoto NO trae → se preserva + changed=true
{
  const local = [{ id: 'a', nombre: 'ANA' }, { id: 'b', nombre: 'BETO' }];
  const remote = [{ id: 'a', nombre: 'ANA' }];   // remoto viejo, sin BETO
  const r = _mergeColaboradores(local, remote, {});
  ok('add: preserva BETO local', JSON.stringify(ids(r)) === JSON.stringify(['a', 'b']));
  ok('add: changed=true (re-sync)', r.changed === true);
}

// 2) Borrado: tombstone quita el id de la unión (no resucita)
{
  const local = [];                               // borrado local
  const remote = [{ id: 'a', nombre: 'ANA' }];    // otro celular todavía lo trae
  const r = _mergeColaboradores(local, remote, { a: true });
  ok('del: tombstone quita "a"', JSON.stringify(ids(r)) === JSON.stringify([]));
}

// 3) Mismo id en ambos → unión sin duplicar
{
  const local = [{ id: 'a', nombre: 'ANA' }];
  const remote = [{ id: 'a', nombre: 'ANA-EDIT' }];
  const r = _mergeColaboradores(local, remote, {});
  ok('dup: un solo "a"', JSON.stringify(ids(r)) === JSON.stringify(['a']));
  ok('dup: gana el remoto en mismo id', r.list[0].nombre === 'ANA-EDIT');
  ok('dup: changed=false', r.changed === false);
}

// 4) Solo remoto → se queda, changed=false
{
  const r = _mergeColaboradores([], [{ id: 'a' }, { id: 'b' }], {});
  ok('remote-only: ambos', JSON.stringify(ids(r)) === JSON.stringify(['a', 'b']));
  ok('remote-only: changed=false', r.changed === false);
}

// 5) Entradas nulas/vacías → sin crash
{
  const r = _mergeColaboradores(null, undefined, null);
  ok('null: lista vacía', JSON.stringify(r.list) === JSON.stringify([]));
}

// 6) Borrado + adición a la vez: tombstone "a", local agrega "c"
{
  const local = [{ id: 'c', nombre: 'CARLOS' }];
  const remote = [{ id: 'a', nombre: 'ANA' }];
  const r = _mergeColaboradores(local, remote, { a: true });
  ok('mix: queda solo "c"', JSON.stringify(ids(r)) === JSON.stringify(['c']));
  ok('mix: changed=true', r.changed === true);
}

// 7) Tombstone por NOMBRE normalizado (no por id) → quita por nombre
{
  const r = _mergeColaboradores([], [{ id: 'x1', nombre: 'JUAN PEREZ' }], { 'JUAN PEREZ': 123 });
  ok('name-tomb: quita por nombre', JSON.stringify(ids(r)) === JSON.stringify([]));
}

// 8) Tombstone por nombre con acentos/espacios → normaliza igual que _normName
{
  const r = _mergeColaboradores([], [{ id: 'x2', nombre: '  José   Pérez ' }], { 'JOSE PEREZ': 1 });
  ok('name-tomb: normaliza acento/espacios', JSON.stringify(ids(r)) === JSON.stringify([]));
}

// 9) Nombre NO tombstoneado se conserva aunque otro sí lo esté
{
  const r = _mergeColaboradores([], [{ id: 'x3', nombre: 'ANA' }, { id: 'x4', nombre: 'BETO' }], { 'ANA': 1 });
  ok('name-tomb: conserva BETO, quita ANA', JSON.stringify(ids(r)) === JSON.stringify(['x4']));
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
