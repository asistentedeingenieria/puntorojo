/* v829: quitas de UI en AVANCE.
   1) El "+" (AGREGAR APTO) del encabezado de cada nivel se quita; la "×" (ELIMINAR NIVEL) queda.
   2) Los 3 botones IMPORTAR (FISICO / DESPACHO / PAGOS) se quitan; la función abrirImportarAvance
      sigue definida (se usa para aplicar cambios manuales por consola). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

// 1) "+" fuera, "×" dentro
ok('el botón "+" AGREGAR APTO se quitó', !/title="AGREGAR APTO">\+<\/button>/.test(html));
ok('ya no se llama openNewApto desde un botón +', !/onclick="openNewApto\([^)]*\)" title="AGREGAR APTO"/.test(html));
ok('la "×" ELIMINAR NIVEL ya NO existe (v877: el user pidió quitarla)', !/title="ELIMINAR NIVEL">✕<\/button>/.test(html));

// 2) ningún botón llama a abrirImportarAvance
ok('ningún onclick llama abrirImportarAvance', !/onclick="abrirImportarAvance\(/.test(html));
ok('no queda el texto de botón "IMPORTAR AVANCE"', !/>IMPORTAR AVANCE<\/button>/.test(html));
ok('no quedan botones IMPORTAR de despacho/pago (abrirImportarAvance en botón)', (html.match(/<button[^>]*abrirImportarAvance/g) || []).length === 0);

// 3) la función abrirImportarAvance sigue definida (para consola)
ok('abrirImportarAvance sigue definida', /function abrirImportarAvance\(/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
