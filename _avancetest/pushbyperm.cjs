/* v800 (#4 punto b): push en tiempo real por permiso. El cliente escribe notifyByPerm;
   la Cloud Function onNotifyByPerm reparte el push leyendo `users` con admin SDK. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=fs.readFileSync(path.join(__dirname,'..','functions','index.js'),'utf8');
let pass=0,fail=0;const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

// ── cliente ──
ok('_pushByPerm existe', html.indexOf('window._pushByPerm')>=0);
ok('_pushByPerm escribe en notifyByPerm', /_pushByPerm[\s\S]{0,500}collection\('notifyByPerm'\)\.add/.test(html));
ok('_pushByPerm excluye al actor (excludeUid)', /_pushByPerm[\s\S]{0,700}excludeUid/.test(html));
ok('_antSolicNotif dispara el push además de la campanita', /function _antSolicNotif\(perms[\s\S]{0,700}_pushByPerm\(/.test(html));

// ── backend (Cloud Function) ──
ok('export onNotifyByPerm', fn.indexOf('exports.onNotifyByPerm')>=0);
ok("trigger en notifyByPerm/{id}", fn.indexOf("document: 'notifyByPerm/{id}'")>=0);
ok('lee users y matchea * / perm / email', /collection\('users'\)\.get\(\)[\s\S]{0,800}perms\.includes\('\*'\)/.test(fn) && /toEmails\.includes\(email\)/.test(fn));
ok('escribe a users/{uid}/notifications (dispara onNotificationCreated → push)', /doc\(uid\)\.collection\('notifications'\)\.add/.test(fn));
ok('borra el doc efímero notifyByPerm', /exports\.onNotifyByPerm[\s\S]{0,3500}snap\.ref\.delete\(\)/.test(fn));

console.log('PASS='+pass+' FAIL='+fail);
process.exit(fail?1:0);
