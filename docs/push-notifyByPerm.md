# Push en tiempo real por permiso (notifyByPerm) — v800

**Qué hace:** cuando alguien hace una solicitud de anticipo (o sube la cotización, o
el gerente autoriza/rechaza), le llega una **notificación push al instante** a todos
los usuarios que tengan el permiso de esa pestaña — aunque quien la dispara sea un
supervisor que no es admin.

## Cómo funciona (para entenderlo)

1. La app (cliente) escribe un doc en la colección `notifyByPerm` con
   `{ toPerms, toEmails, title, body, projectId, excludeUid }`.
2. La Cloud Function **`onNotifyByPerm`** (corre con permisos de admin, sí puede leer
   `users`) busca a todos los usuarios que tengan alguno de esos permisos (o `*`), o
   cuyo email esté en `toEmails`, y le escribe a cada uno una notificación.
3. Eso dispara la función de push que ya existía (`onNotificationCreated`) → llega el
   push al celular.
4. El doc `notifyByPerm` se borra solo (es de un solo uso).

> Reusa todo el pipeline de push existente. No toca la campanita (esa sigue igual).

## Lo que tenés que hacer vos (una sola vez)

### 1. Regla de Firestore para `notifyByPerm`

En **Firebase Console → Firestore → Reglas**, agregá este bloque dentro de
`match /databases/{database}/documents { ... }`:

```
match /notifyByPerm/{id} {
  allow create: if request.auth != null;   // cualquiera logueado puede pedir un aviso
  allow read, update, delete: if false;      // solo el backend lo procesa y lo borra
}
```

Publicá las reglas.

### 2. Desplegar la Cloud Function

Desde la carpeta del repo:

```
firebase deploy --only functions
```

(No necesita ninguna API key ni secreto nuevo para el push.)

## Cómo verificar que funciona

1. Entrá con un usuario que tenga el permiso **anticipos.cotizar** (compras) en un
   celular, y dejá la app instalada con notificaciones permitidas.
2. Con OTRO usuario (un supervisor) hacé una **nueva solicitud de anticipo**.
3. Al primer celular le tiene que llegar el push "NUEVA SOLICITUD DE ANTICIPO".
4. Si no llega: revisá en **Cloud Functions → Logs** la función `onNotifyByPerm`
   (debe decir "→ N usuario(s) notificados"). Si dice "ningún usuario coincide",
   revisá que el destinatario tenga el permiso y un token FCM registrado (que haya
   aceptado notificaciones en ese dispositivo).

## Notas

- El push reutiliza `onNotificationCreated`, que ya limpia tokens muertos.
- `_pushByPerm` (cliente) es **genérico**: a futuro sirve para cualquier "avisá en
  tiempo real a los que tengan X permiso", no solo anticipos.
- iOS: el push web requiere que la PWA esté **instalada** (agregada a inicio) y con
  notificaciones aceptadas, igual que el resto de los push de la app.
