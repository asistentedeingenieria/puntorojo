/* v1258 (Antonio, 18-ago: "el proveedor pidió cambio de precio en una OC ya autorizada y
   compartida — ¿cómo lo manejamos?"). Una autorizada JAMÁS se edita en el lugar (el sello,
   el QR y la copia sellada cubren el monto QUE FINANZAS FIRMÓ, v1220). El circuito correcto:
   a) RETIRAR AUTORIZACIÓN (finanzas, motivo obligatorio y auditado): la orden vuelve
      DEVUELTA a compras, se limpia la firma (sin firma no hay QR) y sigue el circuito de
      corrección normal (v1235) — el precio nuevo del catálogo entra solo al re-armar.
      Solo serie OC (los despachos ya movieron bodega) y solo si NO fue recibida.
   b) LA HOJA VIEJA DELATA: al retirar la autorización (o al ELIMINAR una autorizada), la
      copia sellada en la nube se sobreescribe con ANULADA — quien escanee el QR de la
      hoja ya compartida ve en ROJO "NO PAGAR CONTRA ESTA HOJA" en vez de "válida". */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const vh = fs.readFileSync(path.join(__dirname, '..', 'verificar.html'), 'utf8');
function ex(src, marker){ let m=src.indexOf(marker); if(m<0) return ''; let i=src.indexOf('{',m),d=0; for(;i<src.length;i++){ if(src[i]==='{')d++; else if(src[i]==='}'){ d--; if(d===0) return src.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

console.log('— a) RETIRAR AUTORIZACIÓN —');
const zR = ex(html, 'window._ocRetirarAutorizacion = async function');
ok('existe y exige el permiso de finanzas', /compras\.revisar/.test(zR) && /users\.manage/.test(zR));
ok('solo sobre una AUTORIZADA', /'AUTORIZADA'/.test(zR));
ok('solo serie OC — despachos/pre-pago/trasiego/producción bloqueados', /esDespacho/.test(zR) && /esPrepago/.test(zR) && /esTrasiego/.test(zR) && /esProduccion/.test(zR));
ok('si ya fue RECIBIDA no se puede', /_ocPendienteDeRecibir/.test(zR));
ok('motivo OBLIGATORIO y modal con captura por oninput (patrón v813)', /oninput="window\._retAutzForm/.test(zR) && /OBLIGATORIO/.test(zR));
ok('re-lee del state vivo tras el await (regla v769)', (zR.match(/_bodegaFindOc\(/g) || []).length >= 2);
ok('guarda el histórico de quién había firmado', /autzRetirada/.test(zR) && /autorizadoPor: /.test(zR));
ok('limpia la firma (sin firma no hay QR): autorizadoPor/Ts, firmaDigital, selloDigital',
  /autorizadoPor = ''/.test(zR.replace(/\s+/g, ' ')) && /autorizadoTs = null/.test(zR.replace(/\s+/g, ' ')) && /firmaDigital/.test(zR) && /selloDigital/.test(zR));
ok('queda DEVUELTA con la observación para compras y sella _ts', /'DEVUELTA'/.test(zR) && /devolucion/.test(zR) && /_ts = _t/.test(zR.replace(/\s+/g, ' ')));
ok('canal fuerte con aviso si no subió (regla v1252)', /forceUploadNow/.test(zR) && /NO SUBIÓ/.test(zR));
ok('el botón sale en el menú de la tarjeta para finanzas sobre autorizadas',
  /RETIRAR AUTORIZACIÓN/.test(ex(html, 'function renderOrdenesList(')) && /_ocRetirarAutorizacion\(/.test(html));

console.log('— b) la hoja vieja delata la anulación —');
const zA = ex(html, 'window._ocVerifAnular = async function');
ok('existe el anulador de la copia sellada (mismo cifrado x/k/t)', /anulada: true/.test(zA) && /_qrCifrar/.test(zA) && /collection\('ocVerif'\)/.test(zA));
ok('retirar la autorización anula la copia', /_ocVerifAnular\(/.test(zR));
ok('ELIMINAR una autorizada también', /_ocVerifAnular\(/.test(ex(html, 'function _doDeleteOrden(')));
ok('verificar.html pinta el aviso ROJO y no pinta renglones ni firmas',
  /d\.anulada/.test(vh) && /NO PAGAR CONTRA ESTA HOJA/.test(vh) && /ANULADA/.test(vh));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
