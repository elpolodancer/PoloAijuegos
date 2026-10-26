// Ruta: compartido/firebase.js
// Inicia Firebase una sola vez para todos los juegos.
// Pega aquí la configuración web de tu proyecto (Consola de Firebase → Configuración del proyecto → Tus apps → SDK).
// Estos valores no son secretos: la seguridad real está en firestore.rules y en los dominios autorizados.
// Activa en Firebase: Authentication → Google, y Firestore Database.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA80l29AWAR3x1NCDoRPyhtM6c0JOYqoAA",
  authDomain: "elpolodancer.firebaseapp.com",
  projectId: "elpolodancer",
  storageBucket: "elpolodancer.firebasestorage.app",
  messagingSenderId: "397139900415",
  appId: "1:397139900415:web:65046c5fc273eb9963d9ca",
};

// Mientras no pegues tu configuración, los juegos funcionan pero sin sesión ni puntos
export const configurado = !FIREBASE_CONFIG.apiKey.startsWith("PEGA");
export const app = configurado ? initializeApp(FIREBASE_CONFIG) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
