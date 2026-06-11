# Usuarios por teléfono + login por SMS + push real — Diseño

**Fecha:** 2026-06-10
**Proyecto:** PUNTO ROJO (PWA, `puntorojo.app`) · Firebase project `punto-rojo-3fcf1`
**Estado:** Diseño aprobado. Fase 1 = config de Firebase (del usuario) + mensajes de error (ya en el código). Fase 2 = Cloud Function de push (pendiente).

## Objetivo
Crear usuarios solo con su **número de teléfono**, que entren a la app con **SMS** (sin email/clave), y que reciban **notificaciones push reales** en el celular (incluso con la app cerrada).

## Lo que YA existe en la app (confirmado en exploración)
- **Crear usuario por teléfono (admin):** modal USUARIOS, pestaña "TELÉFONO + SMS" → pre-registro en Firestore `pendingPhoneUsers/{telSin+}` con `{phoneNumber, displayName, cargo, perms, ...}`.
- **Login por SMS:** `doLoginPhoneSendCode` → `firebase.auth().signInWithPhoneNumber(phone, recaptchaVerifier)`; `doLoginPhoneVerifyCode` → `confirm(code)`. reCAPTCHA invisible incluido.
- **Claim en el 1er login:** `_claimPendingPhoneUser` migra `pendingPhoneUsers/{id}` → `users/{uid}` con los permisos asignados. `applyAuthSession` carga `perms`.
- **Mensajes de error traducidos:** `traducirErrorPhoneAuth` mapea los códigos de Firebase (incluye `auth/operation-not-allowed` → "PHONE AUTH NO ESTÁ HABILITADO EN FIREBASE", `auth/quota-exceeded`, `auth/invalid-phone-number`, etc.). **Ya correcto** — no requiere cambios.
- **Notificaciones in-app (campanita):** `users/{uid}/notifications` + `subscribeToMyNotifications` (onSnapshot). Funciona para usuarios de teléfono (no requiere email).
- **Registro de token FCM:** `ensureFCMRegistered` guarda el token en `users/{uid}/fcmTokens/{tokenId}` (con VAPID key + service worker `firebase-messaging-sw.js`). Handler `onMessage` en foreground.

## Causa de "no se puede" hoy
**Phone Auth no está habilitado en la consola de Firebase** (o falta el dominio autorizado / facturación de SMS). El código está completo; falta la config. Al fallar, la pantalla de login ya muestra el motivo exacto (vía `traducirErrorPhoneAuth`).

## Fase 1 — Desbloquear login por SMS (config del usuario)
Acciones en console.firebase.google.com → proyecto `punto-rojo-3fcf1`:
1. **Authentication → Sign-in method → Phone → Habilitar.**
2. **Authentication → Settings → Authorized domains** → agregar `puntorojo.app` (y el dominio de Cloudflare Pages si aplica).
3. **Plan Blaze** (Billing) para enviar SMS reales a producción (cuota gratis chica para pruebas).
4. *Prueba sin costo:* Phone → "Phone numbers for testing" → número + código fijo.

**Código:** sin cambios (los mensajes de error ya cubren todos los casos). Criterio de éxito: un usuario pre-registrado entra con su teléfono + SMS y queda con sus permisos.

## Fase 2 — Push real al celular (Cloud Function + app)
### Backend (nuevo) — Firebase Cloud Functions
- Carpeta `functions/` (Node 18+), `firebase.json`, `package.json` con `firebase-admin` + `firebase-functions`.
- Función **`sendPushOnNotification`** (trigger Firestore `onCreate` en `users/{uid}/notifications/{notifId}`):
  1. Lee el doc de notificación (`title`, `body`, `type`, refs).
  2. Lee `users/{uid}/fcmTokens/*` (todos los tokens del usuario).
  3. Envía vía `admin.messaging().sendEachForMulticast({tokens, notification:{title,body}, data:{...}})`.
  4. Limpia tokens inválidos (`messaging/registration-token-not-registered`) borrando ese doc.
- Deploy (del usuario, una vez): `npm i -g firebase-tools` → `firebase login` → `firebase init functions` (o usar la carpeta provista) → `firebase deploy --only functions`. **Requiere Blaze.**

### App (cambios)
- **Registrar token FCM para usuarios de teléfono:** asegurar que `ensureFCMRegistered()` corra tras el login por SMS (pedir permiso de notificaciones + guardar token). Hoy depende de `currentUser` — confirmar que se invoca para usuarios de teléfono.
- **Ruteo de notificaciones a teléfonos:** `_notifyByPerm`/`addNotification` apuntan por email; agregar resolución por usuario (uid) que incluya usuarios de teléfono (sin email). Helper `_notifyByPhoneNumber(tel, payload)` y/o que `_notifyByPerm` recorra TODOS los `users` con el permiso (email o teléfono).
- **iOS:** push web requiere que el usuario "Agregue a pantalla de inicio" (PWA instalada) para recibir notificaciones; documentarlo.

## Modelo de datos (sin cambios mayores)
- `pendingPhoneUsers/{telSin+}` → pre-registro.
- `users/{uid}` → `{phoneNumber, username:tel, displayName, cargo, perms, ...}`.
- `users/{uid}/notifications/{id}` → notificación (dispara la Cloud Function).
- `users/{uid}/fcmTokens/{tokenId}` → `{token, platform, updatedAt}`.

## Errores / casos borde
- Phone auth deshabilitado → la pantalla ya avisa (Fase 1).
- Sin permiso de notificaciones → no hay token → no llega push (cae a campanita in-app).
- iOS sin PWA instalada → no hay push web.
- Token vencido → la Cloud Function lo limpia.

## Criterios de éxito
1. Un usuario pre-registrado por teléfono entra con SMS y opera con sus permisos.
2. Al generarse una notificación para él, le llega **push al celular** (app cerrada) + aparece en la campanita.
3. Tokens inválidos se limpian solos.

## Fuera de alcance (futuro)
- SMS/WhatsApp externos (Twilio) como canal aparte.
- Plantillas de notificación / preferencias por usuario.
