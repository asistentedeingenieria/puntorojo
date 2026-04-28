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

    const tokens = [];
    const tokenDocsByToken = {};
    tokensSnap.forEach(d => {
      const data = d.data();
      if (data && data.token) {
        tokens.push(data.token);
        tokenDocsByToken[data.token] = d.ref;
      }
    });

    if (tokens.length === 0) return;

    const fallbackTitle = TYPE_TITLES[notif.type] || TYPE_TITLES.info;
    const title = notif.title || fallbackTitle;
    const body  = notif.body  || '';

    // Datos auxiliares para el click handler
    const data = {
      type: notif.type || 'info',
      notifId: notifId,
      ...(notif.refPedidoId   ? { refPedidoId: String(notif.refPedidoId) } : {}),
      ...(notif.refOcId       ? { refOcId: String(notif.refOcId) } : {}),
      ...(notif.projectId     ? { projectId: String(notif.projectId) } : {}),
      click_url: 'https://puntorojo.app/'
    };

    // sendEachForMulticast permite mandar a hasta 500 tokens en una sola llamada
    const message = {
      tokens,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          icon: 'https://puntorojo.app/logo.png',
          badge: 'https://puntorojo.app/logo.png',
          tag: notifId
        },
        fcmOptions: {
          link: 'https://puntorojo.app/'
        }
      }
    };

    try {
      const resp = await getMessaging().sendEachForMulticast(message);
      console.log(`Push enviado: ${resp.successCount} ok, ${resp.failureCount} fail. Notif ${notifId} → user ${uid}`);

      // Limpiar tokens muertos
      const stale = [];
      resp.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            stale.push(tokens[i]);
          } else {
            console.warn('Push falló por otra razón:', code, r.error && r.error.message);
          }
        }
      });
      if (stale.length > 0) {
        const batch = db.batch();
        stale.forEach(tok => {
          const ref = tokenDocsByToken[tok];
          if (ref) batch.delete(ref);
        });
        await batch.commit();
        console.log(`Borrados ${stale.length} tokens muertos.`);
      }

      // Marcar la notif con el resultado del envío (para auditar)
      try {
        await snap.ref.set({
          pushSentAt: FieldValue.serverTimestamp(),
          pushSuccessCount: resp.successCount,
          pushFailureCount: resp.failureCount
        }, { merge: true });
      } catch(e) {
        // best-effort
      }
    } catch(e) {
      console.error('Error mandando push:', e && e.message);
    }
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
