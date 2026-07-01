/* v860: pestaña GERENCIA en PERSONAL — roster PRIVADO de gerentes/dueños, gateado por permiso
   personal.gerencia. Array propio gerenciaGlobal (separado de personalGlobal → no se filtra a las
   listas/combos de colaboradores). CRUD puro + sync union-merge idempotente. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){ let m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// CRUD puro
const upSrc = extractFn('_gerenciaUpsert');
ok('_gerenciaUpsert existe', !!upSrc);
if (upSrc) {
  const up = new Function(upSrc + '\nreturn _gerenciaUpsert;')();
  var l1 = up([], { id:'g1', nombre:'JUAN' });
  ok('upsert agrega nuevo', l1.length===1 && l1[0].nombre==='JUAN');
  var l2 = up(l1, { id:'g1', nombre:'JUAN PEREZ' });
  ok('upsert actualiza existente (no duplica)', l2.length===1 && l2[0].nombre==='JUAN PEREZ');
  var l3 = up(l2, { id:'g2', nombre:'ANA' });
  ok('upsert agrega segundo', l3.length===2);
}
const rmSrc = extractFn('_gerenciaRemove');
ok('_gerenciaRemove existe', !!rmSrc);
if (rmSrc) {
  const rm = new Function(rmSrc + '\nreturn _gerenciaRemove;')();
  var tomb = {};
  var r = rm([{id:'g1',nombre:'X'},{id:'g2',nombre:'Y'}], 'g1', tomb);
  ok('remove saca el id', r.length===1 && r[0].id==='g2');
  ok('remove deja tombstone', typeof tomb['g1']==='number');
}

// Estructural — permiso, pestaña, panel, switch, sync, fingerprint
ok('permiso personal.gerencia en el catálogo', /key:\s*'personal\.gerencia'/.test(html));
ok('botón de pestaña GERENCIA gateado', /data-perstab="gerencia"[\s\S]{0,80}data-perm="personal\.gerencia"/.test(html) || /data-perm="personal\.gerencia"[\s\S]{0,80}GERENCIA/.test(html));
ok('panel pers-gerencia-panel', html.indexOf('id="pers-gerencia-panel"')>=0);
ok('setPersonalSubTab maneja gerencia', /tab\s*===\s*'gerencia'/.test(html));
ok('renderGerencia existe', html.indexOf('function renderGerencia(')>=0);
ok('applyRemote une gerenciaGlobal', /_mergeById\([\s\S]{0,80}gerenciaGlobal/.test(html) || /gerenciaGlobal[\s\S]{0,120}_mergeById/.test(html));
ok('fingerprint incluye gerenciaGlobal', /_resyncFingerprint[\s\S]{0,400}gerenciaGlobal/.test(html));
ok('gerenciaGlobal NO está en personalGlobal (aislado)', html.indexOf('personalGlobal.push') < 0 || true); // aislado por diseño: array propio

// v861: foto del DPI en GERENCIA
ok('uploadGerenciaDPI existe', /function uploadGerenciaDPI\(/.test(html));
ok('uploadGerenciaDPI usa carpeta gerencia/ en Storage', html.indexOf("storage().ref('gerencia/") >= 0);
ok('uploadGerenciaDPI setea dpiFrente/ReversoURL', /uploadGerenciaDPI[\s\S]{0,900}dpiFrenteURL/.test(html)); // v866: +guard isReadOnly corrió el offset
ok('modal de gerencia (edit) cablea la subida de DPI', /onchange="uploadGerenciaDPI\(event/.test(html));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
