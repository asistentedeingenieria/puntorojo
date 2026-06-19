/* ESTADO DE FUERZA — lógica pura (v743).
   Cuenta los PRESENTES del día (excluye OFICINA): instaladores/masilleros por
   obra, apoyo "ambas obras", sexo M/F, total, sin clasificar. Luego arma las
   líneas del reporte (para PDF). */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }

const CALC  = new Function(ext('_estadoFuerzaCalc')+'\nreturn _estadoFuerzaCalc;')();
const PLBL  = new Function(ext('_efPuestoLabel')+'\nreturn _efPuestoLabel;')();
const APORD = new Function(ext('_efApoyoOrden')+'\nreturn _efApoyoOrden;')();
const LINES = new Function('_efPuestoLabel','_efApoyoOrden', ext('_estadoFuerzaLineas')+'\nreturn _estadoFuerzaLineas;')(PLBL, APORD);

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const projects=[{id:'t3',name:'Torre 3'},{id:'t4',name:'Torre 4'}];
const personal=[
  {id:'a',nombre:'JUAN',tipo:'OBRA',puesto:'INSTALADOR',sexo:'M',obraAsignada:'t3'},
  {id:'b',tipo:'OBRA',puesto:'MASILLERO',sexo:'M',obraAsignada:'t3'},
  {id:'c',tipo:'OBRA',puesto:'INSTALADOR',sexo:'F',obraAsignada:'t4'},
  {id:'d',tipo:'OBRA',puesto:'AYUDANTE',sexo:'M'},
  {id:'e',tipo:'OBRA',puesto:'SUPERVISOR',sexo:'M'},
  {id:'f',tipo:'OBRA',puesto:'',sexo:'M'},                         // sin clasificar
  {id:'g',tipo:'OFICINA',puesto:'INSTALADOR',sexo:'M',obraAsignada:'t3'}, // OFICINA -> excluido
  {id:'h',tipo:'OBRA',puesto:'MASILLERO',sexo:'F',obraAsignada:'t3'},     // ausente
  {id:'i',tipo:'OBRA',puesto:'INSTALADOR',sexo:'M'},               // sin obra -> SIN OBRA
  {id:'j',tipo:'OBRA',puesto:'MASILLERO',sexo:'M'}                 // obra por sesión
];
const dia={
  a:{presente:true,obraId:'t3'}, b:{presente:true,obraId:'t3'}, c:{presente:true,obraId:'t4'},
  d:{presente:true}, e:{presente:true}, f:{presente:true},
  g:{presente:true,obraId:'t3'}, h:{presente:false},
  i:{presente:true}, j:{presente:true, sessions:[{obraId:'t4'}]}
};
const res=CALC(personal, dia, projects);

ok('total presentes (excluye oficina y ausente)', res.total===8);
ok('sexo M', res.sexoM===7);
ok('sexo F', res.sexoF===1);
ok('sexo sin asignar', res.sexoSin===0);
ok('Torre 3: 1 instalador + 1 masillero', res.porObra['TORRE 3'] && res.porObra['TORRE 3'].INSTALADOR===1 && res.porObra['TORRE 3'].MASILLERO===1);
ok('Torre 4: 1 instalador (c)', res.porObra['TORRE 4'] && res.porObra['TORRE 4'].INSTALADOR===1);
ok('Torre 4: 1 masillero por sesión (j)', res.porObra['TORRE 4'].MASILLERO===1);
ok('SIN OBRA: 1 instalador (i)', res.porObra['SIN OBRA'] && res.porObra['SIN OBRA'].INSTALADOR===1);
ok('apoyo ayudante 1', res.apoyo.AYUDANTE===1);
ok('apoyo supervisor 1', res.apoyo.SUPERVISOR===1);
ok('apoyo NO incluye producción', !res.apoyo.INSTALADOR && !res.apoyo.MASILLERO);
ok('sin clasificar 1 (f)', res.sinClasificar===1);
ok('obras ordenadas', res.obrasOrden.length===3 && res.obrasOrden[0]==='SIN OBRA');

