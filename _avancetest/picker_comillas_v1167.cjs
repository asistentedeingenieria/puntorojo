/* v1167 — LA COMILLA DE PULGADAS ROMPÍA TODO DESPLEGABLE

   Antonio (11-ago): "En abastecimiento cuando le quiero poner la presentación a la OC del
   producto NO me lo está cambiando."

   CAUSA RAÍZ (no era el handler ni el select): el picker v967 —el desplegable con buscador
   que en escritorio reemplaza a TODOS los <select>— escribía el valor elegido dentro de un
   atributo HTML SIN ESCAPAR:

       '<div class="_prPickerIt" data-id="' + String(x.id) + '" ...>'

   Con un material como CLAVO CON ROLDANA 1" eso produce:

       data-id="CLAVO CON ROLDANA 1""
                                    ^ el parser CIERRA el atributo acá

   así que el valor que vuelve es CLAVO CON ROLDANA 1 (sin la comilla). Ese texto ya no
   coincide con ninguna <option>, el navegador deja sel.value = '' y el onchange recibe
   cadena vacía — que para updateOcItemVariante significa "ninguna presentación". Por eso el
   selector volvía al placeholder y no cambiaban ni el nombre ni el precio.

   ALCANCE: no es un bug del modal de OC. Muerde en CUALQUIER desplegable cuyo valor lleve
   comillas — y en esta app el catálogo entero las usa como pulgadas (1", 2½", 1 5/8").

   EL FIX: dejar de viajar el valor por el atributo. La fila lleva su POSICIÓN en la lista
   (un número, imposible de romper con ningún carácter) y el id se resuelve del arreglo en
   memoria. De paso el label se escapa: hoy se inyecta crudo como HTML.

   REGLA: ningún dato de usuario viaja por un atributo HTML construido con concatenación.
   O va escapado, o —mejor— no viaja: se pasa un índice y el dato queda en memoria. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* Así lee un atributo el parser del navegador: corta en la PRIMERA comilla de cierre.
   Es exactamente el mecanismo que rompía el valor. */
function leerAtributo(frag, nombre){
  const m = frag.match(new RegExp(nombre + '="([^"]*)"'));
  return m ? m[1] : null;
}

const PULGADA = 'CLAVO CON ROLDANA 1"';
const ITEMS = [
  { id: '', label: '— ELEGIR PRESENTACIÓN (2) —' },
  { id: PULGADA, label: PULGADA },
  { id: 'CAJA CLAVO CON ROLDANA 1"', label: 'CAJA CLAVO CON ROLDANA 1"' },
];

console.log('— la función pura que pinta las filas —');
const src = ex(code, 'function _pickerFilas(');
ok('existe _pickerFilas', !!src);

let filas = null;
if (src) {
  const f = new Function(src + '\nreturn _pickerFilas;')();

  console.log('\n— EL BUG: el valor con comillas debe sobrevivir el viaje —');
  filas = f(ITEMS, '', '');
  const frag = String(filas).split('</div>')[1] + '</div>';   // la fila del clavo con pulgadas
  ok('la fila NO lleva el valor crudo en un atributo', frag.indexOf('data-id="' + PULGADA) < 0);
  const idx = leerAtributo(frag, 'data-i');
  ok('la fila se identifica por un ÍNDICE numérico', idx !== null && /^[0-9]+$/.test(idx));
  ok('ese índice resuelve al item EXACTO, con su comilla', ITEMS[Number(idx)] && ITEMS[Number(idx)].id === PULGADA);

  console.log('\n— el label se escapa (hoy se inyecta crudo) —');
  const conHtml = f([{ id: 'x', label: '<img src=x onerror=alert(1)>' }], '', '');
  ok('un label con etiquetas no inyecta HTML', conHtml.indexOf('<img') < 0);
  ok('el label escapado sigue siendo legible', conHtml.indexOf('&lt;img') >= 0);

  console.log('\n— el filtro del buscador sigue funcionando —');
  ok('filtra por texto del label', f(ITEMS, 'CAJA', '').split('_prPickerIt').length - 1 === 1);
  ok('sin filtro devuelve todas', f(ITEMS, '', '').split('_prPickerIt').length - 1 === ITEMS.length);
  ok('el índice es el de la lista FILTRADA (no la original)',
    Number(leerAtributo(f(ITEMS, 'CAJA', ''), 'data-i')) === 0);

  console.log('\n— la fila seleccionada se resalta —');
  ok('marca la seleccionada', f(ITEMS, '', PULGADA).indexOf('#FEF2F2') >= 0);
  ok('sin selección no resalta ninguna', f(ITEMS, '', '__nada__').indexOf('#FEF2F2') < 0);

  console.log('\n— sin resultados —');
  ok('avisa cuando el filtro no encuentra nada', /SIN RESULTADOS/.test(f(ITEMS, 'ZZZZ', '')));
}

console.log('\n— el consumidor usa el índice, no el valor —');
const abrir = ex(code, 'function _abrirPicker(');
ok('_abrirPicker pinta con _pickerFilas', /_pickerFilas\(/.test(abrir));
ok('el click resuelve el item por índice', /dataset\.i\b/.test(abrir));
ok('ya NO lee dataset.id', !/dataset\.id\b/.test(abrir));
ok('onPick recibe el id resuelto del arreglo en memoria', /onPick\(/.test(abrir));

console.log('\n— blindaje: si el valor no entra en el select, se avisa (no silencio) —');
const inter = ex(code, "document.addEventListener('mousedown', function(ev){");
ok('tras asignar, verifica que el select TOMÓ el valor', /_pickerAsignoBien|sel\.value !== id/.test(inter));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
