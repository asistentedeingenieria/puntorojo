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

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

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
