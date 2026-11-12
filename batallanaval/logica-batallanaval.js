// Ruta: batallanaval/logica-batallanaval.js
// Lógica PURA de Batalla naval para estrellas, monedas, boosts y escudos (sin document, sin Firebase: se prueba en Node).
//
// 1) ESTRELLAS y MONEDAS por nivel (solo en niveles del mapa; la Partida libre no da estrellas ni monedas).
//    ★ ganar · ★★ ganar con precisión ≥ 35 % · ★★★ ganar con precisión ≥ 50 % y conservar al menos la mitad de tu flota.
//    Monedas por nivel según su MEJOR marca: 1★ = 10, 2★ = 25, 3★ = 50. Al repetir un nivel solo se paga la DIFERENCIA con la mejor
//    marca anterior (no se puede regalar monedas repitiendo). Los umbrales son una propuesta: ajústalos con el juego ya jugable.
// 2) BOOSTS: 🔍 Revelar ubicación (100) · 🛡️ Doble defensa (100) · 👁️ Revelar todo el tablero rival (1000).
//    Se compran al usarlos si no tienes (como en Estacionamiento) y se pueden usar sin gastar turno.
// 3) ESCUDO («doble defensa»): una casilla con barco aguanta UN impacto extra. El primer disparo ahí se ve como acierto, pero solo
//    rompe el escudo: la casilla sigue sin destruir y se puede volver a disparar. El bot lo anota y casi siempre reataca ahí.
// 4) El 25 % EXACTO de los 22 600 niveles (5 650, siempre los mismos) tiene un rival que protege con escudo algunas partes de sus barcos.
//
// PROGRESO (localStorage «batallanaval_progreso_v1»), pensado para unirse sin perder nada entre dispositivos:
//   { max, hecho, e: { "nivel": estrellas 1..3 }, c: { revelar, doble, todo }  comprados, u: { ... } usados, t }
//   Las monedas NO se guardan: monedas = Σ monedas de las estrellas − Σ precio de lo comprado. Así «fusionar» solo toma el máximo de
//   cada dato (estrellas, compras y usos solo suben) y nunca duplica ni inventa monedas.

export const TOTAL_NIVELES = 22600;
export const PORCENTAJE_ESCUDOS = 0.25;
export const MONEDAS_POR_ESTRELLAS = [0, 10, 25, 50];
export const UMBRALES = { dos: 0.35, tres: 0.5, flotaMinima: 0.5 };
export const PROB_REATAQUE = 0.9;     // «casi siempre» vuelve a disparar a una casilla cuyo escudo acaba de romper
export const CLAVE_PROGRESO = "batallanaval_progreso_v1";

export const BOOSTS = [
  { id: "revelar", icono: "🔍", nombre: "Revelar ubicación", precio: 100, clase: "b-azul", ayuda: "Muestra una casilla con barco del rival." },
  { id: "doble",   icono: "🛡️", nombre: "Doble defensa",     precio: 100, clase: "b-morado", ayuda: "Protege una casilla tuya con barco: aguanta un impacto extra." },
  { id: "todo",    icono: "👁️", nombre: "Revelar todo",      precio: 1000, clase: "b-oro", ayuda: "Muestra todos los barcos del rival (y sus escudos) hasta que termine la partida." },
];
export const PRECIOS = Object.fromEntries(BOOSTS.map((b) => [b.id, b.precio]));
const IDS = BOOSTS.map((b) => b.id);

// ---------- Estrellas ----------
// r = { gane, disparos, aciertos, barcos (tuyos al empezar), barcosHundidos (tuyos hundidos por el rival) }
export function estrellas(r) {
  if (!r || !r.gane) return 0;
  const precision = r.disparos > 0 ? r.aciertos / r.disparos : 0;
  const conservada = r.barcos > 0 ? 1 - (r.barcosHundidos || 0) / r.barcos : 1;
  if (precision >= UMBRALES.tres && conservada >= UMBRALES.flotaMinima) return 3;
  if (precision >= UMBRALES.dos) return 2;
  return 1;
}
const estr = (v) => Math.max(0, Math.min(3, Math.floor(Number(v)) || 0));

