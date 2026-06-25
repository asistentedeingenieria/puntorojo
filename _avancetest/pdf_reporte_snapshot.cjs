/* v832: snapshot puro para el PDF de AVANCE POR APARTAMENTO (4 vistas).
   _avReporteSnapshot(tipo,p) recorre TODOS los aptos (ignora el colapso de pantalla) y
   devuelve {titulo, subtituloVerde, kpis, torres:[{name,pct,niveles:[{name,pct,aptos:[{name,n,green,pct}]}]}]}.
   Cada tipo usa su helper de cuadrito: fisico/cobro/material/pago. Probamos el ruteo por tipo,
   el conteo de KPIs, los % agregados y la limpieza de nombres. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const ok = (n, c) => c ? pass++ : (fail++, console.log('FAIL ' + n));

function extractFn(name){
  const m = html.indexOf('function ' + name + '(');
  if (m < 0) return '';
  let i = html.indexOf('{', m), d = 0;
  for (; i < html.length; i++){ if (html[i] === '{') d++; else if (html[i] === '}'){ d--; if (d === 0) return html.slice(m, i + 1); } }
  return '';
}
const names = ['_avAptoNombre','_avanceAptoNivelFisico','_avanceAptoNivelCobro','_avanceAptoNivelMaterial','_avanceAptoNivelPago','_avAptoMetric','_avReporteSnapshot'];
const srcs = names.map(extractFn);
names.forEach((n,i)=>ok('extraída '+n, !!srcs[i]));
const src = srcs.join('\n');

const stubs = {
  getEtapasP: () => [1,2,3,4,5],
  tieneAcuseFirmado: (a,i) => !!(a._acuse && a._acuse[i]),
  paidPct5: () => 0,
  _etapaDespachoPct: () => 0,
  _recetaEtapaItemKeys: () => [],
  _itemsDespachadosEtapa: () => [],
  activeProj: () => null,
};
const api = new Function(...Object.keys(stubs), src + '\nreturn {_avReporteSnapshot};')(...Object.values(stubs));
const snap = api._avReporteSnapshot;

const P = {
  name:'TORELO',
  materiales:{ pedidos:[], ordenes:[] },
  cobro:{ avanceAptos:{ a1:{pdfCumulativo:50}, a2:{porEstimacion:{x:100}}, a3:{} } },
  towers:[{ name:'TORRE 1', levels:[{ id:'l1', name:'NIVEL 2', aptos:[
    { id:'a1', name:'APARTAMENTO 2A', stages:[true,true,false,false,false,false], despachoManual:[100,0,0,0], pagoManual:[100,0,0,0,0] },
    { id:'a2', name:'2B', stages:[true,true,true,true,true,true], _acuse:{0:1,1:1,2:1,3:1,4:1,5:1}, despachoManual:[100,100,100,100], pagoManual:[100,100,100,100,100] },
    { id:'a3', name:'PASILLO', stages:[false,false,false,false,false,false], despachoManual:[0,0,0,0], pagoManual:[0,0,0,0,0] },
  ]}]}]
};

function aptos(s){ return s.torres[0].niveles[0].aptos; }

// estructura + títulos
const sf = snap('fisico', P);
ok('titulo físico', sf.titulo === 'AVANCE FÍSICO POR APARTAMENTO');
ok('subtituloVerde físico', sf.subtituloVerde === 'ACUSE FIRMADO AL 100%');
ok('1 torre / 1 nivel / 3 aptos', sf.torres.length===1 && sf.torres[0].niveles.length===1 && aptos(sf).length===3);
ok('nombres limpios (APARTAMENTO 2A → 2A, PASILLO)', aptos(sf)[0].name==='2A' && aptos(sf)[2].name==='PASILLO');

// FÍSICO: a1 n1 cuadritos / pct=term/6=33%, a2 green/100, a3 n0/0
ok('físico a1 = n1 no-green pct33 (term2/6)', aptos(sf)[0].n===1 && aptos(sf)[0].green===false && aptos(sf)[0].pct===33);
ok('físico a2 = green pct100', aptos(sf)[1].green===true && aptos(sf)[1].n===4 && aptos(sf)[1].pct===100);
ok('físico a3 = n0 pct0', aptos(sf)[2].n===0 && aptos(sf)[2].pct===0);
ok('físico KPIs completos1/enProceso1/sinIniciar1', sf.kpis.completos===1 && sf.kpis.enProceso===1 && sf.kpis.sinIniciar===1 && sf.kpis.total===3);
ok('físico nivel% y torre% = 44 (avg term/6)', sf.torres[0].niveles[0].pct===44 && sf.torres[0].pct===44 && sf.kpis.pct===44);

// COBRO: a1 cumul50→n2/50, a2 100→green, a3 0
const sc = snap('cobro', P);
ok('cobro título + verde', sc.titulo==='AVANCE DE COBRO POR APARTAMENTO' && sc.subtituloVerde==='APTO COBRADO AL 100%');
ok('cobro a1 n2 pct50', aptos(sc)[0].n===2 && aptos(sc)[0].green===false && aptos(sc)[0].pct===50);
ok('cobro a2 green pct100', aptos(sc)[1].green===true && aptos(sc)[1].pct===100);
ok('cobro a3 SIN datos: se lista pero NO cuenta (hasData)', aptos(sc)[2].pct===0 && aptos(sc).length===3 && sc.kpis.total===2 && sc.kpis.sinIniciar===0);

// MATERIAL: usa despachoManual
const sm = snap('material', P);
ok('material título', sm.titulo==='MATERIAL DESPACHADO POR APARTAMENTO');
ok('material a1 n1 pct25', aptos(sm)[0].n===1 && aptos(sm)[0].pct===25);
ok('material a2 green', aptos(sm)[1].green===true && aptos(sm)[1].pct===100);

// PAGO: usa pagoManual
const sp = snap('pago', P);
ok('pago título + verde', sp.titulo==='AVANCE DE PAGOS POR APARTAMENTO' && sp.subtituloVerde==='PAGADO AL 100%');
ok('pago a1 n1 pct25', aptos(sp)[0].n===1 && aptos(sp)[0].pct===25);
ok('pago a2 green pct100', aptos(sp)[1].green===true && aptos(sp)[1].pct===100);

// FÍSICO: apto con SOLO 1 etapa (term=1) → EN PROCESO, no SIN INICIAR (bug v832 corregido)
const Pf1={ name:'X', materiales:{pedidos:[],ordenes:[]}, cobro:{avanceAptos:{}}, towers:[{name:'T',levels:[{id:'l',name:'N',aptos:[
  { id:'x1', name:'X1', stages:[true,false,false,false,false,false] } ]}]}] };
const sf1=snap('fisico',Pf1);
ok('físico term=1 → EN PROCESO (no sin iniciar)', sf1.kpis.enProceso===1 && sf1.kpis.sinIniciar===0);
ok('físico term=1 → cuadrito n0 pero pct=17 (1/6)', sf1.torres[0].niveles[0].aptos[0].n===0 && sf1.torres[0].niveles[0].aptos[0].pct===17);

// COBRO: el % OFICIAL subido por PDF manda sobre el promedio calculado
const Pco={ name:'X', materiales:{pedidos:[],ordenes:[]}, cobro:{ avanceAptos:{c1:{pdfCumulativo:40}}, avanceLevels:{lc:88}, avanceTorres:{tc:91} },
  towers:[{ id:'tc', name:'T', levels:[{ id:'lc', name:'N', aptos:[ {id:'c1',name:'C1'} ] }] }] };
const sco=snap('cobro',Pco);
ok('cobro nivel usa % oficial (88) no el promedio (40)', sco.torres[0].niveles[0].pct===88);
ok('cobro torre usa % oficial (91)', sco.torres[0].pct===91);

// proyecto null → estructura vacía sin throw
const s0 = snap('fisico', null);
ok('p null → torres vacío', Array.isArray(s0.torres) && s0.torres.length===0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
