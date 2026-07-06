/* v897 BLINDAJE DE FOTOS DE AVANCE (incidente 07-jul: "las fotos no se suben / nadie las ve").
   Las fotos viven en el doc del proyecto y ese doc era LAST-WRITE-WINS: dos teléfonos subiendo
   a la vez (o uno bloqueado por el candado de versión que recarga) se borraban los metadatos
   entre sí. Ahora: unión por URL por apto/etapa (_mergeFotosApto), respetando slot libre,
   arrastrando ts/hash/pHash; borrados reales en a.fotosEliminadas {url:ts} (no resucitan y
   se propagan); _mergeFotosProyecto recorre torre→nivel→apto por id; hook en applyRemote
   con alarma BLINDAJE DE FOTOS. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcA = extractFn('_mergeFotosApto');
ok('_mergeFotosApto existe', !!srcA);
let mA = null;
if (srcA) {
  mA = new Function(srcA + '\nreturn _mergeFotosApto;')();

  // 1) rescate: el remoto perdió la foto local (LWW) → se preserva con su ts/hash en el MISMO slot
  const la = { id:'a1', photos:{ '1':['u1',null] }, photoTs:{ '1':[111,null] }, photoHashes:{ '1':['h1',null] }, photoPHashes:{ '1':['p1',null] } };
  const ra = { id:'a1', photos:{ '1':[null,null] }, photoTs:{ '1':[null,null] }, photoHashes:{ '1':[null,null] }, photoPHashes:{ '1':[null,null] } };
  ok('rescata la foto local perdida', mA(la, ra)===true && ra.photos['1'][0]==='u1' && ra.photoTs['1'][0]===111 && ra.photoHashes['1'][0]==='h1');
  ok('idempotente (regla v856)', mA(la, ra)===false);

  // 2) slot ocupado por OTRA foto → se conservan LAS DOS (unión, nunca se pierde una)
  const la2 = { id:'a2', photos:{ '0':['uLocal'] }, photoTs:{ '0':[5] } };
  const ra2 = { id:'a2', photos:{ '0':['uRemota'] }, photoTs:{ '0':[9] } };
  ok('conflicto de slot: quedan las dos', mA(la2, ra2)===true && ra2.photos['0'].indexOf('uRemota')>=0 && ra2.photos['0'].indexOf('uLocal')>=0);

  // 3) tombstone: una foto BORRADA de verdad no resucita y el borrado se propaga
  const la3 = { id:'a3', photos:{ '2':['uBorrada'] }, fotosEliminadas:{ 'uBorrada': 999 } };
  const ra3 = { id:'a3', photos:{ '2':['uBorrada','uViva'] } };
  const r3 = mA(la3, ra3);
  ok('borrado propaga: sale del remoto y no resucita', r3===true && ra3.photos['2'].indexOf('uBorrada')<0 && ra3.photos['2'].indexOf('uViva')>=0 && ra3.fotosEliminadas && ra3.fotosEliminadas['uBorrada']===999);

  // 4) sin nada que hacer → false (no genera bucles de sync)
  const la4 = { id:'a4', photos:{ '1':['u1'] } };
  const ra4 = { id:'a4', photos:{ '1':['u1'] } };
  ok('iguales: no toca nada', mA(la4, ra4)===false);
}

const srcP = extractFn('_mergeFotosProyecto');
ok('_mergeFotosProyecto existe', !!srcP);
if (srcP && mA) {
  const mP = new Function('_mergeFotosApto', srcP + '\nreturn _mergeFotosProyecto;')(mA);
  const mkProj = (fotoUrl) => ({ id:'pr1', towers:[ { id:'t1', levels:[ { id:'l1', aptos:[ { id:'a1', photos:{ '0':[fotoUrl] } } ] } ] } ] });
  const lp = mkProj('uX'), rp = mkProj(null);
  ok('recorre torre→nivel→apto y rescata', mP(lp, rp)===1 && rp.towers[0].levels[0].aptos[0].photos['0'].indexOf('uX')>=0);
  ok('sin contraparte local: 0 y no truena', mP(null, mkProj('uY'))===0);
}

// ── cableado ──
ok('hook en applyRemote (mismo bloque v891)', /_mergeFotosProyecto\(_locProj\[rp && rp\.id\], rp\)/.test(html));
ok('alarma BLINDAJE DE FOTOS', html.indexOf('BLINDAJE DE FOTOS ACTIVADO')>=0);
ok('el borrado escribe su tombstone', /fotosEliminadas\[oldRef\] = Date\.now\(\)/.test(html));
ok('APP_SYNC_VERSION subida a 897', /const APP_SYNC_VERSION = 897;/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
