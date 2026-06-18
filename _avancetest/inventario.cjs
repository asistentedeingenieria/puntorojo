/* TOMA DE INVENTARIO — lógica pura (v740).
   Cubre: normalización, etiqueta de ubicación, upsert con SOBRESCRIBE,
   borrado de línea, cierre de toma, conteo por ubicación, y _mergeTomas
   (unión multidispositivo: cerrada gana, lineas por loc+material con ts mayor,
   tombstones). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const NORM = new Function(ext('_invNorm')+'\nreturn _invNorm;')();
const EATTR = new Function(ext('_invEscAttr')+'\nreturn _invEscAttr;')();
const LOC  = new Function(ext('_invLocInfo')+'\nreturn _invLocInfo;')();
const UPS  = new Function('_invNorm', ext('_invUpsertLinea')+'\nreturn _invUpsertLinea;')(NORM);
const DEL  = new Function(ext('_invDelLinea')+'\nreturn _invDelLinea;')();
const CER  = new Function(ext('_invCerrarToma')+'\nreturn _invCerrarToma;')();
const CNT  = new Function(ext('_invCountByLoc')+'\nreturn _invCountByLoc;')();
const ONE  = new Function('_invNorm', ext('_mergeOneToma')+'\nreturn _mergeOneToma;')(NORM);
const MRG  = new Function('_mergeOneToma', ext('_mergeTomas')+'\nreturn _mergeTomas;')(ONE);

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// ── _invNorm ──
ok('norm trim+upper+espacios', NORM('  poste  de   2.5 ')==='POSTE DE 2.5');
ok('norm null', NORM(null)==='');

// ── _invLocInfo ──
const lb = LOC({bodega:true});
ok('loc bodega', lb.locKey==='BODEGA' && lb.locLabel==='BODEGA' && lb.bodega===true);
const la = LOC({torreId:'ta',torreName:'TORRE A',nivelId:'n2',nivelName:'NIVEL 2',aptoId:'a201',aptoName:'APTO 201'});
ok('loc apto key=aptoId', la.locKey==='a201' && la.bodega===false);
ok('loc apto label', la.locLabel==='TORRE A · NIVEL 2 · APTO 201');

// ── _invUpsertLinea (SOBRESCRIBE) ──
let L=[];
L=UPS(L,{id:'l1',locKey:'a201',material:'Tornillo 1"',unidad:'U',cantidad:5,ts:100,by:'x'});
ok('upsert agrega 1', L.length===1 && L[0].cantidad===5);
// mismo loc + mismo material (distinto case/espacios) => sobrescribe, no duplica
L=UPS(L,{id:'l2',locKey:'a201',material:'TORNILLO  1"',unidad:'CAJA',cantidad:12,ts:200,by:'y'});
ok('upsert sobrescribe (no duplica)', L.length===1);
ok('upsert toma cantidad nueva', L[0].cantidad===12 && L[0].unidad==='CAJA' && L[0].ts===200);
// distinto material => agrega
L=UPS(L,{id:'l3',locKey:'a201',material:'POSTE 2.5',unidad:'U',cantidad:3,ts:300,by:'z'});
ok('upsert otro material agrega', L.length===2);
// mismo material en OTRA ubicacion => agrega (la ubicacion separa)
L=UPS(L,{id:'l4',locKey:'BODEGA',material:'Tornillo 1"',unidad:'U',cantidad:99,ts:400,by:'z'});
ok('upsert otra ubic agrega', L.length===3);

// ── _invDelLinea ──
const L2=DEL(L,'l3');
ok('del quita por id', L2.length===2 && !L2.some(x=>x.id==='l3'));
ok('del no muta original', L.length===3);

// ── _invCerrarToma ──
const t0={id:'t1',estado:'ABIERTA',fechaInicio:'2026-06-18',fechaCierre:'',lineas:L};
const tC=CER(t0,'2026-06-19');
ok('cierra estado CERRADA', tC.estado==='CERRADA' && tC.fechaCierre==='2026-06-19');
ok('cierra no muta original', t0.estado==='ABIERTA');

// ── _invCountByLoc ──
const c=CNT(tC);
ok('count por loc', c['a201']===2 && c['BODEGA']===1);

// ── _mergeTomas ──
// union: cada lado aporta una toma distinta
let r=MRG([{id:'A',estado:'CERRADA',fechaCierre:'2026-06-10',lineas:[]}],
          [{id:'B',estado:'CERRADA',fechaCierre:'2026-06-11',lineas:[]}],{});
ok('merge union por id', r.list.length===2 && r.changed===true);

// cerrada gana sobre abierta (mismo id)
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:1,ts:10}]}],
      [{id:'A',estado:'CERRADA',fechaCierre:'2026-06-11',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:1,ts:10}]}],{});
ok('merge cerrada gana', r.list.length===1 && r.list[0].estado==='CERRADA');

// dos abiertas mismo id: lineas distintas se UNEN
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M1',cantidad:1,ts:10}]}],
      [{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'y',locKey:'a1',material:'M2',cantidad:2,ts:20}]}],{});
ok('merge abiertas unen lineas', r.list.length===1 && r.list[0].lineas.length===2);

// dos abiertas, MISMO loc+material contado en ambos lados: colapsa al ts mayor
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:5,ts:10}]}],
      [{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'y',locKey:'a1',material:'m',cantidad:8,ts:99}]}],{});
ok('merge colapsa mismo loc+material', r.list.length===1 && r.list[0].lineas.length===1 && r.list[0].lineas[0].cantidad===8);

// tombstone excluye la toma
r=MRG([{id:'A',estado:'CERRADA',fechaCierre:'x',lineas:[]}],
      [{id:'A',estado:'CERRADA',fechaCierre:'x',lineas:[]}],{A:123});
ok('merge tombstone excluye', r.list.length===0);

// sin cambios remotos => changed false
r=MRG([{id:'A',estado:'CERRADA',fechaCierre:'x',lineas:[]}],
      [{id:'A',estado:'CERRADA',fechaCierre:'x',lineas:[]}],{});
ok('merge sin cambios -> changed=false', r.changed===false);

// ── changed/needsResync correcto (fix v740: medir contra REMOTO, no contra LOCAL) ──
// remote ya trae todo lo del local + extra => no hay nada que SUBIR => changed=false (no thrash)
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:5,ts:10}]}],
      [{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:5,ts:10},{id:'y',locKey:'a1',material:'N',cantidad:2,ts:20}]}],{});
ok('changed=false cuando remoto ya tiene todo (no thrash)', r.changed===false && r.list[0].lineas.length===2);
// local aporta una línea que el remoto NO tiene => hay que SUBIR => changed=true
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:5,ts:10},{id:'z',locKey:'a1',material:'Z',cantidad:7,ts:30}]}],
      [{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:5,ts:10}]}],{});
ok('changed=true cuando local aporta dato nuevo (push)', r.changed===true);
// proyecto solo-remoto (local vacío) => recién bajado, nada que re-subir => changed=false
r=MRG([], [{id:'A',estado:'CERRADA',fechaCierre:'x',lineas:[]}], {});
ok('changed=false en proyecto solo-remoto', r.changed===false && r.list.length===1);
// local recontó el mismo loc+material con ts más nuevo => propagar => changed=true
r=MRG([{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x',locKey:'a1',material:'M',cantidad:9,ts:50}]}],
      [{id:'A',estado:'ABIERTA',fechaInicio:'2026-06-10',lineas:[{id:'x2',locKey:'a1',material:'M',cantidad:5,ts:10}]}],{});
ok('changed=true cuando local recontó más nuevo', r.changed===true && r.list[0].lineas[0].cantidad===9);

// ── _invEscAttr (escape de ATRIBUTO HTML, NO de string JS) ──
ok('escAttr deja el apóstrofo intacto (sin backslash)', EATTR("O'BRIEN 8'")==="O'BRIEN 8'");
ok('escAttr comilla doble -> &quot;', EATTR('2½" X 10\'')==='2½&quot; X 10\'');
ok('escAttr < > &', EATTR('a<b>&c')==='a&lt;b&gt;&amp;c');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
