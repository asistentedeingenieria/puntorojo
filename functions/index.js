/* ════════════════════════════════════════════════════════════════
   PUNTO ROJO · CLOUD FUNCTIONS
   ────────────────────────────────────────────────────────────────
   Función única: cuando alguien recibe una notificación nueva en
   users/{uid}/notifications/{notifId}, leemos los tokens FCM
   registrados en users/{uid}/fcmTokens/* y disparamos el push.

   Si un token devuelve error "registration-token-not-registered",
   lo borramos (significa que el dispositivo desinstaló la app o
   limpió permisos).

   Despliegue:
     firebase deploy --only functions
   ════════════════════════════════════════════════════════════════ */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const Anthropic = require('@anthropic-ai/sdk');

// ─── SECRETOS PARA EMAIL VÍA GMAIL SMTP ───
// Configurar con:
//   firebase functions:secrets:set GMAIL_USER
//   firebase functions:secrets:set GMAIL_APP_PASSWORD
const GMAIL_USER = defineSecret('GMAIL_USER');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
// ─── SECRETO PARA EL ASISTENTE IA (#4) ───
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Default para todas las funciones
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10
});

initializeApp();

const TYPE_TITLES = {
  pago_excepcion_solicitud: 'EXCEPCIÓN DE PAGO SOLICITADA',
  pago_excepcion_decision: 'RESPUESTA DE EXCEPCIÓN',
  estimacion_lista: 'YA PODÉS PRESENTAR ESTIMACIÓN',
  oc_autorizada: 'ORDEN DE COMPRA AUTORIZADA',
  fecha_cambiada: 'FECHA CAMBIADA',
  info: 'PUNTO ROJO'
};

exports.onNotificationCreated = onDocumentCreated(
  {
    document: 'users/{uid}/notifications/{notifId}',
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const { uid, notifId } = event.params;
    const notif = snap.data();
    if (!notif) return;

    // Recolectar tokens FCM del destinatario
    const db = getFirestore();
    const tokensSnap = await db
      .collection('users').doc(uid)
      .collection('fcmTokens').get();

    if (tokensSnap.empty) {
      console.log(`Usuario ${uid} sin tokens FCM — sin push para notif ${notifId}`);
      return;
    }

    const fallbackTitle = TYPE_TITLES[notif.type] || TYPE_TITLES.info;
    const title = notif.title || fallbackTitle;
    const body  = notif.body  || '';

    // Enviamos UN MENSAJE POR CADA TOKEN individualmente (en vez de multicast).
    // Esto es exactamente lo que Firebase Console hace cuando funciona en iOS.
    // Formato del mensaje copiado directamente de "Test Message" de Firebase Console.
    let okCount = 0;
    let failCount = 0;
    const stale = [];

    for (const doc of tokensSnap.docs) {
      const tokenData = doc.data();
      const token = tokenData && tokenData.token;
      if (!token) continue;

      const platform = tokenData.platform || 'unknown';

      // Formato MÍNIMO compatible con iOS Safari + Chrome desktop + Android.
      // Sin `data` payload (algunos browsers iOS lo rechazan en silencio).
      // Sin `tag` (puede causar problemas en iOS).
      const message = {
        token,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: 'https://puntorojo.app/logo.png'
          },
          fcmOptions: {
            link: 'https://puntorojo.app/'
          }
        }
      };

      try {
        const msgId = await getMessaging().send(message);
        okCount++;
        console.log(`✓ Push OK [${platform}] msgId=${msgId} token=${token.slice(0, 20)}...`);
      } catch (err) {
        failCount++;
        const code = err && err.code;
        const errMsg = err && err.message;
        console.warn(`✗ Push FAIL [${platform}] code=${code} msg=${errMsg} token=${token.slice(0, 20)}...`);
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          stale.push(doc.ref);
        }
      }
    }

    console.log(`Push total: ${okCount} ok, ${failCount} fail. Notif ${notifId} → user ${uid}`);

    // Limpiar tokens muertos
    if (stale.length > 0) {
      const batch = db.batch();
      stale.forEach(ref => batch.delete(ref));
      try {
        await batch.commit();
        console.log(`Borrados ${stale.length} tokens muertos.`);
      } catch(e) { console.warn('No se pudieron borrar tokens muertos:', e.message); }
    }

    // Marcar la notif con el resultado
    try {
      await snap.ref.set({
        pushSentAt: FieldValue.serverTimestamp(),
        pushSuccessCount: okCount,
        pushFailureCount: failCount
      }, { merge: true });
    } catch(e) {}
  }
);

