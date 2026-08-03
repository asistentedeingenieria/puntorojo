/* v1115 — TRES ARREGLOS QUE REPORTÓ ANTONIO:

   (A) "el reporte NO me están saliendo las fotos" — 209 páginas, todas SIN FOTO.
   CAUSA: _repArmar busca fotos de la SEMANA pedida (la 36 = 3 al 7 de agosto, que recién
   arrancaba) y cae al reporte anterior si no hay. Pero era el PRIMER reporte de la obra: no
   había semana previa de dónde copiar, y las 242 fotos de ESSENZA son de semanas anteriores.
   Resultado: todas las unidades quedaban sin foto.
   FIX: última red — si no hay ni de la semana ni del reporte previo, se usan las DOS fotos más
   recientes que existan, de cualquier fecha. Sigue marcado repetido:true porque no es avance de
   esa semana, pero el reporte sale con contenido en vez de 209 recuadros vacíos.

   (B) "quitá el emoji donde dice reporte semanal".

   (C) "cuando se autoriza pago en efectivo, en vez de pedir subir factura necesito que pidas
   subir comprobante de la transferencia". En un anticipo en efectivo no hay factura de
   proveedor: lo que respalda el desembolso es el comprobante. Mismo paso y mismo campo, cambia
   lo que se le pide a la persona. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— A. el reporte ya no sale vacío —');
const zA = ex('function _repArmar(');
ok('_repArmar existe', zA.length > 400);
ok('sigue prefiriendo las fotos DE la semana', /_repFotosSemana\(x\.a, desdeTs, hastaTs\)/.test(zA));
ok('sigue cayendo al reporte anterior', /ultimo\[x\.a\.id\]/.test(zA));
ok('ÚLTIMA RED: las más recientes que existan', /_repFotosSemana\(x\.a, 0, hastaTs\)/.test(zA));
ok('el orden de las tres opciones es el correcto',
  zA.indexOf('desdeTs, hastaTs') < zA.indexOf('ultimo[x.a.id]') && zA.indexOf('ultimo[x.a.id]') < zA.indexOf('x.a, 0, hastaTs'));
ok('la foto vieja se marca como repetida (no es avance nuevo)',
  /_repFotosSemana\(x\.a, 0, hastaTs\)[\s\S]{0,200}repetido = true/.test(zA));

/* comportamiento real: una unidad con foto vieja YA no queda sin foto */
const deps = ex('function _repEtapasUnidad(') + '\n' + ex('function _repFotosSemana(') + '\n'
  + (html.match(/const REP_SEMANA_ANCLA = \{[^}]*\};/)||[''])[0] + '\n'
  + ex('function _repSemanaRango(') + '\n' + ex('function _repUnidadesDelReporte(');
let armar = null; try { armar = new Function(deps + '\nreturn (' + zA + ')')(); } catch(e){ console.log('   ('+e.message+')'); }
if (armar) {
  const vieja = new Date('2026-06-10T12:00:00').getTime();
  const P = { id:'p1', towers:[{ id:'t1', name:'T', levels:[{ id:'l1', name:'N', aptos:[
    { id:'a1', name:'101', stages:[true,true,false,false,false,false],
      photos:[['f1','f2','f3']], photoTs:[[vieja, vieja+1000, vieja+2000]] } ]}]}]};
  const rep = armar(P, 36, []);
  ok('EL CASO DE ANTONIO: primer reporte, fotos viejas → SÍ salen', rep.filas[0].fotos.length === 2);
  ok('y son las dos más recientes de las que hay', rep.filas[0].fotos.indexOf('f3') >= 0 && rep.filas[0].fotos.indexOf('f2') >= 0);
  ok('queda marcada como repetida', rep.filas[0].repetido === true);
  const sinNada = armar({ id:'p', towers:[{ id:'t', name:'T', levels:[{ id:'l', name:'N', aptos:[
    { id:'x', name:'1', stages:[true,false,false,false,false,false] } ]}]}]}, 36, []);
  ok('una unidad sin NINGUNA foto sigue reportando vacío (no inventa)', sinNada.filas[0].fotos.length === 0);
}

console.log('\n— B. sin emoji —');
ok('el botón no lleva emoji', !/📄[\s\S]{0,40}REPORTE SEMANAL/.test(html));
ok('el botón sigue ahí', /_repAbrir\(\)[\s\S]{0,300}REPORTE SEMANAL/.test(html));

console.log('\n— C. efectivo pide COMPROBANTE, no factura —');
/* la función NO es async: window._antAbrirSubirDoc = function(solId, tipo) */
const zD = ex('window._antAbrirSubirDoc = function(');
ok('el modal distingue el efectivo', /sol\.efectivo/.test(zD));
ok('pide comprobante de transferencia', /COMPROBANTE DE TRANSFERENCIA|COMPROBANTE DE LA TRANSFERENCIA/.test(zD));
ok('y sigue pidiendo factura cuando NO es efectivo', /FACTURA DEL PRODUCTO/.test(zD));
ok('la tarjeta también cambia el rótulo', /COMPROBANTE DE LA TRANSFERENCIA/.test(html) && /_esEf/.test(html));
ok('el botón dice SUBIR COMPROBANTE', /SUBIR COMPROBANTE/.test(html));
ok('no se agregó un campo nuevo: usa el mismo archivo', !/comprobanteUrl/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
