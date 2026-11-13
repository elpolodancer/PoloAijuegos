// Ruta: granjafeliz/economia-granjafeliz.js
// Estrellas (1 a 3) y monedas (15 a 45 por nivel) de Granja feliz. No usa Firebase ni document: funciona sin internet y se puede probar en Node.
//
// REGLAS
// - Cada nivel guarda su MEJOR cantidad de estrellas (0 = sin pasar).
// - Monedas por nivel según las estrellas: 1★ = 15, 2★ = 30, 3★ = 45. Nunca más de 45 por nivel: si repites y mejoras, solo se paga la
//   diferencia (de 1★ a 3★ pagan 30 más). Repetir sin mejorar no da nada, así no se puede «cultivar» monedas.
// - El Modo libre NO da monedas ni estrellas (estándar del portal, sección 4A de ESTANDARES-juegos.md). Solo guarda una MARCA por dificultad en «libre»
//   (lo máximo vendido en una partida; registrarLibre). Va en el mismo progreso, así se sincroniza con la cuenta; si no hay marcas, «libre» no se guarda.
// - Las monedas ganadas NO se guardan como número: salen de las estrellas (suma de pagos). Así, al unir el progreso de dos aparatos
//   no se pierden monedas ganadas en cada uno. Solo se guarda lo GASTADO (para la tienda/boosts que vengan).
//
// ESTRELLAS = MEDALLAS (estrellasDe): por TIEMPO, como el original. El tiempo ya NO hace perder el nivel: al cumplir las metas siempre hay medalla.
// 3★ = oro (terminas en oroSeg o menos), 2★ = plata (en plataSeg o menos), 1★ = completado (más tarde). estrellasSeg = [oroSeg, plataSeg].

export const ID_JUEGO = "granjafeliz";
export const CLAVE_PROGRESO = "granjafeliz_progreso_v1";   // { e: { "nivel": estrellas }, gastado, libre?: { "dificultad": marca }, t }
export const TOTAL_NIVELES = 22600;                   // 226 etapas × 100 (igual que ETAPAS.total)
export const MONEDAS_POR_ESTRELLAS = [0, 15, 30, 45]; // índice = estrellas
export const MONEDAS_MIN = 15, MONEDAS_MAX = 45;
const MAX_MARCA = 1e12;                               // tope sensato de una marca del modo libre

const entero = (v) => Math.floor(Number(v)) || 0;
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

// resultado: { gano, segundos, estrellasSeg: [seg3, seg2] } → 0 a 3
export function estrellasDe({ gano = true, segundos = 0, estrellasSeg = [0, 0] } = {}) {
  if (!gano) return 0;
  return segundos <= estrellasSeg[0] ? 3 : segundos <= estrellasSeg[1] ? 2 : 1;
}
export const MEDALLAS = ["", "Completado", "Plata 🥈", "Oro 🥇"]; // índice = estrellas
export const estrellasTexto = (s) => "★".repeat(acotar(entero(s), 0, 3)) + "☆".repeat(3 - acotar(entero(s), 0, 3));

// ----- Progreso local -----
function limpiar(p) {
  const e = {};
  for (const k in (p && p.e) || {}) {
    const n = entero(k), s = acotar(entero(p.e[k]), 0, 3);
    if (n >= 1 && n <= TOTAL_NIVELES && s > 0) e[n] = s;
  }
  const libre = {};
  for (const k in (p && p.libre) || {}) { const m = entero(p.libre[k]); if (/^[a-z]{1,20}$/.test(k) && m > 0) libre[k] = Math.min(m, MAX_MARCA); }
  return { e, gastado: Math.max(0, entero(p && p.gastado)), libre, t: Number(p && p.t) || 0 };
}
// Lo que se guarda: la misma forma de siempre (e, gastado, t) y «libre» solo si ya hay marcas
function salida(p) {
  const o = { e: p.e, gastado: p.gastado };
  if (Object.keys(p.libre).length) o.libre = p.libre;
  o.t = p.t;
  return o;
}
export function leerProgreso() {
  try { return limpiar(JSON.parse(localStorage.getItem(CLAVE_PROGRESO))); } catch (e) { return limpiar(null); }
}
function guardar(p) {
  p.t = Date.now();
  try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(salida(p))); } catch (e) {}
}

// ----- Monedas -----
export const monedasGanadas = (p = leerProgreso()) => Object.values(p.e).reduce((t, s) => t + MONEDAS_POR_ESTRELLAS[s], 0);
export const saldo = (p = leerProgreso()) => Math.max(0, monedasGanadas(p) - p.gastado);
export function gastar(monto) {            // true si alcanzaba y se descontó
  monto = entero(monto);
  const p = leerProgreso();
  if (!(monto > 0) || monto > saldo(p)) return false;
  p.gastado += monto; guardar(p);
  return true;
}

// Anota el resultado de un nivel. Devuelve { estrellas (la mejor), monedas (las que se pagan AHORA), mejoro, primeraVez }
export function registrarNivel(n, estrellas) {
  n = entero(n); estrellas = acotar(entero(estrellas), 0, 3);
  const p = leerProgreso(), antes = p.e[n] || 0;
  if (n < 1 || n > TOTAL_NIVELES || estrellas <= antes) return { estrellas: antes, monedas: 0, mejoro: false, primeraVez: false };
  p.e[n] = estrellas; guardar(p);
  return { estrellas, monedas: MONEDAS_POR_ESTRELLAS[estrellas] - MONEDAS_POR_ESTRELLAS[antes], mejoro: true, primeraVez: antes === 0 };
}
export const estrellasDeNivel = (n, p = leerProgreso()) => p.e[n] || 0;

// ----- Modo libre: marca = lo máximo vendido en una partida, por dificultad (sin monedas ni estrellas) -----
export const mejorLibre = (id, p = leerProgreso()) => p.libre[id] || 0;
// Anota la marca si supera a la guardada. Devuelve { mejor, record } (record = true si esta venta la superó).
export function registrarLibre(id, vendido) {
  const n = acotar(entero(vendido), 0, MAX_MARCA);
  if (!/^[a-z]{1,20}$/.test(String(id))) return { mejor: 0, record: false };
  const p = leerProgreso(), antes = p.libre[id] || 0;
  if (n <= antes) return { mejor: antes, record: false };
  p.libre[id] = n; guardar(p);
  return { mejor: n, record: true };
}

// Para el mapa de niveles: { max, hecho }. Los niveles se abren en orden: hecho = el más alto con alguna estrella.
export function avanceMapa(p = leerProgreso()) {
  let hecho = 0;
  for (const k in p.e) hecho = Math.max(hecho, Number(k));
  return { hecho, max: Math.min(TOTAL_NIVELES, hecho + 1) };
}

// Une dos progresos (para compartido/progreso.js → conectar): mejor marca de estrellas por nivel, el mayor «gastado» y la mejor marca de cada dificultad del modo libre.
export function fusionar(local, remoto) {
  if (!local && !remoto) return null;
  const a = limpiar(local), b = limpiar(remoto), e = { ...b.e }, libre = { ...b.libre };
  for (const k in a.e) e[k] = Math.max(a.e[k], e[k] || 0);
  for (const k in a.libre) libre[k] = Math.max(a.libre[k], libre[k] || 0);
  return salida({ e, gastado: Math.max(a.gastado, b.gastado), libre, t: Math.max(a.t, b.t) });
}
