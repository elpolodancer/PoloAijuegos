// Ruta: compartido/progreso.js
// Progreso "local primero": el juego guarda SIEMPRE en el dispositivo (localStorage) y este módulo lo sincroniza
// con la cuenta de Google cuando hay internet y sesión. Sin internet no pasa nada: se sincroniza más tarde.
//
// 1) Puntos pendientes:   encolarPuntos() (compartido/cola-puntos.js) los anota; aquí se envían (vaciarPuntos).
//    Se vacía solo al iniciar sesión, al volver la conexión y al abrir cualquier página que cargue este módulo.
// 2) Progreso del juego:  conectar(juego, { clave, fusionar, alCambiar }) → { guardado() }
//      clave      la clave de localStorage donde el juego YA guarda su progreso (JSON)
//      fusionar   (local, remoto) => unido    une los dos progresos; cualquiera puede ser null
//      alCambiar  (unido) => {}               el juego recarga su estado cuando la nube trajo algo nuevo
//      guardado() se llama después de cada guardado local (sube a la nube a los 3 s, sin saturar)
//    Se guarda en Firestore en  progreso/{uid}/juegos/{juego}  { datos: "<el JSON como texto>", actualizado }.
//
// Siempre se importa con try/catch y import() dinámico, para que el juego funcione aunque el SDK de Firebase no
// esté disponible (primera vez sin internet):
//   import("../compartido/progreso.js").then((m) => { nube = m.conectar(...); }).catch(() => {});
import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { alCambiarSesion, sumarPuntos } from "./jugador.js";
import { leerCola, guardarCola } from "./cola-puntos.js";

const ESPERA_MS = 15000;     // si la red está "viva pero lenta", no dejar la sincronización colgada
const SUBIDA_MS = 3000;      // tras guardar localmente, espera esto antes de subir (junta guardados seguidos)
const conRed = () => navigator.onLine !== false;
const limite = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("lento")), ESPERA_MS))]);
// Evita que dos pestañas hagan lo mismo a la vez (si el navegador no tiene Web Locks, se ejecuta sin candado)
const bloqueo = (nombre, fn) => (navigator.locks ? navigator.locks.request(nombre, fn) : fn());

// ----- Puntos pendientes -----
// Errores con los que el servidor RECHAZA el envío (no es falta de internet): reintentar igual no lo arregla.
// Ese evento pasa al final de la cola para que no bloquee a los demás y se descarta tras MAX_INTENTOS vaciados.
// (Sin internet o sin sesión el evento NO se toca: se queda esperando.)
const RECHAZOS = ["permission-denied", "invalid-argument", "out-of-range"];
const MAX_INTENTOS = 20;
let vaciando = null;
export function vaciarPuntos() {
  if (!vaciando) {
    vaciando = bloqueo("puntos-pendientes", async () => {
      if (!auth || !auth.currentUser || !conRed()) return leerCola().length;
      let saltados = 0; // rechazados seguidos: si ya se probaron todos, se termina
      for (;;) {
        const cola = leerCola();
        if (!cola.length) return 0;
        if (saltados >= cola.length) return cola.length;
        let ok = false, rechazado = false;
        try { ok = await sumarPuntos(cola[0].j, cola[0].p); }
        catch (e) { rechazado = RECHAZOS.includes(e.code); console.warn("puntos pendientes:", e.code || e.message); }
        const r = leerCola(), primero = r.shift();
        if (ok) { guardarCola(r); saltados = 0; continue; }
        if (!rechazado) return leerCola().length; // sin sesión o sin conexión: se queda en la cola
        primero.x = (primero.x || 0) + 1;
        if (primero.x < MAX_INTENTOS) r.push(primero);
        else console.warn("puntos pendientes: se descartó un envío rechazado", primero.j, primero.p);
        guardarCola(r); saltados++;
      }
    }).finally(() => { vaciando = null; });
  }
  return vaciando; // promesa: cuántos envíos siguen pendientes (0 = todo enviado)
}
alCambiarSesion((u) => { if (u) vaciarPuntos(); });
addEventListener("online", () => vaciarPuntos());

// ----- Progreso del juego -----
export function conectar(juego, { clave, fusionar, alCambiar }) {
  let t = 0;
  const leerLocal = () => { try { const s = localStorage.getItem(clave); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const escribirLocal = (v) => { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (e) {} };

  // Baja lo de la nube, lo une con lo local y sube el resultado si cambió. Es seguro repetirla las veces que sea.
  function sincronizar() {
    const u = auth && auth.currentUser;
    if (!u || !db || !conRed()) return Promise.resolve(false);
    return bloqueo("sync-" + juego, async () => {
      try {
        const ref = doc(db, "progreso", u.uid, "juegos", juego);
        const s = await limite(getDoc(ref));
        const textoRemoto = s.exists() ? s.data().datos : null;
        const remoto = textoRemoto ? JSON.parse(textoRemoto) : null;
        const local = leerLocal(); // se lee DESPUÉS de esperar la red, para no pisar lo que se jugó mientras tanto
        const unido = fusionar(local, remoto);
        if (unido == null) return true;
        const texto = JSON.stringify(unido);
        if (texto !== JSON.stringify(local)) { escribirLocal(unido); if (alCambiar) alCambiar(unido); }
        if (texto !== textoRemoto) await limite(setDoc(ref, { datos: texto, actualizado: serverTimestamp() }));
        return true;
      } catch (e) {
        console.warn("progreso (" + juego + "):", e.code || e.message);
        return false;
      }
    });
  }

  alCambiarSesion((u) => { if (u) sincronizar(); });
  addEventListener("online", sincronizar);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sincronizar(); });

  return {
    guardado() { clearTimeout(t); t = setTimeout(sincronizar, SUBIDA_MS); },
    sincronizar,
  };
}

// ----- Funciones para unir progresos (úsalas como «fusionar») -----
// Lista de niveles pasados (hechos[i] = true): un nivel pasado en cualquiera de los dos sitios cuenta como pasado.
export function unirHechos(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) return null;
  a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : [];
  const r = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) r[i] = a[i] || b[i] ? true : null;
  return r;
}
// Objeto de marcas { clave: número } (récords, estrellas): se queda con el mayor de cada clave.
export function unirMaximos(a, b) {
  if (!a && !b) return null;
  const r = { ...(b || {}) };
  for (const k in a || {}) r[k] = Math.max(Number(a[k]) || 0, Number(r[k]) || 0);
  return r;
}
// Partida guardada completa (isla, imperio, minas…): gana la más reciente. El objeto debe traer «t» = Date.now() al guardar.
export function unirRecientes(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return (Number(b.t) || 0) > (Number(a.t) || 0) ? b : a;
}
