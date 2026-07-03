/* v883: FIX del candado del instalador — AUTORIZAR una solicitud de pago-a-otra-persona YA NO crea
   el pago (antes nacía en la sesión de la GERENTE, le armaba SU liquidación y al supervisor la
   etapa le figuraba pagada). Ahora: autorizar solo marca 'aprobada'; el SUPERVISOR genera el pago
   (el candado deja pasar la combinación apto+etapa+persona aprobada y consume la solicitud → 'usada'). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── funcional: _solPagoAprobada encuentra la solicitud correcta ──
const src = extractFn('_solPagoAprobada');
ok('_solPagoAprobada existe', !!src);
if (src) {
  const mk = (sols) => new Function('state', src + '\nreturn _solPagoAprobada;')({ solicitudesPagoEtapa: sols });
  const sols = [
    { id:'a', estado:'aprobada', projectId:'p1', aid:'apto1', stageIdx:2, colaboradorId:'c1', colaboradorNombre:'LUDVIN' },
    { id:'b', estado:'pendiente', projectId:'p1', aid:'apto1', stageIdx:3, colaboradorId:'c1', colaboradorNombre:'LUDVIN' },
    { id:'c', estado:'usada', projectId:'p1', aid:'apto1', stageIdx:1, colaboradorId:'c1', colaboradorNombre:'LUDVIN' },
  ];
  const f = mk(sols);
  ok('encuentra la aprobada exacta', (f('p1','apto1',2,'c1','LUDVIN')||{}).id === 'a');
  ok('pendiente NO cuenta', f('p1','apto1',3,'c1','LUDVIN') === null);
  ok('usada NO cuenta (no se reutiliza)', f('p1','apto1',1,'c1','LUDVIN') === null);
  ok('otra persona NO pasa', f('p1','apto1',2,'c2','OTRO') === null);
  ok('match por nombre si no hay id', (f('p1','apto1',2,'','LUDVIN')||{}).id === 'a');
}

// ── autorizar YA NO crea el pago ──
const aut = html.slice(html.indexOf('window.autorizarSolicitudPagoEtapa'), html.indexOf('window.rechazarSolicitudPagoEtapa'));
ok('autorizar NO llama _crearPagoEtapaPlanilla', aut.indexOf('_crearPagoEtapaPlanilla(') < 0);
ok('autorizar marca aprobada', aut.indexOf("sol.estado='aprobada'") >= 0);
ok('notif avisa al supervisor que genere', /GENERAR el pago/i.test(aut));
ok('toast nuevo (sin Y GENERADO)', aut.indexOf('PAGO AUTORIZADO Y GENERADO') < 0);

// ── el candado deja pasar la aprobada y la consume al generar ──
ok('gate consulta la solicitud aprobada', html.indexOf('window.__solpeAprobada = _ownerConf ?') >= 0);
ok('solo pide solicitud si NO hay aprobada', html.indexOf('if(_ownerConf && !window.__solpeAprobada){') >= 0);
ok('el pago consume la solicitud (usada + pagoId)', /__solpeAprobada\.estado='usada'; window\.__solpeAprobada\.pagoId=pagoId/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
