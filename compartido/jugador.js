// Ruta: compartido/jugador.js
// Sesión con Google y puntos. Lo usan el portal y todos los juegos:
//   import { alCambiarSesion, entrar, salir, sumarPuntos, leerPerfil, mejores } from "../compartido/jugador.js";
import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, orderBy, limit, runTransaction, serverTimestamp, increment }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// fn(usuario) se llama al abrir la página y cada vez que entra o sale alguien (usuario = null si no hay sesión)
export function alCambiarSesion(fn) {
  if (!auth) { fn(null); return; }
  onAuthStateChanged(auth, fn);
}
export async function entrar() {
  if (!auth) throw new Error("Falta pegar la configuración de Firebase en compartido/firebase.js");
  const proveedor = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, proveedor);
  } catch (e) {
    if (e.code === "auth/popup-blocked") await signInWithRedirect(auth, proveedor); // celulares que bloquean ventanas
    else if (e.code !== "auth/popup-closed-by-user") throw e;
  }
}
export const salir = () => (auth ? signOut(auth) : Promise.resolve());

// Suma puntos al perfil (total de todos los juegos) y guarda tu mejor marca de ese juego
export async function sumarPuntos(juego, puntos) {
  const u = auth && auth.currentUser;
  if (!u || !(puntos > 0)) return false;
  const datos = { nombre: u.displayName || "Jugador", foto: u.photoURL || "", actualizado: serverTimestamp() };
  const perfil = doc(db, "perfiles", u.uid);
  const marca = doc(db, "juegos", juego, "jugadores", u.uid);
  await runTransaction(db, async (t) => {
    const previa = await t.get(marca);
    const mejor = Math.max(previa.exists() ? previa.data().mejor || 0 : 0, puntos);
    t.set(marca, { ...datos, mejor }, { merge: true });
    t.set(perfil, { ...datos, total: increment(puntos) }, { merge: true });
  });
  return true;
}
// Perfil del jugador con sesión: { nombre, foto, total } o null
export async function leerPerfil() {
  const u = auth && auth.currentUser;
  if (!u) return null;
  const s = await getDoc(doc(db, "perfiles", u.uid));
  return s.exists() ? s.data() : null;
}
// Mejores marcas de un juego: [{ nombre, foto, mejor }]
export async function mejores(juego, cuantos = 10) {
  if (!db) return [];
  const s = await getDocs(query(collection(db, "juegos", juego, "jugadores"), orderBy("mejor", "desc"), limit(cuantos)));
  return s.docs.map((d) => d.data());
}
