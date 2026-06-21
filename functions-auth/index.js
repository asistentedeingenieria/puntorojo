const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * BORRAR CUENTA DE AUTH AL BORRAR EL USUARIO
 * Al borrar el documento users/{uid} desde la app (GESTIÓN DE USUARIOS),
 * borra TAMBIÉN la cuenta de Firebase Authentication de ese usuario, y limpia
 * sus subcolecciones huérfanas (notificaciones, tokens FCM). Automático.
 */
exports.deleteAuthOnUserDoc = functions.firestore
  .document('users/{uid}')
  .onDelete(async (snap, context) => {
    const uid = context.params.uid;
    try {
      await admin.auth().deleteUser(uid);
      console.log('Cuenta de Auth eliminada:', uid);
    } catch (e) {
      console.warn('No se pudo borrar la cuenta de Auth de', uid, '-', e.message);
    }
    try {
      await admin.firestore().recursiveDelete(
        admin.firestore().collection('users').doc(uid)
      );
    } catch (e) {
      console.warn('No se pudieron limpiar subcolecciones de', uid, '-', e.message);
    }
  });

/*
 * NOTA (v629): el PUSH al celular cuando se crea una notificación YA lo hace la
 * función existente `onNotificationCreated` (gen2 / nodejs22) que vive en OTRA
 * base de código del mismo proyecto. Por eso NO se incluye aquí una función de
 * push: una segunda haría llegar notificaciones DOBLES (se desplegó y se borró
 * `sendPushOnNotification` el 2026-06-12 al detectar el duplicado). Si "no llegan"
 * los push, casi siempre es porque el usuario no registró su token FCM (no aceptó
 * notificaciones, o en iPhone la PWA no está "Agregada a inicio"), no la función.
 */