/* ════════════════════════════════════════════════════════════════
   onNotifyByPerm — FAN-OUT de notificaciones por PERMISO (push en tiempo real).
   ────────────────────────────────────────────────────────────────
   El cliente (incluso un usuario NO admin, que por reglas no puede leer la
   colección `users`) escribe en notifyByPerm/{id}:
     { toPerms:[...], toEmails:[...], title, body, projectId, type, excludeUid, createdAt }
   Esta función corre con admin SDK (sí puede leer `users`), encuentra a quienes
   tienen alguno de esos permisos (o '*') o cuyo email está en toEmails, y le
   escribe a cada uno un doc en users/{uid}/notifications/{autoId}. Eso dispara
   onNotificationCreated → push FCM (reusa todo el pipeline existente).
   Al terminar borra el doc de notifyByPerm (es efímero).

   Resuelve el problema histórico: el flujo de anticipos lo dispara un supervisor
   no-admin, que no puede leer `users` desde el cliente para saber a quién avisar.

   REGLAS firestore necesarias (las pone el user):
     match /notifyByPerm/{id} {
       allow create: if request.auth != null;   // cualquiera logueado puede pedir aviso
       allow read, update, delete: if false;     // solo el backend lo procesa/borra
     }
   ════════════════════════════════════════════════════════════════ */
exports.onNotifyByPerm = onDocumentCreated(
  { document: 'notifyByPerm/{id}', timeoutSeconds: 60, memory: '256MiB' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const req = snap.data() || {};
    const toPerms  = Array.isArray(req.toPerms)  ? req.toPerms.filter(x => typeof x === 'string') : [];
    const toEmails = Array.isArray(req.toEmails) ? req.toEmails.map(e => String(e || '').toLowerCase()).filter(Boolean) : [];
    const title = String(req.title || 'PUNTO ROJO').slice(0, 120);
    const body  = String(req.body  || '').slice(0, 300);
    const projectId = String(req.projectId || '');
    const type = String(req.type || 'info');
    const excludeUid = String(req.excludeUid || '');

    const db = getFirestore();

    if (!toPerms.length && !toEmails.length) {
      console.log('notifyByPerm sin destinatarios — borro.');
      try { await snap.ref.delete(); } catch (e) {}
      return;
    }

    const usersSnap = await db.collection('users').get();
    const targets = [];
    usersSnap.forEach(doc => {
      const u = doc.data() || {};
      const uid = doc.id;
      if (uid === excludeUid) return;
      const perms = Array.isArray(u.perms) ? u.perms : [];
      const email = String(u.email || '').toLowerCase();
      const permMatch  = perms.includes('*') || toPerms.some(p => perms.includes(p));
      const emailMatch = email && toEmails.includes(email);
      if (permMatch || emailMatch) targets.push(uid);
    });

    if (!targets.length) {
      console.log('notifyByPerm: ningún usuario coincide con', JSON.stringify(toPerms), JSON.stringify(toEmails));
      try { await snap.ref.delete(); } catch (e) {}
      return;
    }

    // Un doc de notificación por destinatario → dispara onNotificationCreated → push.
    const writes = targets.map(uid =>
      db.collection('users').doc(uid).collection('notifications').add({
        type, title, body, projectId,
        createdAt: FieldValue.serverTimestamp(),
        fanout: true
      }).catch(e => console.warn('notif write fail', uid, e && e.message))
    );
    await Promise.all(writes);
    console.log(`notifyByPerm → ${targets.length} usuario(s) notificados: "${title}"`);

    try { await snap.ref.delete(); } catch (e) {}
  }
);

/* ════════════════════════════════════════════════════════════════
   getReceptorAcuses — endpoint HTTP que devuelve los acuses firmados
   por un receptor identificado por (token, secret).

   Llamada (POST):
     fetch('https://us-central1-punto-rojo-3fcf1.cloudfunctions.net/getReceptorAcuses', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ token: 'PR-RECEP-...', secret: '...' })
     })

   Auth: el secret va en el body. Si el secret guardado en state.receptores
   coincide con el provisto, se devuelve la lista de acuses. Si no, 403.
   ════════════════════════════════════════════════════════════════ */
