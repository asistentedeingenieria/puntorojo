/* v823: ajustes de UI (pedidos del user por fotos).
   F1/F3 tarjeta de avance físico: el nombre/info no se trunca, se ve completo (móvil).
   F2/F5 visor de PDF in-app: el título no se corta (envuelve completo).
   F3 HISTORIAL DE PLANILLAS CERRADAS: el conteo deja de quedar "feo" en otra fila.
   F4 listados de niveles: COLAPSADOS por defecto (se abren al tocar). */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extractFn(name){ const m=html.indexOf('function '+name+'('); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }
function extractAssigned(name){ const m=html.indexOf('window.'+name+' = '); if(m<0) return ''; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){ d--; if(d===0) return html.slice(m,i+1); } } return ''; }

// ── F4: niveles colapsados por defecto ──
const srcCol=extractFn('_avNivelColapsado');
const srcTog=extractAssigned('_avToggleNivel');
ok('_avNivelColapsado existe', !!srcCol);
ok('_avToggleNivel existe', !!srcTog);
if(srcCol && srcTog){
  const sb=new Function(
    'var window={_avNivelCol:{}};var document={getElementById:function(){return null;}};\n'+
    srcCol+'\n'+srcTog+'\n'+
    'return { col:_avNivelColapsado, tog:window._avToggleNivel };')();
  ok('F4 default COLAPSADO', sb.col('t','l')===true);
  sb.tog('t','l');
  ok('F4 primer tap ABRE', sb.col('t','l')===false);
  sb.tog('t','l');
  ok('F4 segundo tap COLAPSA', sb.col('t','l')===true);
}

// ── F1/F3: tarjeta de apto en móvil sin truncar ──
ok('F1 .apto-name móvil ya NO trunca (sin ellipsis)', !/\.apto-card \.apto-name\{font-size:11px;overflow:hidden;text-overflow:ellipsis/.test(html));
ok('F1 .apto-info móvil en columna (stack)', /\.apto-card \.apto-info\{[^}]*flex-direction:column/.test(html));
ok('F1 .apto-name móvil muestra completo (white-space normal)', /\.apto-card \.apto-name\{[^}]*white-space:normal/.test(html));

// ── F2/F5: visor PDF in-app, título completo (envuelve, sin ellipsis) ──
const srcVisor=extractFn('_pdfAbrirVisor');
ok('_pdfAbrirVisor existe', !!srcVisor);
ok('F2 título del visor NO trunca con ellipsis', !/font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/.test(srcVisor));
ok('F2 título del visor envuelve completo (word-break/normal)', /word-break:break-word/.test(srcVisor) || /white-space:normal/.test(srcVisor));

// ── F3: HISTORIAL en una fila (conteo fuera del título) ──
ok('F3 título HISTORIAL sin "·N" pegado dentro del strong', /HISTORIAL DE PLANILLAS CERRADAS<\/strong>/.test(html));
ok('F3 el conteo va junto al control (MOSTRAR/OCULTAR)', /cerradas\.length\+' · '\+\(histVisible/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
