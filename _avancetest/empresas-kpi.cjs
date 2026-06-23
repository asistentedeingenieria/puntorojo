/* v786: EMPRESAS deja de ser la tarjeta grande; queda compacta al lado de PERSONAL
   (par 2 columnas) y los chips + "NUEVA EMPRESA" van a una tira aparte debajo. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

ok('EMPRESAS ya no es la tarjeta grande (sin kpi-empresas)', html.indexOf('kpi-empresas')<0);
ok('par PERSONAL+EMPRESAS en 2 columnas', /persKpiPair[\s\S]{0,200}grid-template-columns:1fr 1fr/.test(html));
ok('tira de gestion de empresas aparte (persEmpManage)', html.indexOf('persEmpManage')>=0);
ok('EMPRESAS es KPI compacto (solo el numero)', html.indexOf('<div class="kpi cafe"><div class="lbl">Empresas</div><div class="val">${empresas.length}</div>')>=0);
ok('se conserva agregar empresa (input + fn)', html.indexOf('_kpiEmpInput')>=0 && html.indexOf('_kpiAgregarEmpresa()')>=0);

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
