/* v1110 — ARMADO Y MEMORIA DEL REPORTE SEMANAL (sigue a v1108/v1109).
   El motor ya sabe QUÉ entra (unidades con avance, sin las entregadas) y CUÁLES fotos (las 2
   más recientes de la semana). Falta juntarlo y RECORDARLO, que es lo que hace posibles las
   dos reglas de Antonio:
     - "si no tiene foto porque no hay avance esa semana, se pone la misma foto y el mismo
       reporte que la semana pasada de ese apto"  ⇒ hay que saber qué se mandó la semana pasada.
     - "cuando ya se reporta una vez apto terminado, en el siguiente reporte ese apto ya no
       sale"                                       ⇒ hay que saber qué ya se dio por entregado.
   Sin memoria persistida ninguna de las dos se puede cumplir.

   El contenedor vive POR PROYECTO (p.reportesSemanales) y se sincroniza con union-merge, igual
   que los pedidos y las órdenes desde v972: dos personas generando reportes no se pisan. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const deps = ex('function _repEtapasUnidad(') + '\n' + ex('function _repFotosSemana(') + '\n'
  + (html.match(/const REP_SEMANA_ANCLA = \{[^}]*\};/)||[''])[0] + '\n'
  + ex('function _repSemanaRango(') + '\n' + ex('function _repUnidadesDelReporte(');

const zA = ex('function _repArmar(');
ok('existe _repArmar', zA.length > 300);
let armar = null; try { armar = new Function(deps + '\nreturn (' + zA + ')')(); } catch(e){ console.log('   ('+e.message+')'); }

const D = s => new Date(s + 'T12:00:00').getTime();
const mkApto = (id, name, stages, fotos) => {
  const a = { id, name, stages };
  if (fotos) { a.photos = [fotos.map(f=>f.url)]; a.photoTs = [fotos.map(f=>f.ts)]; }
  return a;
};

if (armar) {
  console.log('\n— 1. arma la semana con lo que hay —');
  const P = { id:'p1', name:'ESSENZA FASE 2', towers:[{ id:'t1', name:'TORRE 3', levels:[{ id:'l1', name:'NIVEL 1', aptos:[
    mkApto('a1','101',[true,true,false,false,false,false],[{url:'n1',ts:D('2026-08-04')},{url:'n2',ts:D('2026-08-06')},{url:'viejo',ts:D('2026-07-01')}]),
    mkApto('a2','102',[true,false,false,false,false,false], null),
    mkApto('ap','PASILLO',[true,true,true,false,false,false],[{url:'p1',ts:D('2026-08-05')}])
  ]}]}]};
  const rep = armar(P, 36, []);
  ok('trae el número de semana', rep.semana === 36);
  ok('trae el rango de la semana', /2026-08-03/.test(rep.desde) && /2026-08-07/.test(rep.hasta));
  ok('trae el rótulo para la portada', /Del 3 Al 7/.test(rep.label));
  ok('lista las 3 unidades con avance', rep.filas.length === 3);
  ok('cada fila sabe su torre y nivel (para agrupar el PDF)', !!rep.filas[0].torre && !!rep.filas[0].nivel);

  console.log('\n— 2. las dos fotos más recientes DE LA SEMANA —');
  const f1 = rep.filas.find(x => x.aptoId === 'a1');
  ok('toma las dos de la semana', f1.fotos.length === 2 && f1.fotos.indexOf('n2') >= 0 && f1.fotos.indexOf('n1') >= 0);
  ok('ignora la foto vieja de julio', f1.fotos.indexOf('viejo') < 0);
  ok('marca que tuvo avance esta semana', f1.repetido === false);
  ok('trae las 6 marcas para la tabla', f1.marcas.length === 6 && f1.marcas[0] === true && f1.marcas[2] === false);

  console.log('\n— 3. SIN avance: se repite lo de la semana pasada —');
  const previo = { semana:35, unidades:{ a2:{ fotos:['vieja1','vieja2'], marcas:[true,false,false,false,false,false], entregado:false } } };
  const rep2 = armar(P, 36, [previo]);
  const f2 = rep2.filas.find(x => x.aptoId === 'a2');
  ok('copia las fotos del reporte anterior', f2.fotos.join() === 'vieja1,vieja2');
  ok('y queda marcado como repetido (no es avance nuevo)', f2.repetido === true);
  const f2sin = rep.filas.find(x => x.aptoId === 'a2');
  ok('sin reporte previo queda sin fotos, no revienta', Array.isArray(f2sin.fotos) && f2sin.fotos.length === 0);

  console.log('\n— 4. entregado —');
  const P3 = { id:'p1', towers:[{ id:'t1', name:'T', levels:[{ id:'l1', name:'N', aptos:[
    mkApto('done','301',[true,true,true,true,true,true],[{url:'z',ts:D('2026-08-05')}]) ]}]}]};
  const rep3 = armar(P3, 36, []);
  ok('con las 6 etapas queda marcado ENTREGADO', rep3.filas[0].entregado === true);
  ok('y ese estado va al mapa de unidades (para excluirlo después)', rep3.unidades.done.entregado === true);
  const rep4 = armar(P3, 37, [{ semana:36, unidades:{ done:{ entregado:true } } }]);
  ok('en el reporte siguiente ya NO aparece', rep4.filas.length === 0);

  console.log('\n— 5. es puro: no toca el proyecto —');
  const antes = JSON.stringify(P);
  armar(P, 36, []);
  ok('no muta el proyecto', JSON.stringify(P) === antes);
  ok('sin proyecto no revienta', !!armar(null, 36, []) && armar(null,36,[]).filas.length === 0);
}

console.log('\n— 6. la memoria persistida —');
const zG = ex('window._repGuardar = function(');
ok('existe _repGuardar', zG.length > 150);
ok('guarda por proyecto', /reportesSemanales/.test(zG));
ok('sella _ts (viaja sincronizado)', /_ts/.test(zG));
ok('no duplica la misma semana: la reemplaza', /findIndex|filter/.test(zG));
ok('sube al instante', /forceUploadNow/.test(zG));

console.log('\n— 7. el sync no puede perder reportes —');
/* applyRemote es un MÉTODO del objeto CloudSync (`applyRemote(remoteData, opts = {})`), no una
   función suelta — por eso se ancla así y no con 'function applyRemote' */
