// Ruta: spider/economia-spider.js
// MONEDAS, AYUDAS y CARTERA de la campaña de Spider. Módulo puro: no usa document, ni Firebase, ni localStorage
// (se prueba en Node: node spider/prueba-economia-spider.mjs). Los números salen de README-spider.md, secciones 3 a 5.
// Si cambias un precio, un tope o una recompensa, actualiza esa tabla del README (las cuentas de la economía dependen de ellas).
//
// MONEDAS: se ganan SOLO la primera vez que se pasa un nivel de la campaña (el Modo libre no da monedas ni tiene boosts de pago).
// AYUDAS (↶ retroceder y 💡 pista) por dificultad del nivel:
//   Fácil y Normal   gratis e ilimitadas (y la pista automática a los 15 s sin mover)
//   Difícil y Experto  boosts de pago con tope por intento de nivel (los topes se reinician al reiniciar el nivel)
//   Maestro          sin retroceder; pista de pago con tope muy bajo
//
// CARTERA: las monedas se GASTAN, así que no se unen con «el mayor». Cada dispositivo lleva sus contadores { g: ganadas, s: gastadas }; el saldo es
// la suma de (g − s) de todos y al unir dos copias se toma, POR DISPOSITIVO, el mayor de cada contador (un contador solo crece). Es la misma
// regla de gominolas/cartera-gominolas.js.  Forma guardada:  cartera = { d: { "<id del dispositivo>": { g: número, s: número } } }

import { unirRec } from "./estrellas-spider.js"; // mejor tiempo y estrellas por nivel

export const RECOMPENSA = { 1: 10, 2: 20, 3: 40, 4: 70, 5: 120 }; // monedas por pasar un nivel la primera vez, según su dificultad
export const AYUDAS = {
  1: { libre: true },
  2: { libre: true },
  3: { retro: { precio: 10, tope: 10 }, pista: { precio: 20, tope: 5 } },
  4: { retro: { precio: 10, tope: 6 }, pista: { precio: 20, tope: 3 } },
  5: { retro: null, pista: { precio: 20, tope: 2 } },
};
// { libre } = todo gratis · si no, retro / pista = { precio, tope } (retro null = no existe)
export const ayudasDe = (dif) => AYUDAS[dif] || AYUDAS[1];
export const recompensa = (dif, primeraVez) => (primeraVez ? RECOMPENSA[dif] || 0 : 0);

// ---------- Cartera ----------
const num = (x) => { x = Math.floor(Number(x)); return x > 0 ? x : 0; };
export const carteraVacia = () => ({ d: {} });
function limpia(c) { // acepta cualquier cosa (datos de la nube) y devuelve una cartera válida
  const r = carteraVacia();
  const d = c && typeof c === "object" && c.d && typeof c.d === "object" ? c.d : {};
  for (const id of Object.keys(d)) r.d[id] = { g: num(d[id] && d[id].g), s: num(d[id] && d[id].s) };
  return r;
}
export function saldo(c) {
  let t = 0;
  const d = limpia(c).d;
  for (const id in d) t += d[id].g - d[id].s;
  return Math.max(0, t);
}
// Anota monedas ganadas por este dispositivo (id). Modifica y devuelve la cartera.
export function ganarMonedas(c, id, n) {
  n = num(n);
  if (!n) return c;
  c.d = c.d || {};
  const x = (c.d[id] = c.d[id] || { g: 0, s: 0 });
  x.g = num(x.g) + n;
  return c;
}
// Gasta n monedas si alcanzan. Devuelve true si se cobró (si no, no cambia nada).
export function gastarMonedas(c, id, n) {
  n = num(n);
  if (!n || saldo(c) < n) return false;
  c.d = c.d || {};
  const x = (c.d[id] = c.d[id] || { g: 0, s: 0 });
  x.s = num(x.s) + n;
  return true;
}
export function unirCarteras(a, b) {
  const A = limpia(a).d, B = limpia(b).d, r = carteraVacia();
  for (const id of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) { // claves ordenadas: el texto JSON del resultado es siempre el mismo (progreso.js compara textos para decidir si sube a la nube)
    r.d[id] = { g: Math.max(A[id] ? A[id].g : 0, B[id] ? B[id].g : 0), s: Math.max(A[id] ? A[id].s : 0, B[id] ? B[id].s : 0) };
  }
  return r;
}

// ---------- Progreso completo (lo que se sincroniza con la cuenta; se pasa como «fusionar» de conectar() en compartido/progreso.js) ----------
// Forma: { cartera, ganadas, mejor: {"palos-dif": segundos}, niv: { max, hecho }, rec: { "<nivel>": tiempo×8 + estrellas }, opc: { palos, dif }, t }
// niv y ganadas: el mayor · mejor: el menor tiempo de cada combinación · rec: el menor tiempo de cada nivel y todas sus estrellas (estrellas-spider.js) · opc: la elegida más recientemente · cartera: contadores por dispositivo
export function unirProgresoSpider(a, b) {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const mejor = {};
  for (const k of [...new Set([...Object.keys(a.mejor || {}), ...Object.keys(b.mejor || {})])].sort()) {
    const x = Number(a.mejor && a.mejor[k]) || 0, y = Number(b.mejor && b.mejor[k]) || 0;
    mejor[k] = x && y ? Math.min(x, y) : x || y;
  }
  const na = a.niv || {}, nb = b.niv || {};
  const opc = (a.t || 0) >= (b.t || 0) ? a.opc || b.opc : b.opc || a.opc;
  const r = {
    cartera: unirCarteras(a.cartera, b.cartera),
    ganadas: Math.max(a.ganadas || 0, b.ganadas || 0),
    mejor,
    niv: { max: Math.max(na.max || 1, nb.max || 1), hecho: Math.max(na.hecho || 0, nb.hecho || 0) },
  };
  const rec = unirRec(a.rec, b.rec);
  if (rec) r.rec = rec;
  if (opc) r.opc = opc;
  r.t = Math.max(a.t || 0, b.t || 0); // claves siempre en este orden (mismo motivo que en unirCarteras)
  return r;
}
