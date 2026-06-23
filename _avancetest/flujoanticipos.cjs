/* v777: flujo de anticipos (solicitud -> cotizacion -> autorizacion -> alta auto).
   Logica pura: maquina de estados + armado del anticipo del catalogo desde la solicitud. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); return m?m[0]:''; }
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
}

// estructural
ok('permiso anticipos.solicitar', html.indexOf("'anticipos.solicitar'")>=0);
ok('permiso anticipos.cotizar', html.indexOf("'anticipos.cotizar'")>=0);
ok('applyRemote une solicitudesAnticipo', /_mergeById\([\s\S]{0,80}solicitudesAnticipo/.test(html));
ok('sub-pestaña SOLICITUDES (antsolic)', html.indexOf("'antsolic'")>=0);
// v778: el campo "para quién" es un desplegable ordenado de colaboradores, no texto libre
ok('_antColabOptions existe (lista de colaboradores)', html.indexOf('_antColabOptions')>=0);
// v789: el campo "para quién" es un combobox escribible (buscar), no un <select> ni texto libre
ok('antSolColab es combobox escribible (input oculto + buscador)', /<input type="hidden" id="antSolColab"/.test(html) && html.indexOf('id="antColabInput"')>=0);
// v780: el solicitante NUNCA pone monto estimado -> el campo fue removido por completo
ok('sin input antSolMonto (monto estimado removido)', html.indexOf('antSolMonto')<0);
ok('sin lectura de montoEst en crearSolicitudAnticipo', html.indexOf('montoEst')<0);
ok('sin campo montoEstimado en la solicitud', html.indexOf('montoEstimado')<0);
// v781: el flujo (solicitud->cotizacion->autorizacion) es la UNICA via -> sin alta manual
ok('sin boton + AGREGAR ANTICIPO', html.indexOf('+ AGREGAR ANTICIPO')<0);
ok('sin handler window.agregarAnticipo', html.indexOf('window.agregarAnticipo')<0);
// editar anticipos existentes SI se conserva (comparte _formHTML)
ok('editarAnticipo se conserva', html.indexOf('window.editarAnticipo')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
