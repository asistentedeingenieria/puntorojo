/* v810: compartir PDF con plugin NATIVO (Capacitor Share+Filesystem) cuando existe en la
   app de Android, con fallback al Web Share API del WebView. Router puro:
   _pdfShareModo(caps, nav, file) -> 'native' | 'web' | 'none'. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
function extract(name){ const m=html.indexOf('function '+name+'('); if(m<0) return null; let i=html.indexOf('{',m),d=0; for(;i<html.length;i++){ if(html[i]==='{')d++; else if(html[i]==='}'){d--; if(d===0) return html.slice(m,i+1);}} return null; }

// estructura
ok('_pdfShareModo existe', html.indexOf('function _pdfShareModo(')>=0);
ok('_pdfCompartir usa el plugin nativo (Filesystem.writeFile + Share.share)', /Filesystem\.writeFile/.test(html) && /Share\.share/.test(html));
ok('dependencia @capacitor/share en package.json', !!(pkg.dependencies && pkg.dependencies['@capacitor/share']));
ok('dependencia @capacitor/filesystem en package.json', !!(pkg.dependencies && pkg.dependencies['@capacitor/filesystem']));

// funcional: router puro
const bMode=extract('_pdfShareModo'), bPuede=extract('_pdfPuedeCompartir');
ok('_pdfShareModo extraída', !!bMode);
if(bMode){
  const make=new Function((bPuede||'function _pdfPuedeCompartir(){return false;}')+'\n'+bMode+'\n return _pdfShareModo;')();
  const fileOK={};
  const navWeb={ share:function(){}, canShare:function(){return true;} };
  const navNo={};
  ok('native cuando hay Share+Filesystem', make({Share:{},Filesystem:{}}, navNo, null)==='native');
  ok('native aunque el WebView NO soporte canShare', make({Share:{},Filesystem:{}}, navNo, fileOK)==='native');
  ok('web cuando no hay plugins pero sí Web Share de archivos', make(null, navWeb, fileOK)==='web');
  ok('no es native si falta Filesystem (cae a web)', make({Share:{}}, navWeb, fileOK)==='web');
  ok('none cuando no hay ni plugins ni Web Share', make(null, navNo, fileOK)==='none');
}

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
