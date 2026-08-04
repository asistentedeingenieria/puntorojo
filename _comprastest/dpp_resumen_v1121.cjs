/* v1121 — RESUMEN DE A DÓNDE SE FUE EL MATERIAL PRE-PAGADO (Antonio, 3-ago):
   "necesito que se pueda generar un resumen como la foto 4, solo que más bonito y que diga la
   fecha de descarga para saber si está actualizado el cuadro."
   La foto 4 es su tabla dinámica de Excel:
       TABLA ULTRALIGHT ½" X 4' X 8'
         COMPRA PRE-PAGO   4168
         ESSENZA - FASE 2   683
         VICINIA EL CARMEN  116
         RES. LOS ARCOS      25
         OFICINA PR           8
         Total general     5000

   El saldo sale de la MISMA cuenta que _dppSaldoDeMadre. Esto no es un detalle: en v1068
   Antonio reportó "tenemos diferentes datos de POR LIBERAR, DEBE DE ESTAR IGUAL" justamente
   porque dos pantallas calculaban por su cuenta. Un resumen que no cuadre con el saldo de la
   bodega sería el mismo problema otra vez. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function _dppResumenPorObra(');
ok('existe _dppResumenPorObra', zR.length > 400);
ok('es solo lectura', !/saveState|forceUploadNow/.test(zR));
ok('reusa el saldo oficial (no recalcula por su cuenta)', /_dppSaldoDeMadre\(madre, ordenes\)/.test(zR));

let f = null;
try {
  /* v1122: el motor resuelve el nombre de la obra con _dppNombreObraDestino (antes leía un
     campo que nunca se escribía y caía en "SIN OBRA") */
  f = new Function('_ocItemMemKey', ex('function _dppSaldoDeMadre(') + '\n' + ex('function _dppNombreObraDestino(') + '\n' + zR + '\nreturn _dppResumenPorObra;')
      (s => String(s||'').toUpperCase().trim());
} catch(e){ console.log('   ('+e.message+')'); }

