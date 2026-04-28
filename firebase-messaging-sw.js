/* ════════════════════════════════════════════════════════════════
   PUNTO ROJO · FIREBASE MESSAGING SERVICE WORKER
   Este SW vive APARTE del sw.js principal (cache offline) y solo se
   encarga de recibir push notifications cuando la app está cerrada.
   Firebase lo busca específicamente en /firebase-messaging-sw.js.
   ════════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// MISMA config que el cliente — son keys públicas.
firebase.initializeApp({
  apiKey: "AIzaSyCbfWmw9kAFG73tv94H2Dg-uqHwu6vFaAE",
  authDomain: "punto-rojo-3fcf1.firebaseapp.com",
  projectId: "punto-rojo-3fcf1",
  storageBucket: "punto-rojo-3fcf1.firebasestorage.app",
  messagingSenderId: "1030321339912",
  appId: "1:1030321339912:web:38259c3135c9a2700a5bbd"
});

const messaging = firebase.messaging();

/* Cuando llega un push y la app está EN BACKGROUND (cerrada o tab inactiva),
   Firebase ya muestra automáticamente la notif si el payload tiene `notification`.
   Si quisiéramos custom UI, lo haríamos acá con messaging.onBackgroundMessage().

   Lo dejamos para personalizar el ícono y la acción al click. */
messaging.onBackgroundMessage((payload) => {
  try {
    const title = (payload.notification && payload.notification.title)
                || (payload.data && payload.data.title)
                || 'PUNTO ROJO';
    const body  = (payload.notification && payload.notification.body)
                || (payload.data && payload.data.body)
                || '';
    const data = payload.data || {};
    const url = data.click_url || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.notifId || ('pr-bg-' + Date.now()),
      renotify: false,
      data: { url, ...data }
    });
  } catch(e) {
    // best-effort
  }
});

/* Click en la notif → abre/foca la app y, si trae click_url, navega ahí. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Si ya hay una ventana abierta con la app, foco y navega
      for (const w of wins) {
        try {
          if (w.url.includes(self.location.host)) {
            w.focus();
            if (targetUrl && targetUrl !== '/') {
              w.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        } catch(e) {}
      }
      // Si no, abrir nueva
      return clients.openWindow(targetUrl);
    })
  );
});
