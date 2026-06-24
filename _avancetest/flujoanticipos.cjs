/* v777: flujo de anticipos (solicitud -> cotizacion -> autorizacion -> ENTREGA -> alta).
   v820: se agrega el paso ENTREGADO (compras). El anticipo NO se crea al autorizar,
   sino cuando compras marca ENTREGADO. Cuotas 100% automaticas por monto (regla v416).
   Logica pura: maquina de estados + armado del anticipo del catalogo desde la solicitud. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
// extractor por balance de llaves (function plana NAME(...) o asignada window.NAME = function)
function extractAt(startIdx){ let i=html.indexOf('{',startIdx),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ const m=html.indexOf('function '+name+'('); return m<0?'':extractAt(m); }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); return m<0?'':extractAt(m); } // tolera function / async function
let pass=0,fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const srcNext = ext('_anticSolicNextEstado');
const srcBuild = ext('_anticBuildAnticipo');
ok('_anticSolicNextEstado existe', !!srcNext);
ok('_anticBuildAnticipo existe', !!srcBuild);
if(srcNext){
  const _next = new Function(srcNext+'\nreturn _anticSolicNextEstado;')();
  ok('cotizar desde pendiente_cotizacion -> pendiente_autorizacion', _next('pendiente_cotizacion','cotizar')==='pendiente_autorizacion');
  ok('autorizar desde pendiente_autorizacion -> autorizada', _next('pendiente_autorizacion','autorizar')==='autorizada');
  ok('rechazar desde pendiente_autorizacion -> rechazada', _next('pendiente_autorizacion','rechazar')==='rechazada');
  ok('cancelar desde pendiente_cotizacion -> cancelada', _next('pendiente_cotizacion','cancelar')==='cancelada');
  ok('cancelar desde pendiente_autorizacion -> cancelada', _next('pendiente_autorizacion','cancelar')==='cancelada');
  ok('autorizar SIN cotizacion (pendiente_cotizacion) invalido', _next('pendiente_cotizacion','autorizar')===null);
  ok('cotizar una ya autorizada invalido', _next('autorizada','cotizar')===null);
  ok('cancelar una autorizada invalido', _next('autorizada','cancelar')===null);
  // v820: nuevo paso ENTREGA
  ok('v820 entregar desde autorizada -> entregada', _next('autorizada','entregar')==='entregada');
  ok('v820 entregar antes de autorizar (pendiente_autorizacion) invalido', _next('pendiente_autorizacion','entregar')===null);
  ok('v820 entregar una ya entregada invalido', _next('entregada','entregar')===null);
}
if(srcBuild){
  const _build = new Function(srcBuild+'\nreturn _anticBuildAnticipo;')();
  const sol = { id:'solant-1', colaboradorId:'c1', colaboradorNombre:'JUAN PEREZ', subtipo:'PRESTAMO_HERRAMIENTA', descripcion:'Taladro', cotMonto:1500, cotProveedor:'FERRETERIA X' };
  const a = _build(sol, 4, { id:'ant-9', ts:123, creadoPor:'a@b.com', creadoNombre:'ADMIN', fecha:'2026-06-19' });
  ok('monto = cotizacion', a.montoTotal===1500);
  ok('cuotas respetadas', a.cantidadCuotas===4);
  ok('cuotas cap 6', _build(sol, 99, {}).cantidadCuotas===6);
  ok('cuotas min 1', _build(sol, 0, {}).cantidadCuotas===1);
  ok('cuotasPagadasInicial 0', a.cuotasPagadasInicial===0);
  ok('colaborador de la solicitud', a.colaboradorNombre==='JUAN PEREZ' && a.colaboradorId==='c1');
  ok('subtipo de la solicitud', a.subtipo==='PRESTAMO_HERRAMIENTA');
  ok('desc incluye proveedor', a.desc.indexOf('Taladro')>=0 && a.desc.indexOf('FERRETERIA X')>=0);
  ok('trazabilidad origenSolicitud', a.origenSolicitud==='solant-1');
  const a2 = _build(Object.assign({}, sol, { cotItem:'TALADRO DEWALT DCD771' }), 4, {});
  ok('v790: desc usa cotItem (nombre de compras) si existe', a2.desc.indexOf('TALADRO DEWALT DCD771')>=0 && a2.desc.indexOf('Taladro · ')<0);
}

// v820: regla de cuotas POR MONTO (v416) usada por el flujo. Extraida y evaluada.
const srcCuotas = extractAssigned('_v416CuotasPorMonto');
ok('_v416CuotasPorMonto existe', !!srcCuotas);
if(srcCuotas){
  const _cuotas = new Function('var window={};\n'+srcCuotas+'\nreturn window._v416CuotasPorMonto;')();
  ok('monto 0 -> 1 cuota', _cuotas(0)===1);
  ok('monto < 400 -> 2 cuotas', _cuotas(399)===2 && _cuotas(375)===2);
  ok('monto 400-600 -> 3 cuotas', _cuotas(400)===3 && _cuotas(600)===3);
  ok('monto 601-900 -> 4 cuotas', _cuotas(601)===4 && _cuotas(900)===4);
  ok('monto 901-1000 -> 5 cuotas', _cuotas(901)===5 && _cuotas(1000)===5);
  ok('monto > 1000 -> 6 cuotas', _cuotas(1001)===6 && _cuotas(5000)===6);
}

// v820: AUTORIZAR ya NO crea el anticipo; calcula cuotas con la regla v416 y deja estado autorizada.
const srcAut = extractAssigned('autorizarSolicitudAnticipoFlujo');
ok('autorizarSolicitudAnticipoFlujo existe', !!srcAut);
ok('v820 autorizar setea estado autorizada', /sol\.estado\s*=\s*'autorizada'/.test(srcAut));
ok('v820 autorizar NO empuja a anticipos (no _getAnticipos().push)', srcAut.indexOf('_getAnticipos().push')<0);
ok('v820 autorizar calcula cuotas con _v416CuotasPorMonto', srcAut.indexOf('_v416CuotasPorMonto')>=0);
ok('v820 autorizar ya no lee el input antAutCuotas', srcAut.indexOf('antAutCuotas')<0);

// v820: ENTREGAR (compras/gerente) crea el anticipo y pasa a entregada.
const srcEnt = extractAssigned('entregarSolicitudAnticipo');
ok('v820 entregarSolicitudAnticipo existe', !!srcEnt);
ok('v820 entregar crea el anticipo (push a anticipos)', srcEnt.indexOf('_getAnticipos().push')>=0);
ok('v820 entregar setea estado entregada', /\.estado\s*=\s*'entregada'/.test(srcEnt));
ok('v820 entregar calcula cuotas con _v416CuotasPorMonto', srcEnt.indexOf('_v416CuotasPorMonto')>=0);
ok('v820 entregar fuerza la subida (es plata: _antSolicSave hace saveState+forceUploadNow)', /_antSolicSave\(\)/.test(srcEnt));
ok('v820 entregar re-valida tras el modal (patron stale-ref)', srcEnt.indexOf('LA SOLICITUD YA CAMBIÓ DE ESTADO')>=0 || /estado!==.?'autorizada'/.test(srcEnt.split('await')[1]||''));
ok('v820 entregar gateado a compras o gerente', /anticipos\.cotizar/.test(srcEnt) && /_antEsGerente/.test(srcEnt));

// v820: el modal de AUTORIZAR ya NO tiene campo editable de cuotas (100% automatico).
const srcAbrirAut = extractAssigned('_antAbrirAutorizar');
ok('_antAbrirAutorizar existe', !!srcAbrirAut);
ok('v820 modal autorizar sin input editable de cuotas', srcAbrirAut.indexOf('id="antAutCuotas"')<0);
ok('v820 modal autorizar muestra cuotas auto por monto', srcAbrirAut.indexOf('_v416CuotasPorMonto')>=0);

// v820: meta de estados incluye entregada (verde) y autorizada pasa a "POR ENTREGAR".
const srcMeta = extractFn('_antSolicEstadoMeta');
ok('_antSolicEstadoMeta existe', !!srcMeta);
ok('v820 estado entregada en la meta', /entregada:\{/.test(srcMeta) && /ENTREGAD/.test(srcMeta));
ok('v820 autorizada = POR ENTREGAR en la meta', /POR ENTREGAR/.test(srcMeta));

// v820: la tarjeta (foto 2) muestra el boton ENTREGADO y todo en MAYUSCULAS.
const srcRender = extractFn('_antSolicRender');
ok('_antSolicRender existe', !!srcRender);
ok('v820 boton ENTREGADO en la tarjeta', /ENTREGADO/.test(srcRender) && /entregarSolicitudAnticipo\(/.test(srcRender));
ok('v820 boton ENTREGADO solo en estado autorizada', /estado===.?'autorizada'/.test(srcRender));
ok('v820 tarjeta de solicitud en MAYUSCULAS (la tarjeta misma, no el header)', /background:#FAFAFA;text-transform:uppercase/.test(srcRender));

// v820: el badge de pendientes cuenta "autorizada" como tarea de COMPRAS (entregar).
const srcPend = extractAssigned('_antSolicPendientesParaMi');
ok('_antSolicPendientesParaMi existe', !!srcPend);
ok('v820 badge cuenta autorizada para compras (entregar pendiente)', /estado===.?'autorizada'[\s\S]{0,90}anticipos\.cotizar/.test(srcPend));

// estructural (sin cambios de versiones previas)
ok('permiso anticipos.solicitar', html.indexOf("'anticipos.solicitar'")>=0);
ok('permiso anticipos.cotizar', html.indexOf("'anticipos.cotizar'")>=0);
ok('applyRemote une solicitudesAnticipo', /_mergeById\([\s\S]{0,80}solicitudesAnticipo/.test(html));
ok('sub-pestaña SOLICITUDES (antsolic)', html.indexOf("'antsolic'")>=0);
ok('_antColabOptions existe (lista de colaboradores)', html.indexOf('_antColabOptions')>=0);
ok('antSolColab es combobox escribible (input oculto + buscador)', /<input type="hidden" id="antSolColab"/.test(html) && html.indexOf('id="antColabInput"')>=0);
ok('v790: cotización tiene input antCotItem', html.indexOf('id="antCotItem"')>=0);
ok('v790: subir cotización guarda sol.cotItem', html.indexOf('sol.cotItem=item')>=0);
ok('v791: supervisor ve RESUMEN + SOLICITUDES (no solo antsolic)', html.indexOf("if(!_gestAnt && window._antView!=='resumen' && window._antView!=='antsolic') window._antView='resumen'")>=0);
ok('v790: sub-pestañas de gestión gateadas', html.indexOf('if(_gestAnt){')>=0);
ok('sin input antSolMonto (monto estimado removido)', html.indexOf('antSolMonto')<0);
ok('sin lectura de montoEst en crearSolicitudAnticipo', html.indexOf('montoEst')<0);
ok('sin campo montoEstimado en la solicitud', html.indexOf('montoEstimado')<0);
ok('sin boton + AGREGAR ANTICIPO', html.indexOf('+ AGREGAR ANTICIPO')<0);
ok('sin handler window.agregarAnticipo', html.indexOf('window.agregarAnticipo')<0);
ok('editarAnticipo se conserva', html.indexOf('window.editarAnticipo')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
