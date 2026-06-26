/* v844: el ADMIN puede ELIMINAR definitivamente una solicitud de anticipo CANCELADA.
   Tombstone (solicitudesAnticipoEliminadas) para que el sync NO la reviva (hoy solicitudesAnticipo
   se une SIN tombstone → reaparecería). Borra también los archivos de Storage best-effort. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) eliminarSolicitudAnticipo
const src = extractAssigned('eliminarSolicitudAnticipo');
ok('eliminarSolicitudAnticipo existe', !!src);
ok('gateado a admin', src.indexOf('_antEsAdmin()')>=0);
ok('solo CANCELADAS', /estado\s*!==\s*'cancelada'/.test(src));
ok('confirma con prConfirm danger', src.indexOf('prConfirm')>=0 && /danger\s*:\s*true/.test(src));
ok('re-lee del state vivo tras el modal (stale-ref)', (src.match(/_antSolics\(\)\.find/g)||[]).length>=2);
ok('tombstone solicitudesAnticipoEliminadas', src.indexOf('solicitudesAnticipoEliminadas')>=0);
ok('quita del array (splice)', src.indexOf('.splice(')>=0);
ok('persiste con _antSolicSave', src.indexOf('_antSolicSave')>=0);
ok('borra archivos de Storage best-effort', src.indexOf('refFromURL')>=0);

// 2) applyRemote: el merge de solicitudesAnticipo ahora usa el tombstone (no null)
ok('merge solicitudesAnticipo con tombstone (no null)',
  /_mergeById\(\(state && state\.solicitudesAnticipo\) \|\| \[\], merged\.solicitudesAnticipo \|\| \[\], _solAnTomb\)/.test(html));
ok('tombstone de solicitudesAnticipo se une local U remoto',
  /_solAnTomb\s*=\s*Object\.assign\(\{\}[\s\S]{0,140}solicitudesAnticipoEliminadas/.test(html));

// 3) render: botón ELIMINAR solo para cancelada + admin
const srcRen = extractFn('_antSolicRender');
ok('render ELIMINAR para cancelada+admin',
  srcRen.indexOf('eliminarSolicitudAnticipo')>=0 && /estado==='cancelada'\s*&&\s*_antEsAdmin\(\)/.test(srcRen) && srcRen.indexOf('ELIMINAR')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
