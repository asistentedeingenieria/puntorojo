/* v856: FIX del "SINCRONIZANDO cada 10s". _mergeAsistencia ponía changed=true INCONDICIONAL para
   cualquier registro multiSesión (sessions), aunque las sesiones fueran idénticas → cada applyRemote
   re-subía la asistencia → bucle de re-sync entre celulares. El fix: solo changed=true si el
   registro resultante DIFIERE realmente del remoto (idempotente, pero sin perder marcas nuevas). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const deps = ['_asistResumenSesiones','_mergeSesiones','_recToSessions','_mergeAsistencia'].map(extractFn);
ok('todas las funciones existen', deps.every(Boolean));
const fn = new Function(deps.join('\n') + '\nreturn _mergeAsistencia;')();
const resumen = new Function(extractFn('_asistResumenSesiones') + '\nreturn _asistResumenSesiones;')();
const clone = x => JSON.parse(JSON.stringify(x));

// Registro multiSesión en forma CANÓNICA (como lo deja la app tras marcar/mergear).
const sesh = [{ obraId:'A', obraDesc:'', entrada:'07:00', salida:'12:00', geoEntrada:null, geoSalida:null, _ts:1000 }];
const canon = Object.assign({}, resumen(sesh), { multiSesion:true, sessions:sesh, via:'cara' });
const rec = { '2026-06-26': { 'p1': canon } };

// 1) IDÉNTICO local y remoto → NO debe marcar changed (si lo marca, es el bucle).
const r1 = fn(clone(rec), clone(rec), {});
ok('multiSesión idéntico → changed=false (sin bucle)', r1.changed === false);

// 2) local tiene una sesión NUEVA que el remoto no trae → SÍ changed (no romper la propagación).
const sesh2 = sesh.concat([{ obraId:'B', obraDesc:'', entrada:'14:00', salida:'17:00', geoEntrada:null, geoSalida:null, _ts:2000 }]);
const recLocal2 = { '2026-06-26': { 'p1': Object.assign({}, resumen(sesh2), { multiSesion:true, sessions:sesh2, via:'cara' }) } };
const r2 = fn(clone(recLocal2), clone(rec), {});
ok('sesión nueva local → changed=true (propaga)', r2.changed === true);
ok('la unión conserva ambas sesiones', (r2.asistencia['2026-06-26']['p1'].sessions || []).length === 2);

// 3) registro NO-multiSesión idéntico → tampoco debe loopear (rama clásica, ya era idempotente).
const recPlano = { '2026-06-26': { 'p2': { entrada:'08:00', salida:'16:00', via:'manual', _ts:500 } } };
const r3 = fn(clone(recPlano), clone(recPlano), {});
ok('registro plano idéntico → changed=false', r3.changed === false);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
