// Ruta: compartido/cola-puntos.js
// Cola LOCAL de puntos pendientes de enviar al perfil. No importa Firebase a propósito: así funciona sin internet
// aunque el SDK de Firebase no esté descargado. El envío lo hace compartido/progreso.js (vaciarPuntos).
// Uso en un juego:  import { encolarPuntos } from "../compartido/cola-puntos.js";   encolarPuntos("mi-juego", 10);

export const CLAVE_COLA = "puntos_pendientes_v1";
export const TOPE = 1000;      // igual que MAX_PUNTOS_POR_ENVIO de jugador.js y el 1000 de firestore-unificado.rules
const MAX_EVENTOS = 300;       // si hay más, se juntan eventos del mismo juego (sin pasar de TOPE)

export function leerCola() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_COLA));
    return Array.isArray(c) ? c : [];
  } catch (e) { return []; }
}
export function guardarCola(c) {
  try { localStorage.setItem(CLAVE_COLA, JSON.stringify(c)); } catch (e) {}
}

// Nunca toca el primer evento (puede estar enviándose en ese momento)
function compactar(c) {
  if (c.length <= MAX_EVENTOS) return c;
  const r = [c[0]];
  for (const e of c.slice(1)) {
    const u = r.find((x, i) => i > 0 && x.j === e.j && x.p + e.p <= TOPE);
    if (u) u.p += e.p; else r.push(e);
  }
  return r;
}

// Anota puntos para enviarlos después. Devuelve cuántos envíos quedan pendientes.
export function encolarPuntos(juego, puntos) {
  let p = Math.floor(Number(puntos));
  if (!juego || !(p > 0)) return leerCola().length;
  const cola = leerCola();
  while (p > 0) { const n = Math.min(p, TOPE); cola.push({ j: String(juego), p: n }); p -= n; }
  const r = compactar(cola);
  guardarCola(r);
  return r.length;
}
