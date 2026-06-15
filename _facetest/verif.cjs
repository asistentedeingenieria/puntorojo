/* TDD del fix: _verificarCaraEnNube debe leer el doc CORRECTO (appState/faces),
   no appState/core. Desde v633 las caras se mudaron a appState/faces y se QUITAN
   del core antes de subir, así que leer core SIEMPRE daba falso "no subió".
   Extrae la función REAL de index.html e inyecta un firebase falso. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/async function _verificarCaraEnNube\([\s\S]*?\n\}/);
if (!m) { console.log('NO _verificarCaraEnNube FOUND'); process.exit(2); }

// firebase falso: devuelve coreData para appState/core y facesData para appState/faces.
function makeFirebase(coreData, facesData){
  return { firestore: () => ({ collection: (col) => ({ doc: (id) => ({ get: async () => ({
    data: () => {
      if (col === 'appState' && id === 'core') return coreData;
      if (col === 'appState' && id === 'faces') return facesData;
      return {};
    }
  }) }) }) }) };
}
const make = (coreData, facesData) =>
  new Function('firebase', m[0] + '\nreturn _verificarCaraEnNube;')(makeFirebase(coreData, facesData));

(async () => {
  let pass = 0, fail = 0;
  const ok = (name, cond) => cond ? pass++ : (fail++, console.log('FAIL ' + name));

  const ID = 'p1';
  // El core sube SIN la cara (se le quita en uploadCurrent). Así llega el core real.
  const coreSinCara = { personalGlobal: [{ id: 'p1', nombre: 'JUAN' }] };
  const facesCon   = { faces: { p1: { descriptors: [{ d: [0.1, 0.2] }], thumbURL: '' } } };
  const facesSin   = { faces: { p2: { descriptors: [{ d: [0.1] }] } } };
  const facesVacio = { faces: { p1: { descriptors: [] } } };

  // 1) EL BUG: la cara SÍ está en appState/faces aunque el core no la traiga → debe dar true.
  ok('cara en appState/faces (core sin cara) => true', (await make(coreSinCara, facesCon)(ID)) === true);
  // 2) Si NO está en faces → false (falla real, reportada bien).
  ok('cara NO en faces => false', (await make(coreSinCara, facesSin)(ID)) === false);
  // 3) descriptors vacíos → false.
  ok('descriptors vacios => false', (await make(coreSinCara, facesVacio)(ID)) === false);

  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})();
