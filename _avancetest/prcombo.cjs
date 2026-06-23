/* v795: combobox genérico de personas (prPersonCombo) — reusa .pr-combo, emite HTML
   como string + handlers globales keyed por id (sobrevive innerHTML). Pure: _prComboNorm,
   _prComboFilter. DOM: window.prCombo{Set,HTML,Open,Input,Pick,Clear,Key,Render,Blur}. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// extrae el cuerpo de una función por nombre con balance de llaves (indep. de indentación)
function extract(name){
  const m=html.indexOf('function '+name+'(');
  if(m<0) return null;
  let i=html.indexOf('{',m), depth=0;
  for(;i<html.length;i++){ if(html[i]==='{')depth++; else if(html[i]==='}'){depth--; if(depth===0) return html.slice(m,i+1);}}
  return null;
}

// ── estructura: registro + handlers + listener global ──
ok('registro _prCombos', /_prCombos\s*=\s*[A-Za-z.]*\._prCombos\s*\|\|\s*\{\}/.test(html) || /window\._prCombos\s*=\s*window\._prCombos\s*\|\|\s*\{\}/.test(html));
ok('prComboSet', html.indexOf('prComboSet')>=0);
ok('prComboHTML', html.indexOf('prComboHTML')>=0);
ok('prComboOpen', html.indexOf('prComboOpen')>=0);
ok('prComboInput', html.indexOf('prComboInput')>=0);
ok('prComboPick', html.indexOf('prComboPick')>=0);
ok('prComboClear', html.indexOf('prComboClear')>=0);
ok('prComboKey', html.indexOf('prComboKey')>=0);
ok('prComboRender', html.indexOf('prComboRender')>=0);
ok('cierre por click-afuera (pointerdown)', /addEventListener\('pointerdown'[\s\S]{0,260}pr-combo\.open|pr-combo\.open[\s\S]{0,120}contains/.test(html));
ok('nav con flechas + .focused', (/ArrowDown/.test(html)&&/ArrowUp/.test(html)) && /focused/.test(html));
ok('emite clase pr-combo + panel', /class="pr-combo/.test(html) && html.indexOf('-panel')>=0);

// ── funcional: _prComboNorm + _prComboFilter ──
const bN=extract('_prComboNorm'), bF=extract('_prComboFilter');
ok('_prComboNorm extraída', !!bN);
ok('_prComboFilter extraída', !!bF);
if(bN && bF){
  const fn=new Function(bN+'\n'+bF+'\n return _prComboFilter;')();
  const items=['ANA','PEDRO','JUAN PABLO','PEDRO LUIS'];
  const r1=fn(items,'pedro',40).map(x=>x.label);
  ok('filtra substring case-insensitive', JSON.stringify(r1)===JSON.stringify(['PEDRO','PEDRO LUIS']));
  ok('q vacío devuelve todos', fn(items,'',40).length===4);
  const big=Array.from({length:100},(_,i)=>'P'+i);
  ok('respeta cap max', fn(big,'p',40).length===40);
  const objs=[{value:'id1',label:'ANA'},{value:'id2',label:'BETO'}];
  const r2=fn(objs,'ana',40);
  ok('normaliza objetos {value,label}', r2.length===1 && r2[0].value==='id1' && r2[0].label==='ANA');
  const norm=new Function(bN+'\n return _prComboNorm;')();
  ok('_prComboNorm string -> {value,label} iguales', (()=>{const n=norm(['X']);return n[0].value==='X'&&n[0].label==='X';})());
}

// ── v795: conversión de los 5 filtros de persona a combo ──
ok('filtro descGenPersona usa combo', /prComboSet\('descGenPersona'/.test(html) && /prComboHTML\('descGenPersona'/.test(html));
ok('filtro antCtrlPersona (vista 1) usa combo', /prComboSet\('antCtrlPersona'/.test(html));
ok('filtro antCtrlPersona (vista 2) usa combo', /prComboSet\('antCtrlPersona2'/.test(html));
ok('filtro antFiltroPersona usa combo', /prComboSet\('antFiltroPersona'/.test(html) && /prComboHTML\('antFiltroPersona'/.test(html));
ok('filtro polFiltroACargo usa combo', /prComboSet\('polFiltroACargo'/.test(html) && /prComboHTML\('polFiltroACargo'/.test(html));
ok('ya NO queda <select crudo de persona en anticipos', !/<select onchange="window\._(descGenPersona|antCtrlPersona|antFiltroPersona)=this\.value/.test(html));
ok('ya NO queda <select crudo de polFiltroACargo', !/<select onchange="window\._polFiltroACargo=this\.value/.test(html));

// ── v796: helper inline + conversión de 3 selects "elegir persona a pagar" ──
ok('prComboInline existe', html.indexOf('prComboInline')>=0);
ok('_prColabItems helper', html.indexOf('function _prColabItems(')>=0);
ok('ocColab (NUEVA OC) usa combo', /prComboInline\('ocColab'/.test(html) && !/<select id="ocColab"/.test(html));
ok('descObrero (NUEVO DESCUENTO) usa combo', /prComboInline\('descObrero'/.test(html));
ok('ocCatalogColab (CATÁLOGO OC) usa combo', /prComboInline\('ocCatalogColab'/.test(html) && !/<select id="ocCatalogColab"/.test(html));
ok('onPick de ocColab escribe a _ocDraft', /prComboInline\('ocColab'[\s\S]{0,260}_ocDraft[\s\S]{0,40}colaboradorId/.test(html));
ok('onPick de ocCatalogColab escribe a _ocCapturedForm', /prComboInline\('ocCatalogColab'[\s\S]{0,320}_ocCapturedForm[\s\S]{0,60}colaboradorId/.test(html));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
