// Ruta: supervivencia/mapa-general-supervivencia.js
// Lógica (sin document, sin Firebase) de dos cosas:
//   A) La FRANJA EXTERIOR de la base: 2 casillas de piso a cada lado, FUERA del mapa de N×N. Se camina, NO se construye,
//      NO hay obstáculos. Al cruzar su borde se sale al MAPA GENERAL.
//   B) El viaje del mapa general a las zonas (energía, nivel, tiempo).
// Coordenadas del README (sección 2): la casilla (i, j) ocupa x∈[i, i+1), y∈[j, j+1); el mapa va de 0 a N.
// Los 4 lados se nombran por el MUNDO PLANO (oeste = x pequeña, norte = y pequeña); en pantalla isométrica van girados 45°.
import { ZONAS, zona, costoEnergia } from "./zonas-supervivencia.js";

export const BORDE = 2;            // casillas de franja a cada lado (lo que pediste)
export const PISO_ANILLO = 4;      // código de piso nuevo (1 madera, 2 piedra, 3 baldosa): camino de tierra, no se puede quitar ni cambiar
export const COLOR_ANILLO = { fondo: "#c9a26b", borde: "#8a6a3c" };   // para dibujarlo con la función de losa que ya tiene el juego

// ---------------- A) Franja exterior ----------------
export const tamExt = (N, B = BORDE) => N + 2 * B;                       // lado de la rejilla ampliada (35 → 39)
export const dentro = (i, j, N) => i >= 0 && j >= 0 && i < N && j < N;   // el mapa de siempre
export const enExt = (i, j, N, B = BORDE) => i >= -B && j >= -B && i < N + B && j < N + B;
export const esAnillo = (i, j, N, B = BORDE) => enExt(i, j, N, B) && !dentro(i, j, N);
// Índice en un arreglo de la rejilla ampliada (Uint8Array(tamExt²)): reemplaza a  j * N + i  si el juego quiere guardar también el anillo
export const indiceExt = (i, j, N, B = BORDE) => (j + B) * tamExt(N, B) + (i + B);

// REGLAS: todo lo que construye o pone cosas debe preguntar aquí primero (piso, 🧽, 🌳 plantar y generarMundo).
export const puedeConstruir = (i, j, N) => dentro(i, j, N);
export const puedeHaberObjeto = (i, j, N) => dentro(i, j, N);

// ¿Se puede pisar la casilla (i, j)? El anillo siempre; el mapa depende de lo que ya tiene el juego (bloqueaObjeto(i, j))
export function casillaLibre(i, j, N, bloqueaObjeto, B = BORDE) {
  if (!enExt(i, j, N, B)) return false;
  if (!dentro(i, j, N)) return true;
  return !(bloqueaObjeto && bloqueaObjeto(i, j));
}
export function casillasAnillo(N, B = BORDE) {
  const r = [], T = tamExt(N, B);
  for (let j = -B; j < N + B; j++) for (let i = -B; i < N + B; i++) if (!dentro(i, j, N)) r.push([i, j]);
  return r;   // 35 → 296 casillas
}
// ¿Está limpio el anillo de una rejilla ampliada de objetos? (nunca debe haber nada)
export function anilloLimpio(objetosExt, N, B = BORDE) {
  for (const [i, j] of casillasAnillo(N, B)) if (objetosExt[indiceExt(i, j, N, B)]) return false;
  return true;
}

// Límites por donde camina el personaje: de -B a N+B (antes era de 0 a N)
export const limitesCaminables = (N, B = BORDE) => ({ min: -B, max: N + B });

// ¿Cruzó el borde exterior? Devuelve "oeste" | "este" | "norte" | "sur" o null. `margen` = cuánto antes del borde se dispara.
export function salida(x, y, N, B = BORDE, margen = 0.25) {
  if (x < -B + margen) return "oeste";
  if (x > N + B - margen) return "este";
  if (y < -B + margen) return "norte";
  if (y > N + B - margen) return "sur";
  return null;
}
// Si cierra el mapa general sin viajar: lo devuelve un poco hacia adentro del anillo, para no volver a dispararlo
export function devolverAdentro(x, y, N, B = BORDE, hondo = 0.8) {
  const lo = -B + hondo, hi = N + B - hondo;
  return { x: Math.min(hi, Math.max(lo, x)), y: Math.min(hi, Math.max(lo, y)) };
}
// Dónde aparece el personaje al REGRESAR de una zona: en el medio del anillo del lado donde está esa zona (💡 est)
export function entrada(rumbo, N, B = BORDE) {
  const c = N / 2, m = B / 2;
  return { oeste: { x: -m, y: c }, este: { x: N + m, y: c }, norte: { x: c, y: -m }, sur: { x: c, y: N + m } }[rumbo] || { x: c, y: c };
}

// ---------------- B) Viaje del mapa general a las zonas ----------------
// estado = { energia, energiaMax, nivel }. ❓ de 6.6: cuánta energía se tiene y cómo se recarga → valores 💡 est:
export const ENERGIA_MAX = 100;            // est
export const ENERGIA_POR_MIN = 1;          // est: 1 de energía por minuto real (README: «con tiempo y con comida»)
export const crearEstadoViaje = (o = {}) => ({ energia: ENERGIA_MAX, energiaMax: ENERGIA_MAX, nivel: 0, ...o });

// ¿Se puede ir? → { ok, razon, costo, segundos, destino }
//   razon: "no-existe" | "nivel" (con `nivelNecesario`) | "energia" (con `falta`) | null
export function puedeViajar(est, id) {
  const z = zona(id);
  if (!z || id === "base") return { ok: false, razon: "no-existe", costo: 0, segundos: 0, destino: z };
  const costo = costoEnergia(z), r = { ok: true, razon: null, costo, segundos: z.viajeSeg || 0, destino: z };
  if (z.nivelJugador != null && (Number(est.nivel) || 0) < z.nivelJugador) return { ...r, ok: false, razon: "nivel", nivelNecesario: z.nivelJugador };
  if (est.energia < costo) return { ...r, ok: false, razon: "energia", falta: costo - est.energia };
  return r;
}
// Cobra la energía y devuelve el resultado (el juego muestra la carga durante `segundos` y genera el mapa de la zona)
export function viajar(est, id) {
  const r = puedeViajar(est, id);
  if (r.ok) est.energia -= r.costo;
  return r;
}
export function recargar(est, minutos) {
  est.energia = Math.min(est.energiaMax, est.energia + Math.max(0, minutos) * ENERGIA_POR_MIN);
  return est.energia;
}
export const textoRazon = (r) =>
  r.ok ? "" : r.razon === "nivel" ? "Necesitas el nivel " + r.nivelNecesario
  : r.razon === "energia" ? "Te faltan " + Math.ceil(r.falta) + " de energía" : "No se puede ir ahí";
export { ZONAS };
