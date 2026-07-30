/* v1080 — QUE NADA SE PARTA EN EL PDF DE INVENTARIO (Antonio, 30-jul, 2ª vuelta):
   "el número se sigue viendo mal. Quiero que TODO se vea súper bien sin problema".
   v1079 puso espacio duro y la Q dejó de separarse del número, pero el NÚMERO MISMO seguía
   partiéndose ("Q 3,270.6" / "0") porque la columna era más angosta que su contenido: con
   la celda corta, el PDF corta donde sea. El espacio duro no alcanza — hay que DARLE a
   cada columna el ancho que de verdad necesita.
   Solución: medir el texto real con las fuentes del documento y fijar el ancho de cada
   columna numérica; si con eso no queda espacio decente para el nombre del material, se
   baja el tamaño de letra hasta que quepa. Determinista, sin adivinar. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zA = ex('function _invAnchosTabla(');
let f = null;
try { f = new Function('return (' + zA + ')')(); } catch(e){}
ok('existe _invAnchosTabla y es pura', !!f && zA.length > 250);

if (f) {
  /* medidor de mentira pero realista: cada carácter ocupa 0.55 × el tamaño de letra */
  const medir = (t, fs) => String(t).length * fs * 0.55;

  console.log('\n— 1. cada columna recibe el ancho que necesita —');
  const cols = [['BODEGA', '—', '24', '1,900'], ['TORRE 3', '236', '—'], ['TOTAL', '276'], ['VALOR', 'Q 3,270.60', 'Q 68,727.67']];
  const r = f(medir, cols, 760, 150);
  ok('devuelve un ancho por columna', Array.isArray(r.anchos) && r.anchos.length === 4);
  /* la prueba de fuego: el texto más largo de cada columna DEBE caber en su ancho */
  const cabe = cols.every((txts, i) => txts.every(t => medir(t, r.fontSize) <= r.anchos[i]));
  ok('el texto más largo de cada columna CABE (nada se parte)', cabe);
  ok('la columna del dinero es la más ancha', r.anchos[3] === Math.max.apply(null, r.anchos));
  ok('queda espacio decente para el nombre del material', 760 - r.anchos.reduce((a, b) => a + b, 0) >= 150);
  ok('con espacio de sobra no achica la letra', r.fontSize === 8);

  console.log('\n— 2. cuando hay muchas columnas, achica la letra en vez de partir —');
  const muchas = [];
  for (let i = 0; i < 16; i++) muchas.push(['NIVEL ' + (i + 1), '1,900']);
  muchas.push(['TOTAL', '4,113'], ['VALOR', 'Q 68,727.67']);
  const r2 = f(medir, muchas, 760, 150);
  ok('achica la letra para que entre todo', r2.fontSize < 8);
  ok('y aun así nada se parte', muchas.every((txts, i) => txts.every(t => medir(t, r2.fontSize) <= r2.anchos[i])));
  ok('avisa si ni con la letra mínima cabe', typeof r2.cabe === 'boolean');
  const r3 = f(medir, muchas, 300, 150);
  ok('caso imposible: no se cuelga y lo reporta', r3.fontSize >= 5 && r3.cabe === false);

  console.log('\n— 3. bordes —');
  ok('sin columnas no revienta', f(medir, [], 760, 150).anchos.length === 0);
  ok('columna vacía tiene ancho mínimo usable', f(medir, [[]], 760, 150).anchos[0] >= 10);
}

console.log('\n— 4. las dos tablas anchas lo usan —');
const z = ex('function _invReporteDoc(');
ok('el medidor sale del documento real (no de una tabla de anchos inventada)', /doc\.getTextWidth\(/.test(z));
ok('el consolidado fija el ancho de sus columnas', /_invAnchosTabla\([\s\S]{0,400}cons\.|_cAnchos/.test(z));
ok('la tabla de torre también', /_tAnchos|_invAnchosTabla\([\s\S]{0,400}T\.niveles/.test(z));
ok('y el apaisado ya cuenta las columnas del consolidado', /ordenTorres\.length \+ 2/.test(z));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
