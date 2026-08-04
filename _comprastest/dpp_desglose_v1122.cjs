/* v1122 — TRES COSAS QUE PIDIÓ ANTONIO SOBRE EL RESUMEN DE PRE-PAGO (4-ago):

   (1) "el que dice SIN OBRA no debe de existir porque cada orden dice para que obra va.
        Si te das cuenta en la foto 2 cada despacho dice a donde va."
       BUG REAL: la lista de despachos resuelve el nombre buscando el proyecto por
       destinoProyectoId dentro de state.projects; el resumen leía o.destinoProyectoNombre,
       un campo que _dppCrearDesdeMadre NUNCA escribe. Por eso caía al id crudo
       ("ESSENZA-F2") o de plano a "SIN OBRA". El dato SIEMPRE estuvo: mal leído.

   (2) "que el resumen tenga la opcion de poder compartir el desglose con el numero de cada
        orden de compra en cada obra" — su tabla dinámica abierta un nivel más:
            ESSENZA - FASE 2 .... 683
               8273-01 ........... 219
               8273-02 ........... 102
       O sea cada obra desglosada en los despachos que la componen.

   (3) "el resumen que se ve en la app quiero que este en el orden de la fecha de despacho.
        Los mas nuevos de primero y los mas viejos de ultimo."
       Antes ordenaba de mayor a menor cantidad. Ahora manda la FECHA.

   El caso de prueba es su tabla dinámica real (la foto), despacho por despacho. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const zR = ex('function _dppResumenPorObra(');
let f = null;
try {
  f = new Function('_ocItemMemKey', ex('function _dppSaldoDeMadre(') + '\n' + ex('function _dppNombreObraDestino(') + '\n' + zR + '\nreturn _dppResumenPorObra;')
      (s => String(s||'').toUpperCase().trim());
} catch(e){ console.log('   (no compiló: '+e.message+')'); }

/* los proyectos como viven en state.projects: id corto, nombre de verdad */
const PROJECTS = [
  { id:'ESSENZA-F2',  name:'ESSENZA - FASE 2' },
  { id:'VICINIA-DC',  name:'VICINIA EL CARMEN' },
  { id:'ARCOS',       name:'RES. LOS ARCOS' },
];
const madre = { id:'m1', items:[{ name:'TABLA ULTRALIGHT', unidad:'u', qty:5000, precio:65 }] };
/* ts crecientes: 8273-01 es el más viejo, 8273-09 el más nuevo */
const D = (n, obraId, qty, ts, extra) => Object.assign({
  refOcMadre:'m1', numero:'DESPACHO PRE-PAGO ' + n, refExterna:'8273-' + String(n).padStart(2,'0'),
  destinoProyectoId: obraId, ts: ts, items:[{ name:'TABLA ULTRALIGHT', qty: qty }]
}, extra || {});
const desp = [
  D(1,'ESSENZA-F2',219,1001), D(2,'ESSENZA-F2',102,1002), D(3,null,8,1003,{ proyecto:'OFICINA PR' }),
  D(4,'ESSENZA-F2',130,1004), D(5,'ESSENZA-F2',166,1005), D(6,'VICINIA-DC',100,1006),
  D(7,'ESSENZA-F2',66,1007),  D(8,'ARCOS',25,1008),       D(9,'VICINIA-DC',16,1009),
];

