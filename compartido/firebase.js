// Ruta: compartido/firebase.js
// Inicia Firebase una sola vez para todos los juegos.
// Estos valores no son secretos: la seguridad real está en firestore-unificado.rules y en los dominios autorizados.
// Activa en Firebase: Authentication → Google, y Firestore Database.
// Nota: la página no usa npm ni empaquetador, por eso se importa desde gstatic con URL completa
// (un «import ... from "firebase/app"» solo funciona con un empaquetador y aquí no cargaría).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA80l29AWAR3x1NCDoRPyhtM6c0JOYqoAA",
  authDomain: "elpolodancer.firebaseapp.com",
  databaseURL: "https://elpolodancer-default-rtdb.firebaseio.com",
  projectId: "elpolodancer",
  storageBucket: "elpolodancer.firebasestorage.app",
  messagingSenderId: "397139900415",
  appId: "1:397139900415:web:66cc4a2be62a055063d9ca",
  measurementId: "G-MD5YZQTVP1",
};

// Mientras no pegues tu configuración, los juegos funcionan pero sin sesión ni puntos
export const configurado = !FIREBASE_CONFIG.apiKey.startsWith("PEGA");
export const app = configurado ? initializeApp(FIREBASE_CONFIG) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// Analytics: se carga aparte y solo con internet. Si falla (sin conexión, bloqueador de anuncios, cookies
// desactivadas, navegador no compatible) no pasa nada: los juegos, la sesión y el progreso siguen igual.
export let analytics = null;
if (app && navigator.onLine !== false) {
  import("https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js")
    .then(async (m) => { if (await m.isSupported()) analytics = m.getAnalytics(app); })
    .catch(() => {});
}
