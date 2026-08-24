/* v1277 (Antonio, 24-ago: "NO quiero que sea 2 minutos ni que salga ningún mensaje —
   cuando finanzas autorice, a compras le sale DE UNA VEZ; y para TODO, no solo
   finanzas/compras"): isUserBusy recortado con bisturí.
   ANTES: cualquier .modal-bg.show (la OC abierta, el catálogo, VER DETALLE) posponía
   applyRemote — la autorización LLEGABA en segundos pero quedaba invisible hasta
   cerrar el cuadro ("tarda 20 minutos").
   AHORA posponen SOLO: (a) los diálogos de espera (prConfirm y familia v770 — ahí
   vive la referencia tomada antes del await, y son breves); (b) el tipeo activo
   FUERA de un modal (el repintado de la lista mataría el input; adentro de un modal
   el input no se repinta). Todo lo demás se aplica AL INSTANTE, sin mensajes.
   Seguro porque los flujos de escritura de los modales re-leen el state VIVO por id
   (regla v769/v940/v964) y applyRemote no repinta el contenido del modal abierto
   (los repintados dirigidos v1248/v1266 apuntan a las listas). */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const z = ex('isUserBusy(){');
ok('los modales de trabajo (.modal-bg.show) YA NO posponen applyRemote', !/querySelector\('\.modal-bg\.show'\)/.test(z));
ok('los diálogos de espera (familia v770) SIGUEN posponiendo', /#prConfirmModal/.test(z) && /_firmaModal/.test(z) && /_recepcionModal/.test(z) && /\.prModal-backdrop/.test(z));
ok('el tipeo FUERA de un modal sigue protegido', /INPUT\|TEXTAREA\|SELECT/.test(z) && /return true/.test(z));
ok('el tipeo DENTRO de un modal ya no congela el sync', /closest\('\.modal-bg'\)/.test(z));
ok('los paneles de bodega/varios siguen FUERA (v961/v1266)', !/_bodegaPanelModal/.test(z) && !/_variosPanelModal/.test(z));

/* sin mensajes: el toast del pospuesto (v1276) murió el mismo día por orden de Antonio */
ok('no existe el toast LLEGARON CAMBIOS DEL EQUIPO', html.indexOf('LLEGARON CAMBIOS DEL EQUIPO') < 0);

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