if (f) {
  const r = f(madre, desp, PROJECTS);
  const it = r.items[0];

  console.log('\n— (1) el nombre de la obra, resuelto como lo hace la lista —');
  const nombres = it.filas.map(x => x.obra);
  ok('NUNCA aparece SIN OBRA', !nombres.some(n => /SIN OBRA/.test(n)));
  ok('tampoco el id crudo ESSENZA-F2', !nombres.some(n => n === 'ESSENZA-F2'));
  ok('resuelve el nombre real ESSENZA - FASE 2', nombres.indexOf('ESSENZA - FASE 2') >= 0);
  ok('resuelve VICINIA EL CARMEN', nombres.indexOf('VICINIA EL CARMEN') >= 0);
  ok('resuelve RES. LOS ARCOS', nombres.indexOf('RES. LOS ARCOS') >= 0);
  ok('un despacho sin id cae al nombre que trae escrito (OFICINA PR)', nombres.indexOf('OFICINA PR') >= 0);
  ok('son exactamente 4 obras', it.filas.length === 4);

  console.log('\n— los totales de su tabla dinámica siguen cuadrando —');
  const q = n => (it.filas.find(x => x.obra === n) || {}).qty;
  ok('ESSENZA 683', q('ESSENZA - FASE 2') === 683);
  ok('VICINIA 116', q('VICINIA EL CARMEN') === 116);
  ok('LOS ARCOS 25', q('RES. LOS ARCOS') === 25);
  ok('OFICINA PR 8', q('OFICINA PR') === 8);
  ok('sin liberar 4168', it.saldo === 4168);
  ok('el total cuadra con los 5000 comprados', it.cuadra === true);

  console.log('\n— (2) el desglose: qué orden compone cada obra —');
  const ess = it.filas.find(x => x.obra === 'ESSENZA - FASE 2');
  ok('cada obra trae sus documentos', Array.isArray(ess.docs) && ess.docs.length === 5);
  ok('cada documento trae la referencia del proveedor (8273-XX)',
    ess.docs.every(d => /^8273-\d\d$/.test(String(d.ref || ''))));
  ok('y su cantidad', ess.docs.reduce((s,d) => s + d.qty, 0) === 683);
  ok('trae también el número interno del despacho', /DESPACHO PRE-PAGO/.test(ess.docs[0].numero));
  ok('VICINIA se compone de 8273-06 y 8273-09',
    it.filas.find(x => x.obra === 'VICINIA EL CARMEN').docs.map(d => d.ref).sort().join(',') === '8273-06,8273-09');

  console.log('\n— (3) ordenado por FECHA DE DESPACHO, lo más nuevo primero —');
  ok('la obra del despacho más reciente va primera', it.filas[0].obra === 'VICINIA EL CARMEN');
  /* el orden lo fija el despacho MÁS RECIENTE de cada obra: VICINIA (8273-09) · ARCOS (8273-08)
     · ESSENZA (8273-07) · OFICINA PR (8273-03, el más viejo de todos) */
  ok('la más vieja va última', it.filas[it.filas.length - 1].obra === 'OFICINA PR');
  ok('el orden completo es por fecha', it.filas.map(x => x.obra).join('|')
    === 'VICINIA EL CARMEN|RES. LOS ARCOS|ESSENZA - FASE 2|OFICINA PR');
  ok('dentro de la obra también manda la fecha', ess.docs[0].ref === '8273-07' && ess.docs[4].ref === '8273-01');
  ok('ya NO ordena por cantidad (ESSENZA tiene 683 y no va primera)', it.filas[0].obra !== 'ESSENZA - FASE 2');

  console.log('\n— lo de siempre: lo que no debe contarse —');
  ok('un despacho CANCELADO no entra',
    f(madre, desp.concat([D(99,'ARCOS',999,9999,{status:'CANCELADA'})]), PROJECTS).items[0].saldo === 4168);
  ok('sin proyectos cargados no revienta ni inventa SIN OBRA',
    !/SIN OBRA/.test(JSON.stringify(f(madre, desp, null))));
  ok('sin despachos no hay filas', f(madre, [], PROJECTS).items[0].filas.length === 0);
}

console.log('\n— la pantalla —');
const zA = ex('window._dppAbrirResumen = function(');
ok('el resumen pinta el desglose por documento', /docs/.test(zA));
ok('le pasa los proyectos al motor para resolver nombres', /_dppResumenPorObra\([\s\S]{0,60}projects/.test(zA));
ok('hay botón para COMPARTIR', /COMPARTIR/.test(zA));

console.log('\n— (4) compartir como IMAGEN —');
const zI = ex('window._dppResumenImagen = async function(');
ok('existe el generador de imagen', zI.length > 400);
ok('dibuja en un canvas', /createElement\('canvas'\)/.test(zI));
ok('la imagen lleva la fecha de generación, como el modal', /GENERADO/.test(zI));
ok('sale en PNG', /image\/png/.test(zI));
ok('reusa la escalera de compartir ya probada (nativo → web → descarga)', /_pdfShareModo\(/.test(zI));
ok('si no puede compartir, la descarga', /download/.test(zI));
ok('escala para pantallas retina (que no salga borrosa)', /devicePixelRatio|DPR|escala/.test(zI));

/* v1127 (Antonio, 4-ago): "quiero que todo esté bien alineado. Date cuenta que donde dice
   TABLA está como más para abajo." El texto se colocaba calculando la línea base a mano
   (y + 23, y + 4…), que depende de la fuente: si Familjen Grotesk no está lista en el canvas
   y cae a Arial, las métricas cambian y el texto se descuelga dentro de su barra.
   Se centra de verdad: cada fila es una caja con tope y alto, y el texto va en su centro
   con textBaseline='middle' — así queda alineado con cualquier fuente. */
console.log('\n— (5) alineación de la imagen —');
/* el código SIN comentarios: si no, el propio comentario que explica el arreglo contiene los
   tokens que se buscan y la aserción pasa (o falla) por la razón equivocada — ya mordió con
   DUBAI, con max-width:560px y con v972 */
const zIL = zI.replace(/\/\*[\s\S]*?\*\//g, '');
ok('centra el texto verticalmente de verdad', /textBaseline\s*=\s*'middle'/.test(zIL));
ok('cada fila se dibuja como una caja con su alto', /_fila\s*=\s*function\(tope, alto/.test(zIL) && /_fila\(y,/.test(zIL));
ok('ya no quedan líneas base calculadas a mano', !/y \+ 23|y \+ 4\)|y - 2\)/.test(zIL));
ok('todas las etiquetas arrancan en la misma sangría', (zI.match(/PAD \+ 14/g) || []).length >= 3);
ok('las cantidades cierran todas en el mismo borde', (zI.match(/W - PAD - 14/g) || []).length >= 3);
ok('el desglose va indentado bajo su obra', /PAD \+ 3[0-9]/.test(zI));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