exports.getReceptorAcuses = onRequest(
  {
    cors: ['https://puntorojo.app', 'https://www.puntorojo.app', 'https://asistentedeingenieria.github.io', 'http://localhost', 'http://localhost:8080'],
    // El acceso público se setea MANUALMENTE en Cloud Run console:
    // https://console.cloud.google.com/run/detail/us-central1/getreceptoracuses/security?project=punto-rojo-3fcf1
    // Agregar principal "allUsers" con rol "Cloud Run Invoker".
    // (El intento de hacerlo desde firebase deploy con invoker:'public' falla
    // porque la cuenta corporativa no tiene roles/functions.admin.)
    timeoutSeconds: 20,
    memory: '256MiB'
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Solo POST' });
      return;
    }
    const body = req.body || {};
    const token  = String(body.token  || '').trim();
    const secret = String(body.secret || '').trim();
    if (!token || !secret) {
      res.status(400).json({ error: 'token y secret requeridos' });
      return;
    }

    try {
      const db = getFirestore();
      const stateDoc = await db.collection('appState').doc('main').get();
      if (!stateDoc.exists) {
        res.status(404).json({ error: 'Estado no encontrado' });
        return;
      }
      const state = stateDoc.data() || {};
      const receptores = Array.isArray(state.receptores) ? state.receptores : [];
      const receptor = receptores.find(r => r && r.token === token && r.secret === secret && !r.deleted);
      if (!receptor) {
        res.status(403).json({ error: 'Receptor no autorizado o link inválido' });
        return;
      }

      // Recolectar acuses firmados por este receptor en todos los proyectos.
      const ETAPAS = [
        'ESTRUCTURA',
        'PRIMERA CARA',
        'REFUERZOS DE MADERA',
        'FORRO DE SEGUNDA CARA',
        'CIELO Y FORRO',
        'MASILLA COMPLETA'
      ];

      const acuses = [];
      const projects = Array.isArray(state.projects) ? state.projects : [];
      for (const p of projects) {
        for (const t of (p.towers || [])) {
          for (const l of (t.levels || [])) {
            for (const a of (l.aptos || [])) {
              if (!a.acuseRecepciones) continue;
              for (const slotKey of Object.keys(a.acuseRecepciones)) {
                const ac = a.acuseRecepciones[slotKey];
                if (!ac) continue;
                // Coincidencia por receptorId (preferido) o por receptorToken (legacy)
                const isMine = (ac.receptorId === receptor.id) || (ac.receptorToken === receptor.token);
                if (!isMine) continue;
                const idxNum = parseInt(slotKey, 10);
                acuses.push({
                  proyecto: p.name || '',
                  torre: t.name || '',
                  nivel: l.name || '',
                  apto: a.name || '',
                  slotKey: String(slotKey),
                  etapaIdx: isNaN(idxNum) ? -1 : idxNum,
                  etapaNombre: (ETAPAS[idxNum] || ('ETAPA ' + (idxNum + 1))),
                  ts: ac.ts || 0,
                  supervisor: ac.userName || ac.user || ''
                });
              }
            }
          }
        }
      }

      // Ordenar por fecha descendente (más reciente primero).
      acuses.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));

      res.json({
        receptor: {
          nombre: receptor.nombre || '',
          cargo: receptor.cargo || ''
        },
        acuses,
        totalAcuses: acuses.length,
        generadoEn: Date.now()
      });
    } catch (e) {
      console.error('getReceptorAcuses error:', e && e.message);
      res.status(500).json({ error: 'Error interno: ' + (e.message || '') });
    }
  }
);

/* ════════════════════════════════════════════════════════════════
   EMAIL · NOTIFICACIONES DE EXCEPCIONES DE PAGO
   ────────────────────────────────────────────────────────────────
   El cliente escribe en `excepcionesPago/{id}` un doc con:
     {
       projectId, projectName,
       aptoNombre, torreNombre, nivelNombre, etapaNombre,
       obrero, monto, razon,
       supervisorEmail, supervisorNombre,
       adminEmails: [...],
       estado: 'pendiente' | 'aprobada' | 'rechazada',
       solicitadoEn, decididoEn, decididoPor, notaDecision
     }
   - Al crearse → email a TODOS los adminEmails con la solicitud.
   - Al cambiar estado a aprobada/rechazada → email al supervisorEmail.

   Configurar credenciales (UNA SOLA VEZ):
     firebase functions:secrets:set GMAIL_USER       (ej: puntorojo.notif@gmail.com)
     firebase functions:secrets:set GMAIL_APP_PASSWORD (la app password de 16 chars)
     firebase deploy --only functions
   ════════════════════════════════════════════════════════════════ */

