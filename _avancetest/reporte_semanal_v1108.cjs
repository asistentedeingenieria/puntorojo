/* v1108 — MOTOR DEL REPORTE SEMANAL FOTOGRÁFICO (Antonio):
   "quiero que este reporte se pueda hacer solito con las fotos que se subieron en el avance
   físico y que se genere igual al que entregamos al cliente".

   Hoy mandan a una persona a tomar fotos y arma el PDF a mano (semana 35: 50 páginas, 110
   fotos). La app ya tiene todo lo necesario desde la v1076: fotos por etapa CON FECHA.

   REGLAS que definió Antonio:
   - Semana de LUNES a VIERNES. La próxima es la 36 = 3 al 7 de agosto de 2026, y de ahí suma.
   - DOS fotos por unidad: las dos MÁS RECIENTES de esa semana.
   - Si una unidad no tuvo avance/fotos esa semana: se repite la foto y el cuadro de la semana
     anterior.
   - Una unidad reportada como ENTREGADA no vuelve a salir NUNCA (decisión explícita suya).
   - La X de la tabla sale del estado que la app ya lleva con las fotos, y la tabla lleva las
     SEIS etapas de la app (no las cuatro del reporte viejo).
   - Los PASILLOS ya existen como unidad (24 en ESSENZA) — entran como una unidad más.

   Estas funciones son PURAS: deciden qué entra al reporte. El PDF y la memoria persistida van
   aparte, y se apoyan en esto. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('\n— 1. la semana: lunes a viernes, arrancando en la 36 —');
const zR = ex('function _repSemanaRango(');
ok('existe _repSemanaRango y es pura', zR.length > 120 && !/state|document/.test(zR));
/* el ancla de la serie de semanas es una constante aparte: se inyecta la REAL, así el test
   falla si alguien la mueve sin querer */
const zAncla = (html.match(/const REP_SEMANA_ANCLA = \{[^}]*\};/) || [''])[0];
ok('existe el ancla de semanas', /n:\s*36/.test(zAncla) && /2026-08-03/.test(zAncla));
let rango = null; try { rango = new Function(zAncla + '\nreturn (' + zR + ')')(); } catch(e){ console.log('   ('+e.message+')'); }
if (rango) {
  const s36 = rango(36);
  ok('SEMANA 36 = lunes 3 de agosto de 2026', s36.desde.slice(0,10) === '2026-08-03');
  ok('SEMANA 36 termina el viernes 7', s36.hasta.slice(0,10) === '2026-08-07');
  ok('el rótulo dice del 3 al 7', /3/.test(s36.label) && /7/.test(s36.label));
  const s37 = rango(37);
  ok('la 37 arranca el lunes siguiente', s37.desde.slice(0,10) === '2026-08-10');
  const s35 = rango(35);
  ok('hacia atrás también funciona (35 = 27 de julio)', s35.desde.slice(0,10) === '2026-07-27');
  /* el rango va de las 00:00 del lunes a las 23:59 del viernes: cubre los 5 días completos */
  ok('cubre los 5 días completos (lunes 00:00 → viernes 23:59)',
    Math.floor((new Date(s36.hasta) - new Date(s36.desde)) / 86400000) === 4
    && /T00:00:00$/.test(s36.desde) && /T23:59:59$/.test(s36.hasta));
  ok('el sábado ya no entra', new Date('2026-08-08T10:00:00') > new Date(s36.hasta));
  ok('número inválido no revienta', !!rango(0) && !!rango(-3));
}

