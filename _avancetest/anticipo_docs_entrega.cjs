/* v841: antes de MARCAR ENTREGADO un anticipo hay que subir, en secuencia,
   FACTURA del producto y luego CARTA FIRMADA de recibido. Documentos irreversibles
   (solo admin reemplaza). Confirmación "¿es el correcto?" al subir. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// 1) PURO: _antDocsListos(sol) = factura && carta
const srcDocs = extractFn('_antDocsListos');
ok('_antDocsListos existe', !!srcDocs);
if(srcDocs){
  const f = new Function(srcDocs+'\nreturn _antDocsListos;')();
  ok('vacío -> false', f({})===false);
  ok('solo factura -> LISTO (v872: la carta ya no cuenta)', f({facturaUrl:'a'})===true);
  ok('solo carta -> false', f({cartaUrl:'b'})===false);
  ok('ambos -> true', f({facturaUrl:'a',cartaUrl:'b'})===true);
  ok('null -> false', f(null)===false);
}

// 2) _antEsAdmin = perms incluye '*'
const srcAdmin = extractFn('_antEsAdmin');
ok('_antEsAdmin existe', !!srcAdmin);
ok('_antEsAdmin chequea perms *', srcAdmin.indexOf("includes('*')")>=0);

// 3) subirDocAnticipo(solId, tipo)
const srcSubir = extractAssigned('subirDocAnticipo');
ok('subirDocAnticipo existe', !!srcSubir);
ok('sube a anticipos-factura', srcSubir.indexOf('anticipos-factura')>=0);
ok('sube a anticipos-carta', srcSubir.indexOf('anticipos-carta')>=0);
ok('guarda la URL del doc', srcSubir.indexOf('facturaUrl')>=0 && srcSubir.indexOf('cartaUrl')>=0);
ok('usa getDownloadURL', srcSubir.indexOf('getDownloadURL')>=0);
ok('secuencia: carta exige factura', srcSubir.indexOf('SUBÍ PRIMERO LA FACTURA')>=0);
ok('irreversible: ya subido sin admin aborta', srcSubir.indexOf('YA SE SUBIÓ')>=0);
ok('confirma documento correcto + irreversible', srcSubir.indexOf('CORRECTO')>=0 && /NO se podrá modificar/i.test(srcSubir));
ok('re-lee del state vivo tras await (stale-ref)', (srcSubir.match(/_antSolics\(\)\.find/g)||[]).length>=2);
ok('persiste con _antSolicSave', srcSubir.indexOf('_antSolicSave')>=0);
ok('borra archivo viejo en reemplazo admin', srcSubir.indexOf('refFromURL')>=0);

// 4) _antAbrirSubirDoc(solId, tipo)
const srcModal = extractAssigned('_antAbrirSubirDoc');
ok('_antAbrirSubirDoc existe', !!srcModal);
ok('input antDocFile', srcModal.indexOf('antDocFile')>=0);
ok('acepta foto o PDF', srcModal.indexOf('image/*')>=0 && srcModal.indexOf('application/pdf')>=0);
ok('llama subirDocAnticipo', srcModal.indexOf('subirDocAnticipo')>=0);

// 5) entregarSolicitudAnticipo: candado de documentos (lógica, no solo UI)
const srcEnt = extractAssigned('entregarSolicitudAnticipo');
ok('entregar existe', !!srcEnt);
ok('entregar exige documentos', srcEnt.indexOf('_antDocsListos')>=0 && srcEnt.indexOf('FALTA LA FACTURA')>=0);
ok('entregar valida en sol y sol2', (srcEnt.match(/_antDocsListos/g)||[]).length>=2);

// 6) _antSolicRender: UI del gate de 2 pasos + botón gated
const srcRen = extractFn('_antSolicRender');
ok('render existe', !!srcRen);
ok('render PASO 1 + SUBIR FACTURA', srcRen.indexOf('ÚLTIMO PASO')>=0 && srcRen.indexOf('SUBIR FACTURA')>=0);
ok('render SIN paso de carta (v872)', srcRen.indexOf('PASO 2')<0 && srcRen.indexOf('SUBIR CARTA')<0);
ok('render gate usa _antDocsListos', srcRen.indexOf('_antDocsListos')>=0);
ok('render MARCAR ENTREGADO con disabled', srcRen.indexOf('disabled')>=0 && srcRen.indexOf('MARCAR ENTREGADO')>=0);
ok('render abre subir doc', srcRen.indexOf('_antAbrirSubirDoc')>=0);
ok('render reemplazo admin', srcRen.indexOf('REEMPLAZAR (ADMIN)')>=0);
ok('render irreversible UI (facOk, sin carOk v872)', srcRen.indexOf('facOk')>=0 && srcRen.indexOf('carOk')<0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
