/* v1270 (Antonio, 24-ago: "en VICINIA DEL CARMEN no me sale la información del proyecto
   seleccionado — antes salían pedidos de TORELO, después de LAS AMÉRICAS"):
   CAUSA RAÍZ (diagnóstico en vivo + código): la SOLICITUD DE ETAPA v1256 (solo VDC)
   nace SIN el campo `status`. renderPedidoCard hace `pd.status.replace(...)` →
   TypeError → renderPedidosList muere DESPUÉS de pintar los KPIs y ANTES de
   reemplazar la lista → quedan las tarjetas de la ÚLTIMA obra que sí pintó (la
   vista miente el proyecto entero, y como todos los llamadores hacen
   try{render}catch{}, nadie se entera). Los DATOS estaban sanos: 74 pedidos de VDC
   correctos; era solo la vista.
   FIX en 3 capas: (1) el creador v1256 nace con status; (2) self-heal en el render
   para los ya nacidos cojos (con sello _ts — union-merge v972 — para que viaje a la
   flota); (3) BLINDAJE: cada tarjeta se pinta en su propio try — una tarjeta dañada
   sale como tarjeta de error visible y JAMÁS vuelve a tumbar la lista entera. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function ex(marker){ let m=html.indexOf(marker); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

/* 1. el creador de la solicitud de etapa (v1256) nace CON status */
const iSol = html.indexOf('esSolicitudEtapa: true, solEtapaTid');
const zSol = iSol > 0 ? html.slice(iSol - 1600, iSol) : '';
ok('la solicitud de etapa v1256 nace con status SOLICITADO', /status: 'SOLICITADO'/.test(zSol));

/* 2. self-heal en renderPedidosList: status faltante se repara y se SELLA */
const zList = ex('function renderPedidosList(');
ok('self-heal: pedido sin status → SOLICITADO', /typeof pd\.status !== 'string'/.test(zList) && /pd\.status = 'SOLICITADO'/.test(zList));
ok('el heal SELLA _ts (union-merge v972) y guarda', /pd\._ts = Date\.now\(\)/.test(zList) && /_sinStatus/.test(zList));

/* 3. blindaje: cada tarjeta en su propio try — las 3 llamadas van por _cardSegura */
ok('_cardSegura existe con try/catch y tarjeta de error VISIBLE', /_cardSegura/.test(zList) && /catch/.test(zList.slice(zList.indexOf('_cardSegura'))) && /NO SE PUDO MOSTRAR/.test(zList));
const _directas = (zList.match(/renderPedidoCard\(pd, p\)/g) || []).length;
const _seguras = (zList.match(/_cardSegura\(pd\)/g) || []).length;
ok('NINGUNA tarjeta se pinta directo (las 3 llamadas van blindadas)', _directas === 1 && _seguras === 3);

/* 4. renderPedidoCard tolera status faltante (defensa en profundidad) */
const zCard = ex('function renderPedidoCard(');
ok('renderPedidoCard: statusClass no revienta sin status', /String\(pd\.status \|\| 'SOLICITADO'\)\.replace/.test(zCard));

console.log('PASS=' + pass + ' FAIL=' + fail);
process.exit(fail ? 1 : 0);