console.log('\n— 2. las dos fotos más recientes de la semana —');
const zF = ex('function _repFotosSemana(');
let fotos = null; try { fotos = new Function('return (' + zF + ')')(); } catch(e){}
ok('existe _repFotosSemana', !!fotos);
if (fotos) {
  const D = (s) => new Date(s + 'T12:00:00').getTime();
  const apto = { photos: [[],[ 'u1','u2','u3' ],[],[],[],[]],
                 photoTs: [[],[ D('2026-08-03'), D('2026-08-05'), D('2026-08-06') ],[],[],[],[]] };
  const r = fotos(apto, D('2026-08-03'), D('2026-08-07') + 86399000);
  ok('toma exactamente DOS', r.length === 2);
  ok('y son las más recientes', r.indexOf('u3') >= 0 && r.indexOf('u2') >= 0 && r.indexOf('u1') < 0);
  const fuera = fotos(apto, D('2026-08-10'), D('2026-08-14'));
  ok('si no hay fotos en la semana devuelve vacío (para caer al reporte anterior)', fuera.length === 0);
  const una = fotos({ photos:[['x']], photoTs:[[D('2026-08-04')]] }, D('2026-08-03'), D('2026-08-07')+86399000);
  ok('con una sola foto devuelve una (no inventa)', una.length === 1);
  ok('sin fotos no revienta', fotos({}, 0, 9e15).length === 0 && fotos(null, 0, 9e15).length === 0);
  /* las fotos de CUALQUIER etapa cuentan: el reporte muestra el trabajo de la semana */
  const multi = fotos({ photos:[['a'],['b']], photoTs:[[D('2026-08-04')],[D('2026-08-06')]] }, D('2026-08-03'), D('2026-08-07')+86399000);
  ok('junta fotos de distintas etapas', multi.length === 2);
}

console.log('\n— 3. la X: las SEIS etapas, según lo que la app ya marcó —');
const zE = ex('function _repEtapasUnidad(');
let etapas = null; try { etapas = new Function('return (' + zE + ')')(); } catch(e){}
ok('existe _repEtapasUnidad', !!etapas);
if (etapas) {
  const r = etapas({ stages: [true,true,true,false,false,false] });
  ok('devuelve las 6 etapas', Array.isArray(r.marcas) && r.marcas.length === 6);
  ok('marca las completadas', r.marcas[0] === true && r.marcas[2] === true);
  ok('no marca las pendientes', r.marcas[3] === false);
  ok('NO está entregado si falta alguna', r.entregado === false);
  const full = etapas({ stages: [true,true,true,true,true,true] });
  ok('ENTREGADO solo con las seis completas', full.entregado === true);
  ok('sin datos no revienta', !!etapas({}) && !!etapas(null));
}

console.log('\n— 4. quién entra al reporte —');
const zU = ex('function _repUnidadesDelReporte(');
let unidades = null; try { unidades = new Function('return (' + zU + ')')(); } catch(e){}
ok('existe _repUnidadesDelReporte', !!unidades);
if (unidades) {
  const P = { towers:[{ id:'t1', name:'TORRE 3', levels:[{ id:'l1', name:'NIVEL 1', aptos:[
    { id:'a1', name:'101' }, { id:'a2', name:'102' }, { id:'ap', name:'PASILLO' } ] }] }] };
  const sinPrevios = unidades(P, []);
  ok('entran todas las unidades', sinPrevios.length === 3);
  ok('EL PASILLO ENTRA como una unidad más', sinPrevios.some(u => /PASILLO/i.test(u.a.name)));
  ok('trae torre y nivel para agrupar el PDF', !!sinPrevios[0].t && !!sinPrevios[0].l);
  /* la regla dura que pidió Antonio: entregado = fuera para siempre */
  const conEntregado = unidades(P, [{ unidades: { a1: { entregado: true } } }]);
  ok('una unidad ya reportada como ENTREGADA no vuelve a salir', !conEntregado.some(u => u.a.id === 'a1'));
  ok('las demás siguen saliendo', conEntregado.length === 2);
  const variosRep = unidades(P, [{ unidades:{ a2:{ entregado:false } } }, { unidades:{ a2:{ entregado:true } } }]);
  ok('basta con que UN reporte la haya dado por entregada', !variosRep.some(u => u.a.id === 'a2'));
  ok('sin proyecto no revienta', unidades(null, []).length === 0 && unidades({}, null).length === 0);
}

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
