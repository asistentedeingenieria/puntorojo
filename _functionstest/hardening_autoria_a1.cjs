/* Hardening backend batch 3 — A1: validar autoría de los triggers.
   - creatorIsStaff(db,uid): true si el creador tiene algún permiso (staff real), false si no/!existe,
     null si no se sabe (cliente viejo sin createdByUid) → el llamador decide (transición).
   - usersByPerm(db,perms): emails de users con alguno de esos permisos (o '*'), derivados del SERVIDOR.
   - onNotifyByPerm descarta si el creador no es staff; onExcepcionPago* derivan emails del servidor.
   - El cliente (index.html) agrega createdByUid al crear notifyByPerm y excepcionesPago. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function extractAt(s, startIdx){ let i=s.indexOf('{',startIdx),d=0; for(;i<s.length;i++){ if(s[i]==='{')d++; else if(s[i]==='}'){ d--; if(d===0) return s.slice(startIdx,i+1); } } return ''; }
function extractFn(name){ let m=js.indexOf('async function '+name+'('); if(m<0) m=js.indexOf('function '+name+'('); return m<0?'':extractAt(js, m); }
let pass=0, fail=0; const ok=(n,c)=>c?pass++:(fail++,console.log('FAIL '+n));

const stubDb = (usersById) => ({
  collection: () => ({
    doc: (id) => ({ get: async () => ({ exists: Object.prototype.hasOwnProperty.call(usersById,id), data: () => usersById[id] }) }),
    get: async () => ({ forEach: (cb) => Object.keys(usersById).forEach(id => cb({ id, data: () => usersById[id] })) })
  })
});

(async () => {
  // creatorIsStaff
  const srcStaff = extractFn('creatorIsStaff');
  ok('creatorIsStaff existe', !!srcStaff);
  if (srcStaff) {
    const fn = new Function('console', srcStaff + '\nreturn creatorIsStaff;')(console);
    const db = stubDb({ admin:{perms:['*']}, sup:{perms:['cobro.edit']}, nada:{perms:[]} });
    ok('uid vacío → null', (await fn(db, '')) === null);
    ok('uid inexistente → false', (await fn(db, 'ghost')) === false);
    ok('sin permisos → false', (await fn(db, 'nada')) === false);
    ok('con permiso → true', (await fn(db, 'sup')) === true);
    ok('admin → true', (await fn(db, 'admin')) === true);
  }

  // usersByPerm
  const srcUbp = extractFn('usersByPerm');
  ok('usersByPerm existe', !!srcUbp);
  if (srcUbp) {
    const fn = new Function(srcUbp + '\nreturn usersByPerm;')();
    const db = stubDb({ a:{perms:['*'],email:'A@x.com'}, b:{perms:['users.manage'],email:'b@x.com'}, c:{perms:['cobro.edit'],email:'c@x.com'}, d:{perms:['users.manage']} });
    const emails = await fn(db, ['users.manage']);
    ok('incluye admin (*)', emails.indexOf('a@x.com') >= 0);
    ok('incluye el del permiso', emails.indexOf('b@x.com') >= 0);
    ok('excluye sin permiso', emails.indexOf('c@x.com') < 0);
    ok('omite sin email', emails.length === 2);
  }

  // Wiring backend
  ok('onNotifyByPerm usa createdByUid', js.indexOf('req.createdByUid') >= 0);
  ok('onNotifyByPerm valida creatorIsStaff', /creatorIsStaff\s*\(/.test(js));
  ok('onExcepcionPagoCreada deriva adminEmails con usersByPerm', /usersByPerm\s*\(/.test(js));
  ok('onExcepcionPagoDecidida deriva supervisorEmail del creador', /createdByUid[\s\S]{0,400}\.email/.test(js) || js.indexOf('after.createdByUid') >= 0);

  // Wiring cliente
  ok('cliente: createdByUid en notifyByPerm', /collection\('notifyByPerm'\)\.add\(\{[\s\S]{0,400}createdByUid/.test(html));
  ok('cliente: createdByUid en excepcionesPago', /collection\('excepcionesPago'\)\.add\(\{[\s\S]{0,600}createdByUid/.test(html));

  console.log('PASS=' + pass + ' FAIL=' + fail);
  process.exit(fail ? 1 : 0);
})();