if (f) {
  console.log('\n— EL CASO REAL DE ANTONIO (la tabla de la foto 4) —');
  const madre = { id:'m1', items:[{ name:'TABLA ULTRALIGHT', unidad:'u', qty:5000, precio:65 }] };
  const desp = [
    { refOcMadre:'m1', destinoProyectoNombre:'ESSENZA - FASE 2',  items:[{name:'TABLA ULTRALIGHT', qty:219}] },
    { refOcMadre:'m1', destinoProyectoNombre:'ESSENZA - FASE 2',  items:[{name:'TABLA ULTRALIGHT', qty:464}] },
    { refOcMadre:'m1', destinoProyectoNombre:'VICINIA EL CARMEN', items:[{name:'TABLA ULTRALIGHT', qty:116}] },
    { refOcMadre:'m1', destinoProyectoNombre:'RES. LOS ARCOS',    items:[{name:'TABLA ULTRALIGHT', qty:25}] },
    { refOcMadre:'m1', destinoProyectoNombre:'OFICINA PR',        items:[{name:'TABLA ULTRALIGHT', qty:8}] },
  ];
  const r = f(madre, desp);
  const it = r.items[0];
  ok('un renglón por producto', r.items.length === 1 && /ULTRALIGHT/.test(it.producto));
  ok('el saldo sin liberar da 4168', it.saldo === 4168);
  ok('ESSENZA junta sus dos despachos: 683', (it.filas.find(x => /ESSENZA/.test(x.obra))||{}).qty === 683);
  ok('VICINIA 116', (it.filas.find(x => /VICINIA/.test(x.obra))||{}).qty === 116);
  ok('LOS ARCOS 25', (it.filas.find(x => /ARCOS/.test(x.obra))||{}).qty === 25);
  ok('OFICINA PR 8', (it.filas.find(x => /OFICINA/.test(x.obra))||{}).qty === 8);
  ok('el TOTAL cuadra con lo comprado (5000)', it.cuadra === true && it.comprado === 5000);
  ok('ordena de mayor a menor', it.filas[0].qty >= it.filas[it.filas.length-1].qty);

  console.log('\n— la fecha, que es lo que pidió para saber si está al día —');
  ok('trae la marca de generación', typeof r.generado === 'number' && r.generado > 0);

  console.log('\n— lo que no debe contarse —');
  const conCancelada = desp.concat([{ refOcMadre:'m1', status:'CANCELADA', destinoProyectoNombre:'X', items:[{name:'TABLA ULTRALIGHT', qty:999}] }]);
  ok('un despacho CANCELADO no suma', f(madre, conCancelada).items[0].saldo === 4168);
  const deOtraMadre = desp.concat([{ refOcMadre:'OTRA', destinoProyectoNombre:'Y', items:[{name:'TABLA ULTRALIGHT', qty:500}] }]);
  ok('un despacho de OTRA compra anticipada tampoco', f(madre, deOtraMadre).items[0].saldo === 4168);

  console.log('\n— avisa si algo no cuadra —');
  /* si un despacho tiene más de lo que se compró, el total no da: hay que verlo, no esconderlo */
  const roto = [{ refOcMadre:'m1', destinoProyectoNombre:'Z', items:[{name:'TABLA ULTRALIGHT', qty:6000}] }];
  ok('marca cuadra:false cuando los números no dan', f(madre, roto).items[0].cuadra === false || f(madre, roto).items[0].saldo < 0);

  console.log('\n— bordes —');
  ok('sin despachos: todo sigue en pre-pago', f(madre, []).items[0].saldo === 5000);
  ok('sin madre no revienta', Array.isArray(f(null, []).items));
  /* v1122: el rótulo "SIN OBRA" se eliminó a pedido de Antonio ("no debe de existir porque
     cada orden dice para qué obra va" — y tenía razón: el nombre se leía mal). Un despacho
     al que de plano le falte todo dato de destino solo puede venir de un registro corrupto:
     sigue apareciendo, y con una etiqueta que invita a revisarlo en vez de esconderlo. */
  const huerfano = f(madre, [{refOcMadre:'m1', items:[{name:'TABLA ULTRALIGHT', qty:10}]}]);
  ok('un despacho sin ningún dato de destino no se pierde', huerfano.items[0].filas.length === 1);
  ok('su cantidad se sigue contando', huerfano.items[0].filas[0].qty === 10);
  ok('y se rotula para que se revise, no como "SIN OBRA"',
    huerfano.items[0].filas[0].obra === 'DESPACHO SIN IDENTIFICAR');
}

console.log('\n— la pantalla —');
ok('hay botón RESUMEN en la bodega pre-pago', /_dppAbrirResumen\(/.test(html) && /RESUMEN/.test(html));
const zA = ex('window._dppAbrirResumen = function(');
ok('existe el modal', zA.length > 400);
ok('muestra la FECHA Y HORA de generación', /GENERADO EL/.test(zA));
ok('el saldo sin liberar va resaltado arriba', /COMPRA PRE-PAGO/.test(zA));
ok('cierra con el TOTAL GENERAL', /TOTAL GENERAL/.test(zA));
ok('avisa si los números no cuadran', /NO CUADRA/.test(zA));
/* v1127 (Antonio, 4-ago): "eliminá la opción de imprimir PDF, quiero que exista solo el de
   compartir esta info por imagen". El cuadro se manda por WhatsApp; un PDF era un paso de más.
   La acción del modal ES compartir la imagen. */
ok('YA NO hay impresión / PDF', !/_dppImprimirResumen/.test(html));
ok('la acción del resumen es compartir la imagen', /COMPARTIR COMO IMAGEN/.test(zA));
ok('y llama al generador de imagen', /_dppResumenImagen\(/.test(zA));
ok('no escribe nada', !/saveState/.test(zA));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
