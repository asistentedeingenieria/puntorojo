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