// sexo "MASCULINO"/"FEMENINO" completos también cuentan
const res2=CALC([{id:'x',tipo:'OBRA',puesto:'AYUDANTE',sexo:'MASCULINO'},{id:'y',tipo:'OBRA',puesto:'AYUDANTE',sexo:'FEMENINO'}], {x:{presente:true},y:{presente:true}}, projects);
ok('sexo acepta MASCULINO/FEMENINO', res2.sexoM===1 && res2.sexoF===1);

// día vacío -> todo en cero, sin crashear
const res3=CALC(personal, {}, projects);
ok('día sin marcas -> total 0', res3.total===0 && res3.obrasOrden.length===0);

// v751: una persona DE BAJA presente NO cuenta en el estado de fuerza
const resBaja=CALC([
  {id:'b1',tipo:'OBRA',puesto:'INSTALADOR',sexo:'M',obraAsignada:'t3',baja:true},
  {id:'b2',tipo:'OBRA',puesto:'MASILLERO',sexo:'M',obraAsignada:'t3'}
], {b1:{presente:true,obraId:'t3'}, b2:{presente:true,obraId:'t3'}}, projects);
ok('persona DE BAJA excluida del estado de fuerza', resBaja.total===1 && !resBaja.porObra['TORRE 3'].INSTALADOR);

// ── _estadoFuerzaLineas ──
const lines=LINES(res, '12/06/2026', 'Planilla: 7 AM a 4 PM (9 horas)\nSubcontratistas: 7 AM a 6 PM (11 horas)');
ok('línea TORRE 3 en negrita', lines.some(l=>l.t==='TORRE 3' && l.b));
ok('línea de conteo instaladores', lines.some(l=>/\b1 instalador\b/.test(l.t)));
ok('línea total correcta', lines.some(l=>l.t==='Total de personal: 8 personas'));
ok('sección AMBAS OBRAS', lines.some(l=>l.t==='AMBAS OBRAS' && l.b));
ok('sección Horarios', lines.some(l=>l.t==='Horarios' && l.b));
ok('horario incluido', lines.some(l=>/Subcontratistas/.test(l.t)));
ok('sin clasificar mencionado', lines.some(l=>/sin clasificar/i.test(l.t)));

// ── v749: puestos nuevos ayudante de instalador / masillero (cuentan como APOYO) ──
ok('label ayudante de instalador (sing)', PLBL('AYUDANTE_INSTALADOR',1)==='ayudante de instalador');
ok('label ayudantes de instalador (plur)', PLBL('AYUDANTE_INSTALADOR',2)==='ayudantes de instalador');
ok('label ayudante de masillero', PLBL('AYUDANTE_MASILLERO',1)==='ayudante de masillero');
ok('label desconocido -> sin guion bajo', PLBL('FOO_BAR',1)==='foo bar');
const resAyu=CALC([
  {id:'p',tipo:'OBRA',puesto:'AYUDANTE_INSTALADOR',sexo:'M',obraAsignada:'t3'},
  {id:'q',tipo:'OBRA',puesto:'AYUDANTE_MASILLERO',sexo:'F',obraAsignada:'t3'}
], {p:{presente:true,obraId:'t3'},q:{presente:true,obraId:'t3'}}, projects);
ok('ayudante de instalador cuenta como APOYO (no por obra)', resAyu.apoyo.AYUDANTE_INSTALADOR===1 && !resAyu.porObra['TORRE 3']);
ok('ayudante de masillero cuenta como APOYO', resAyu.apoyo.AYUDANTE_MASILLERO===1);
const linAyu=LINES(resAyu,'18/06/2026','');
ok('líneas: aparece ayudante de instalador', linAyu.some(l=>/ayudante de instalador/.test(l.t)));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
