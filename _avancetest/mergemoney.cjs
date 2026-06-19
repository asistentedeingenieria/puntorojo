/* SYNC DE PLATA (v752) — _mergeById: unión por id de pólizas/anticipos/solicitudes
   entre dispositivos. Antes era last-write-wins (state=merged) y un celular con
   datos viejos pisaba el cambio recién hecho ("no se guarda"). Ahora se UNEN:
   gana el _ts (fallback ts) más nuevo; los borrados van por tombstone. */
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function ext(name){ const m=html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}')); if(!m){ console.log('NO '+name+' FOUND'); process.exit(2);} return m[0]; }
const MERGE = new Function(ext('_mergeById')+'\nreturn _mergeById;')();

let pass=0, fail=0;
const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));
const ids=r=>r.list.map(x=>x.id).sort().join(',');
const byId=(r,id)=>r.list.find(x=>x.id===id);

// 1) local-only id se preserva (otro celular con lista vieja NO debe borrarlo)
let r=MERGE([{id:'a',ts:1},{id:'b',ts:1}], [{id:'a',ts:1}], null);
ok('local-only b preservado', ids(r)==='a,b' && r.changed===true);

// 2) remote-only id se incluye
r=MERGE([{id:'a',ts:1}], [{id:'a',ts:1},{id:'c',ts:1}], null);
ok('remote-only c incluido', ids(r)==='a,c');

// 3) EL BUG: edit local (mismo id, _ts más nuevo) GANA sobre el remoto stale
r=MERGE([{id:'p',ts:100,_ts:200,monto:50}], [{id:'p',ts:100,monto:99}], null);
ok('edit local (más nuevo) gana', byId(r,'p').monto===50 && r.changed===true);

// 4) remoto más nuevo gana sobre local viejo
r=MERGE([{id:'p',ts:100,_ts:100,monto:50}], [{id:'p',ts:100,_ts:300,monto:99}], null);
ok('remoto más nuevo gana', byId(r,'p').monto===99 && r.changed===false);

// 5) solicitud: APROBADA local (_ts nuevo) vence a PENDIENTE remota (ts viejo)
r=MERGE([{id:'s',ts:10,_ts:20,estado:'APROBADA'}], [{id:'s',ts:10,estado:'PENDIENTE'}], null);
ok('solicitud APROBADA local vence PENDIENTE remota', byId(r,'s').estado==='APROBADA');

// 6) tombstone borra de ambos lados (no resucita un borrado)
r=MERGE([{id:'x',ts:5}], [{id:'x',ts:5},{id:'y',ts:5}], {x:Date.now()});
ok('tombstone borra x', ids(r)==='y');

// 7) version: _ts tiene prioridad sobre ts
r=MERGE([{id:'p',ts:999,_ts:1,v:'L'}], [{id:'p',ts:1,_ts:2,v:'R'}], null);
ok('_ts manda sobre ts (gana R)', byId(r,'p').v==='R');

// 8) sin _ts: cae a ts; mayor ts gana
r=MERGE([{id:'p',ts:5,v:'L'}], [{id:'p',ts:9,v:'R'}], null);
ok('fallback ts: mayor gana (R)', byId(r,'p').v==='R');

// 9) empate de version: se conserva el remoto (no flip-flop), changed=false
r=MERGE([{id:'p',_ts:7,v:'L'}], [{id:'p',_ts:7,v:'R'}], null);
ok('empate -> remoto, sin changed', byId(r,'p').v==='R' && r.changed===false);

// 10) inputs vacíos / no-array no crashean
ok('inputs vacíos seguros', MERGE(null, null, null).list.length===0 && MERGE(undefined, [{id:'z',ts:1}]).list.length===1);

// 11) objetos sin id se ignoran (no rompen)
r=MERGE([{ts:1},{id:'a',ts:1}], [{id:'a',ts:1}], null);
ok('objeto sin id ignorado', ids(r)==='a');

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