function buildTransport(user, pass){
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
}

function fmtMoneda(v){
  const n = Number(v) || 0;
  return 'Q ' + n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaGT(ts){
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('es-GT', { dateStyle:'long', timeStyle:'short' }); }
  catch(e){ return new Date(ts).toString(); }
}

function emailLayout(title, body){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#222;background:#f5f1e8;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #d8cfb9;border-radius:6px;overflow:hidden">
    <div style="background:#C8141C;color:#fff;padding:20px 24px">
      <div style="font-size:11px;letter-spacing:3px;font-weight:700;opacity:.85">PUNTO ROJO · S.A.</div>
      <div style="font-size:18px;font-weight:700;margin-top:6px">${title}</div>
    </div>
    <div style="padding:22px 24px;font-size:14px;line-height:1.6;color:#333">
      ${body}
    </div>
    <div style="background:#f5f1e8;padding:14px 24px;font-size:11px;color:#888;border-top:1px solid #d8cfb9">
      Este email fue enviado automáticamente por la app Punto Rojo. No respondas — entrá a la app para tomar acción.
      <br><a href="https://puntorojo.app" style="color:#C8141C;text-decoration:none;font-weight:700">→ ABRIR PUNTO ROJO</a>
    </div>
  </div>
</body></html>`;
}

// ── Trigger: NUEVA solicitud de excepción → email a admins ──
exports.onExcepcionPagoCreada = onDocumentCreated(
  {
    document: 'excepcionesPago/{excId}',
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const exc = snap.data();
    if (!exc || exc.estado !== 'pendiente') {
      console.log('Excepción no pendiente, no envío email.');
      return;
    }

    const user = GMAIL_USER.value();
    const pass = GMAIL_APP_PASSWORD.value();
    if (!user || !pass) {
      console.warn('GMAIL_USER o GMAIL_APP_PASSWORD no configurados — skipping email.');
      return;
    }

    const adminEmails = Array.isArray(exc.adminEmails) ? exc.adminEmails.filter(x => x && typeof x === 'string') : [];
    if (adminEmails.length === 0) {
      console.warn(`Excepción ${event.params.excId} sin adminEmails — no hay a quién avisar.`);
      return;
    }

    const transporter = buildTransport(user, pass);
    const subject = `[Punto Rojo] Solicitud de pago sin acuse — ${exc.aptoNombre || ''} · ${exc.etapaNombre || ''}`;

    const body = `
      <p><strong>${exc.supervisorNombre || exc.supervisorEmail || 'Un supervisor'}</strong> solicita aprobación para pagar una etapa que <strong style="color:#C8141C">no tiene acuse firmado por el cliente</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700;width:160px">Proyecto:</td><td style="padding:6px 10px">${exc.projectName || '—'}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Ubicación:</td><td style="padding:6px 10px">${exc.torreNombre || ''} · ${exc.nivelNombre || ''} · <strong>${exc.aptoNombre || ''}</strong></td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Etapa:</td><td style="padding:6px 10px">${exc.etapaNombre || '—'}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Obrero:</td><td style="padding:6px 10px"><strong>${exc.obrero || '—'}</strong></td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Monto bruto:</td><td style="padding:6px 10px;font-weight:700;color:#C8141C">${fmtMoneda(exc.monto)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Solicitada:</td><td style="padding:6px 10px">${fechaGT(exc.solicitadoEn)}</td></tr>
      </table>

      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 14px;margin:14px 0;border-radius:3px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#92400E;margin-bottom:6px">MOTIVO DEL SUPERVISOR</div>
        <div style="color:#222;font-style:italic">"${(exc.razon || '').replace(/</g,'&lt;')}"</div>
      </div>

      <p>Para aprobar o rechazar, entrá a la app y andá a <strong>Planillas → Excepciones</strong>.</p>
    `;

    const html = emailLayout('Solicitud de pago sin acuse', body);

    const promises = adminEmails.map(adminEmail =>
      transporter.sendMail({
        from: `"Punto Rojo" <${user}>`,
        to: adminEmail,
        subject,
        html
      }).then(() => {
        console.log(`Email solicitud excepción → ${adminEmail} OK`);
      }).catch(err => {
        console.error(`Email solicitud excepción → ${adminEmail} FALLÓ:`, err.message);
      })
    );
    await Promise.all(promises);

    // Marcar el doc como notificado para tener trace
    try {
      await snap.ref.set({
        emailSolicitudEnviadoEn: FieldValue.serverTimestamp(),
        emailSolicitudDestinatarios: adminEmails
      }, { merge: true });
    } catch(e) { /* ignore */ }
  }
);

// ── Trigger: solicitud APROBADA o RECHAZADA → email al supervisor ──
exports.onExcepcionPagoDecidida = onDocumentUpdated(
  {
    document: 'excepcionesPago/{excId}',
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD],
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (event) => {
    const before = event.data && event.data.before && event.data.before.data();
    const after = event.data && event.data.after && event.data.after.data();
    if (!before || !after) return;

    // Solo notificar si pasó de pendiente a aprobada/rechazada
    const prevEstado = before.estado;
    const newEstado = after.estado;
    if (prevEstado === newEstado) return;
    if (newEstado !== 'aprobada' && newEstado !== 'rechazada') return;
    if (prevEstado !== 'pendiente') return;

    const user = GMAIL_USER.value();
    const pass = GMAIL_APP_PASSWORD.value();
    if (!user || !pass) {
      console.warn('GMAIL_USER o GMAIL_APP_PASSWORD no configurados — skipping email.');
      return;
    }

    const supervisorEmail = after.supervisorEmail;
    if (!supervisorEmail) {
      console.warn(`Excepción ${event.params.excId} sin supervisorEmail`);
      return;
    }

    const transporter = buildTransport(user, pass);
    const aprobada = (newEstado === 'aprobada');
    const subject = aprobada
      ? `[Punto Rojo] Excepción APROBADA — ${after.aptoNombre || ''} · ${after.etapaNombre || ''}`
      : `[Punto Rojo] Excepción RECHAZADA — ${after.aptoNombre || ''} · ${after.etapaNombre || ''}`;

    const colorBanner = aprobada ? '#16A34A' : '#C8141C';
    const tituloBanner = aprobada ? 'EXCEPCIÓN APROBADA' : 'EXCEPCIÓN RECHAZADA';
    const accionTxt = aprobada
      ? `<p style="color:#16A34A;font-weight:700">Ya podés generar el pago en la app. Recordá que el cliente todavía debe firmar el acuse después.</p>`
      : `<p style="color:#C8141C;font-weight:700">No vas a poder pagar esta etapa hasta que el cliente firme el acuse de recepción.</p>`;

    const notaTxt = (after.notaDecision && after.notaDecision.trim())
      ? `<div style="background:#fff;border:1px solid #ddd;padding:10px 14px;margin:12px 0;border-radius:3px"><div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#666;margin-bottom:6px">NOTA DEL ADMINISTRADOR</div><div>${after.notaDecision.replace(/</g,'&lt;')}</div></div>`
      : '';

    const body = `
      <div style="background:${colorBanner};color:#fff;padding:14px 16px;border-radius:4px;text-align:center;font-weight:700;font-size:14px;letter-spacing:2px;margin-bottom:16px">${tituloBanner}</div>

      <p>El administrador <strong>${after.decididoPorNombre || after.decididoPor || 'Admin'}</strong> respondió tu solicitud:</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700;width:160px">Apartamento:</td><td style="padding:6px 10px"><strong>${after.aptoNombre || '—'}</strong></td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Etapa:</td><td style="padding:6px 10px">${after.etapaNombre || '—'}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Obrero:</td><td style="padding:6px 10px">${after.obrero || '—'}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Monto:</td><td style="padding:6px 10px;font-weight:700">${fmtMoneda(after.monto)}</td></tr>
        <tr><td style="padding:6px 10px;background:#f5f1e8;font-weight:700">Decidida:</td><td style="padding:6px 10px">${fechaGT(after.decididoEn)}</td></tr>
      </table>

      ${notaTxt}
      ${accionTxt}
    `;

    const html = emailLayout(tituloBanner, body);

    try {
      await transporter.sendMail({
        from: `"Punto Rojo" <${user}>`,
        to: supervisorEmail,
        subject,
        html
      });
      console.log(`Email decisión excepción → ${supervisorEmail} OK`);
      await event.data.after.ref.set({
        emailDecisionEnviadoEn: FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(`Email decisión excepción → ${supervisorEmail} FALLÓ:`, err.message);
    }
  }
);

/* ════════════════════════════════════════════════════════════════
   onAiQuestion — asistente IA "Preguntá a Punto Rojo" (#4, v806).
   ────────────────────────────────────────────────────────────────
   Disparada por FIRESTORE (NO es un endpoint público) — así esquiva la política de
   organización "Domain restricted sharing" que prohíbe funciones públicas (allUsers).
   El cliente escribe en aiQuestions/{id}: { pregunta, contexto, uid, createdAt }.
   Esta función (admin SDK) llama a Anthropic (Claude Haiku) con un system prompt
   estricto y ESCRIBE la respuesta de vuelta en el MISMO doc (campo respuesta o error);
   el cliente la escucha por onSnapshot. El contexto ya viene FILTRADO por permiso desde
   el cliente (_aiBuildContext). API key = secreto ANTHROPIC_API_KEY (nunca en el cliente).

   REGLAS firestore necesarias (las pone el user):
     match /aiQuestions/{id} {
       allow create: if request.auth != null;
       allow read:   if request.auth != null && resource.data.uid == request.auth.uid;
       allow update, delete: if false;
     }
   ════════════════════════════════════════════════════════════════ */
// v807b: bump para forzar redeploy y re-amarrar el secreto a su versión más nueva (rotación de la API key).
exports.onAiQuestion = onDocumentCreated(
  { document: 'aiQuestions/{id}', secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (event) => {
    const snap = event.data; if (!snap) return;
    const q = snap.data() || {};
    if (q.respuesta || q.error) return; // ya respondida (evita reproceso)
    const pregunta = String(q.pregunta || '').slice(0, 2000).trim();
    const contexto = q.contexto || {};
    const responder = (obj) => snap.ref.set(Object.assign({ answeredAt: FieldValue.serverTimestamp() }, obj), { merge: true }).catch(e => console.warn('ai write fail', e && e.message));

    if (!pregunta) { await responder({ error: 'Escribí una pregunta.' }); return; }

    const key = ANTHROPIC_API_KEY.value();
    if (!key) { await responder({ error: 'El asistente todavía no está configurado.' }); return; }

    const sys = [
      'Sos el asistente de la app Punto Rojo (gestión de obra de drywall en Guatemala).',
      'Respondé SOLO con los datos que están en el CONTEXTO (JSON del proyecto activo, ya filtrado por el permiso del usuario).',
      'Si el dato no está en el contexto, decí claramente que no lo tenés — puede ser por permiso o porque no es del proyecto activo. NO inventes.',
      'Los montos están en quetzales (Q). Respondé en español, breve y directo, sin markdown pesado.'
    ].join(' ');

    let ctxStr = '{}';
    try { ctxStr = JSON.stringify(contexto).slice(0, 200000); } catch (e) {}

    try {
      const client = new Anthropic({ apiKey: key });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        system: sys,
        messages: [{
          role: 'user',
          content: 'CONTEXTO (datos del proyecto activo, filtrados por permiso):\n' + ctxStr + '\n\nPREGUNTA DEL USUARIO: ' + pregunta
        }]
      });
      let respuesta = '';
      try { respuesta = (msg && Array.isArray(msg.content)) ? msg.content.map(b => (b && b.type === 'text') ? b.text : '').join('').trim() : ''; } catch (e) {}
      if (!respuesta) respuesta = 'No pude armar una respuesta. Probá reformular la pregunta.';
      await responder({ respuesta });
    } catch (e) {
      console.error('onAiQuestion error:', e && (e.status || ''), e && e.message);
      var _diag = e ? (e.status ? (' [' + e.status + ']') : (e.message ? (' [' + String(e.message).slice(0, 90) + ']') : '')) : '';
      await responder({ error: 'No pude responder ahora, probá de nuevo.' + _diag });
    }
  }
);
