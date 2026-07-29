/* v1049 — EL PICKER PEGADO AL FONDO SE SALÍA DE LA PANTALLA.
   Antonio (con foto: el desplegable de OBRA en COLABORADORES con un solo resultado): "la
   lista no se ve y no me deja hacer scroll para abajo para poder verla."

   CAUSA: _abrirPicker exigía MÍNIMO 160px de alto (Math.max(160, ...)) aunque abajo del
   ancla quedaran ~90px — el panel desbordaba la ventana, y como es position:fixed el scroll
   de la página no lo alcanza (y encima el scroll CIERRA el picker, v932). Círculo perfecto.

   FIX: si abajo no caben 160px, el panel SE SUBE lo justo para caber (puede tapar el ancla —
   trae su propio BUSCAR adentro). NO se voltea hacia arriba: la regla v967 de Antonio
   ("siempre hacia abajo") se conserva en el caso normal. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker, from){ let m=html.indexOf(marker, from||0); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la geometría, PURA —');
const zG = ex('function _pickerGeom(');
let geom = null;
try { geom = new Function('return (' + zG + ')')(); } catch(e){}
ok('existe', typeof geom === 'function');
if (geom) {
  /* EL CASO DE LA FOTO: ancla a 851px en ventana de ~950px — antes el panel exigía 160 y
     terminaba en 1015px (65px afuera). Ahora entero adentro. */
  const foto = geom(851, 950);
  ok('el panel cabe COMPLETO en la ventana', foto.top + foto.maxH <= 950 - 4);
  ok('con alto usable (no una rendija)', foto.maxH >= 160);
  /* caso normal: ancla arriba — comportamiento de siempre, hacia abajo */
  const normal = geom(300, 950);
  ok('con espacio, abre hacia abajo como siempre', normal.top === 304 && normal.maxH === 280);
  ok('y también cabe', normal.top + normal.maxH <= 950);
  /* ventana chiquita (celular apaisado): nunca top negativo */
  const chica = geom(200, 240);
  ok('en ventana chica no se sale por arriba', chica.top >= 8 && chica.top + chica.maxH <= 240);
} else { ['cabe','usable','normal','normal cabe','chica'].forEach(n => ok(n, false)); }

console.log('\n— 2. el picker la usa —');
const zP = ex('function _abrirPicker(');
ok('_abrirPicker calcula con la función pura', /_pickerGeom\(/.test(zP));
ok('ya no está el mínimo ciego que desbordaba', !/Math\.max\(160, Math\.min\(280, window\.innerHeight - r\.bottom/.test(zP));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