// ---------- Progreso ----------
const num = (v) => Math.max(0, Math.floor(Number(v)) || 0);
export function sanear(p) {
  p = p && typeof p === "object" ? p : {};
  const e = {};
  for (const k of Object.keys(p.e || {}).sort((a, b) => a - b)) { const n = Number(k), s = estr(p.e[k]); if (n >= 1 && n <= TOTAL_NIVELES && s > 0) e[n] = s; }
  const c = {}, u = {};
  for (const id of IDS) { c[id] = num(p.c && p.c[id]); u[id] = Math.min(num(p.u && p.u[id]), c[id]); }
  return { max: Math.min(TOTAL_NIVELES, Math.max(1, num(p.max))), hecho: Math.min(TOTAL_NIVELES, num(p.hecho)), e, c, u, t: num(p.t) };
}
export function leerProgreso(almacen = typeof localStorage !== "undefined" ? localStorage : null) {
  try { return sanear(JSON.parse(almacen.getItem(CLAVE_PROGRESO))); } catch (x) { return sanear(null); }
}
export function guardarProgreso(p, almacen = typeof localStorage !== "undefined" ? localStorage : null) {
  p.t = Date.now();
  try { almacen.setItem(CLAVE_PROGRESO, JSON.stringify(sanear(p))); } catch (x) {}
  return p;
}
// Para compartido/progreso.js → conectar(...): une dos progresos (cualquiera puede ser null) tomando el máximo de cada dato
export function fusionar(a, b) {
  if (!a && !b) return null;
  if (!a || !b) return sanear(a || b);
  a = sanear(a); b = sanear(b);
  const e = {}, c = {}, u = {};
  for (const k of new Set([...Object.keys(a.e), ...Object.keys(b.e)])) e[k] = Math.max(a.e[k] || 0, b.e[k] || 0);
  for (const id of IDS) { c[id] = Math.max(a.c[id], b.c[id]); u[id] = Math.max(a.u[id], b.u[id]); }
  return sanear({ max: Math.max(a.max, b.max), hecho: Math.max(a.hecho, b.hecho), e, c, u, t: Math.max(a.t, b.t) });
}

// ---------- Monedas y boosts ----------
export const monedasGanadas = (p) => Object.values(p.e).reduce((s, v) => s + MONEDAS_POR_ESTRELLAS[estr(v)], 0);
export const monedasGastadas = (p) => IDS.reduce((s, id) => s + p.c[id] * PRECIOS[id], 0);
export const monedas = (p) => Math.max(0, monedasGanadas(p) - monedasGastadas(p));
export const disponibles = (p, id) => Math.max(0, p.c[id] - p.u[id]);
export const estrellasTotales = (p) => Object.values(p.e).reduce((s, v) => s + estr(v), 0);

// Compra un boost sin usarlo. Devuelve false si no alcanzan las monedas.
export function comprar(p, id) {
  if (!(id in PRECIOS) || monedas(p) < PRECIOS[id]) return false;
  p.c[id]++;
  return true;
}
// Usa un boost: si no tienes, lo compra en ese momento. { ok, comprado } (ok = false si no hay ni boost ni monedas)
export function usarBoost(p, id) {
  if (!(id in PRECIOS)) return { ok: false, comprado: false };
  let comprado = false;
  if (disponibles(p, id) < 1) { if (!comprar(p, id)) return { ok: false, comprado: false }; comprado = true; }
  p.u[id]++;
  return { ok: true, comprado };
}
// Registra el fin de un nivel ganado con «est» estrellas. Devuelve { monedasNuevas, mejoro, estrellas }.
export function terminarNivel(p, nivel, est) {
  est = estr(est); nivel = Math.floor(nivel);
  if (est < 1 || nivel < 1 || nivel > TOTAL_NIVELES) return { monedasNuevas: 0, mejoro: false, estrellas: 0 };
  const antes = estr(p.e[nivel]);
  const mejoro = est > antes;
  if (mejoro) p.e[nivel] = est;
  p.hecho = Math.max(p.hecho, nivel);
  p.max = Math.min(TOTAL_NIVELES, Math.max(p.max, nivel + 1));
  return { monedasNuevas: MONEDAS_POR_ESTRELLAS[Math.max(est, antes)] - MONEDAS_POR_ESTRELLAS[antes], mejoro, estrellas: Math.max(est, antes) };
}

