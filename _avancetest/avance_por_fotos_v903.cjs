/* v903: AVANCE POR FOTOS (pedido 13-jul: "que ya solo se tengan que subir las fotos").
   (1) _autoMarcarEtapaPorFotos: 2 fotos válidas en la etapa → el cuadrito se marca SOLO
       (sella stagesTs para el merge v900; marca ÚNICAMENTE esa etapa — sin cascada, las
       fotos van en cualquier orden desde v863); 1 foto → 'falta1' (aviso de la 2ª).
   (2) Los 3 flujos de subida de foto llaman el auto-marcado y el toast final informa:
       "ETAPA MARCADA AUTOMÁTICAMENTE" / "FALTA LA 2ª FOTO PARA MARCAR LA ETAPA".
   (3) toggleStage: el ENCARGADO ya no marca tocando el cuadrito (decisión del user);
       gerente/admin conservan el toque manual para correcciones. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const src = extractFn('_autoMarcarEtapaPorFotos');
ok('_autoMarcarEtapaPorFotos existe', !!src);
if (src) {
  const f = new Function(src + '\nreturn _autoMarcarEtapaPorFotos;')();

  // 2 fotos y sin marcar → marca SOLO esa etapa, con sello
  const a1 = { photos: { '2': ['u1','u2'] }, stages: [true,true,false,false,false,false], stagesTs: [1,2] };
  ok('2 fotos → marcada con sello', f(a1,2)==='marcada' && a1.stages[2]===true && typeof a1.stagesTs[2]==='number' && a1.stagesTs[2]>0);
  ok('sin cascada: las demás etapas no se tocan', a1.stages[3]===false && a1.stages[4]===false);

  // 1 foto → pide la segunda, NO marca
  const a2 = { photos: { '0': ['u1'] }, stages: [false,false,false,false,false,false] };
  ok('1 foto → falta1 y no marca', f(a2,0)==='falta1' && a2.stages[0]===false);

  // ya marcada → no re-sella (el sello original manda en el merge)
  const a3 = { photos: { '1': ['u1','u2'] }, stages: [false,true,false,false,false,false], stagesTs: [null,77] };
  ok('ya marcada → no toca el sello', f(a3,1)==='ya' && a3.stagesTs[1]===77);

  // 0 fotos / nulls no cuentan
  const a4 = { photos: { '4': [null,null] }, stages: [false,false,false,false,false,false] };
  ok('nulls no cuentan como fotos', f(a4,4)==='sin' && a4.stages[4]===false);

  // apto sin arrays → se construyen
  const a5 = { photos: { '0': ['u1','u2'] } };
  ok('apto virgen: construye stages y marca', f(a5,0)==='marcada' && a5.stages[0]===true && a5.stages.length===6);
}

// ── cableado en los 3 flujos de subida ──
ok('los 3 flujos llaman el auto-marcado', (html.match(/_autoMarcarEtapaPorFotos\(a, etapaIdx\)/g)||[]).length >= 3);
ok('toast de etapa marcada', (html.match(/ETAPA MARCADA AUTOMÁTICAMENTE/g)||[]).length >= 3);
ok('toast de falta la 2ª foto', (html.match(/FALTA LA 2ª FOTO PARA MARCAR LA ETAPA/g)||[]).length >= 3);

// ── toggleStage: encargado ya no marca manual ──
ok('encargado bloqueado del marcado manual', /accion === 'mark' && !esGerente/.test(html));
ok('mensaje que guía a subir fotos', html.indexOf('EL AVANCE SE MARCA SOLO AL SUBIR LAS 2 FOTOS DE LA ETAPA')>=0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