const iAR = html.indexOf('applyRemote(remoteData');
ok('se encontró applyRemote', iAR > 0);
const zAR = html.slice(iAR, iAR + 40000);
ok('applyRemote une los reportes por proyecto', /reportesSemanales/.test(zAR));
ok('los une con _mergeById (union, no last-write-wins)', /_mergeById\(_lr, _rr/.test(zAR));
ok('marca needsResync si cambió algo', /_mrep\.changed\) needsResync = true/.test(zAR));
/* el guard de `materiales` del bloque v972 mataría el merge en proyectos sin materiales, así
   que este va en su PROPIO try — y separado, para no partir el bloque ajeno (el test de v972
   mira una ventana de caracteres desde su marcador y meterse en medio lo rompía) */
const iRep = zAR.indexOf('reportesSemanales');
const iV972 = zAR.indexOf('v972 BLINDAJE DE PEDIDOS');
ok('el merge de reportes va ANTES del bloque v972, sin partirlo', iRep > 0 && iV972 > 0 && iRep < iV972);
ok('tiene su propio try/catch', /merge de reportes semanales en applyRemote/.test(zAR));
ok('no queda atrapado por el guard de materiales',
  !/reportesSemanales[\s\S]{0,200}!rp\.materiales/.test(zAR));
ok('APP_SYNC_VERSION subió (contenedor nuevo)', /APP_SYNC_VERSION = 92[3-9]|APP_SYNC_VERSION = 9[3-9]\d/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