// ---------- Azar con semilla (mismo nivel = mismo resultado para todos) ----------
export function rng(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- Niveles con escudos del bot: EXACTAMENTE el 25 % ----------
let marcas = null;
export function nivelTieneEscudos(nivel) {
  nivel = Math.floor(nivel);
  if (!(nivel >= 1 && nivel <= TOTAL_NIVELES)) return false;
  if (!marcas) { // barajado fijo de 1..22600: los primeros 5 650 llevan escudos
    const r = rng(20261111), orden = new Uint16Array(TOTAL_NIVELES).map((_, i) => i);
    for (let i = TOTAL_NIVELES - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = orden[i]; orden[i] = orden[j]; orden[j] = x; }
    marcas = new Uint8Array(TOTAL_NIVELES);
    for (let i = 0; i < Math.round(TOTAL_NIVELES * PORCENTAJE_ESCUDOS); i++) marcas[orden[i]] = 1;
  }
  return marcas[nivel - 1] === 1;
}
// Casillas del rival que llevan escudo. celdasBarco = índices de las casillas con barco del bot. Entre 20 % y 40 % de ellas
// (mínimo 1, y nunca todas), siempre las mismas para el mismo nivel. En niveles sin escudos devuelve un Set vacío.
export function escudosDelBot(nivel, celdasBarco) {
  const s = new Set();
  if (!nivelTieneEscudos(nivel) || celdasBarco.length < 2) return s;
  const r = rng(Math.imul(Math.floor(nivel), 7919) + 13);
  const cant = Math.max(1, Math.min(celdasBarco.length - 1, Math.round(celdasBarco.length * (0.2 + 0.2 * r()))));
  const pool = [...celdasBarco];
  for (let i = 0; i < cant; i++) { const j = i + Math.floor(r() * (pool.length - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; s.add(pool[i]); }
  return s;
}

// ---------- Disparos y escudos ----------
// Tablero (de quien RECIBE el disparo): { barcos: Map<id, number[]>  casillas de cada barco,
//   ocupadas: Map<casilla, id>, escudos: Set<casilla>, golpeadas: Set<casilla> (destruidas o agua) }
export function crearTablero(barcos) {
  const t = { barcos: new Map(), ocupadas: new Map(), escudos: new Set(), golpeadas: new Set() };
  barcos.forEach((cs, id) => { t.barcos.set(id, [...cs]); cs.forEach((c) => t.ocupadas.set(c, id)); });
  return t;
}
// Resultado: "repetido" | "agua" | "escudo" | "impacto" (con hundido y barco). «escudo» se ve como acierto, pero la casilla NO
// queda destruida (no entra en golpeadas): se puede volver a disparar y entonces sí es impacto.
export function resolverDisparo(t, casilla) {
  if (t.golpeadas.has(casilla)) return { tipo: "repetido" };
  if (t.escudos.has(casilla)) { t.escudos.delete(casilla); return { tipo: "escudo" }; }
  const id = t.ocupadas.get(casilla);
  t.golpeadas.add(casilla);
  if (id === undefined) return { tipo: "agua" };
  const hundido = t.barcos.get(id).every((c) => t.golpeadas.has(c));
  return { tipo: "impacto", barco: id, hundido };
}
export const flotaHundida = (t) => [...t.ocupadas.keys()].every((c) => t.golpeadas.has(c));
// Boost 🛡️: protege una casilla propia con barco que siga entera y sin escudo
export function activarEscudo(t, casilla) {
  if (!t.ocupadas.has(casilla) || t.golpeadas.has(casilla) || t.escudos.has(casilla)) return false;
  t.escudos.add(casilla);
  return true;
}
// Boost 🔍: una casilla con barco del rival, aún sin destruir ni revelada. azar = () => [0,1). null si no queda ninguna.
export function revelarUbicacion(t, reveladas, azar = Math.random) {
  const libres = [...t.ocupadas.keys()].filter((c) => !t.golpeadas.has(c) && !reveladas.has(c));
  if (!libres.length) return null;
  const c = libres[Math.floor(azar() * libres.length)];
  reveladas.add(c);
  return c;
}
// Boost 👁️: todas las casillas con barco sin destruir (y qué casillas tienen escudo)
export function revelarTodo(t, reveladas) {
  const barcos = [...t.ocupadas.keys()].filter((c) => !t.golpeadas.has(c));
  barcos.forEach((c) => reveladas.add(c));
  return { barcos, escudos: new Set(t.escudos) };
}

// ---------- Memoria del bot ----------
// «pendientes»: casillas donde el bot vio «escudo» (sabe que ahí todavía falta destruir algo).
// Al llegar su turno: si hay pendientes, con probabilidad PROB_REATAQUE dispara a una de ellas (la más antigua); si no, sigue su
// estrategia normal. Una casilla sale de la lista solo cuando se le dispara. Devuelve la casilla o null.
export function elegirReataque(pendientes, azar = Math.random, prob = PROB_REATAQUE) {
  if (!pendientes.size || azar() >= prob) return null;
  const c = pendientes.values().next().value;
  pendientes.delete(c);
  return c;
}
