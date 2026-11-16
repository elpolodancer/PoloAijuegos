// Ruta: naves/niveles-naves.js
// NIVELES de «Naves»: se generan con una semilla (el nivel n es SIEMPRE el mismo para todos los jugadores).
// 320 niveles = México (32 estados × 10). El tier del nivel (1..50) decide la vida/velocidad de los enemigos y el arma
// con la que se comprueba (ia-naves.js): el nivel está pensado para quien trae el arma de su mismo tier.
// FACIL: lista de niveles que el bot NO pudo pasar con la dificultad base; el verificador (verificar-naves.mjs) la rellena sola
// con el menor «facil» (0, 1, 2…) con el que sí hay camino. No la edites a mano.
import { ARMAS, armaDe, hpBase, velBase, TIPOS, TPS, W, NUM_TIERS, acotar } from "./logica-naves.js";

export const POR_ETAPA = 10;                 // niveles por estado (compartido/etapas-mapa.js)
export const NIVELES = 32 * POR_ETAPA;       // por ahora solo México
export const tierDe = (n) => 1 + Math.floor(((acotar(Math.floor(n) || 1, 1, NIVELES) - 1) * (NUM_TIERS - 1)) / (NIVELES - 1));
export const dificultad = (n) => (acotar(Math.floor(n) || 1, 1, NIVELES) - 1) / (NIVELES - 1); // 0..1
// Monedas por pasar el nivel por primera vez (repetirlo da la cuarta parte). Crece parecido al costo de las armas.
export const monedasNivel = (n) => Math.round(30 * Math.pow(1.17, tierDe(n) - 1));
export const puntosNivel = (n) => 20 + 2 * tierDe(n);

// /*FACIL*/ export const FACIL = {"294":2,"303":2,"310":1};/*FIN*/ lo reescribe verificar-naves.mjs
/*FACIL*/ export const FACIL = {};/*FIN*/

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Formaciones: devuelven posiciones { dx (x absoluta), dy (fila: cuánto más atrás sale) } de n enemigos
function formacion(nombre, n, rng) {
  const p = [];
  const margen = 30, ancho = W - 2 * margen;
  if (nombre === "fila") {
    const sep = Math.min(44, ancho / Math.max(1, n - 1));
    const x0 = W / 2 - (sep * (n - 1)) / 2 + (rng() - 0.5) * 40;
    for (let i = 0; i < n; i++) p.push({ x: x0 + i * sep, dy: 0 });
  } else if (nombre === "v") {
    const sep = Math.min(40, ancho / Math.max(1, n));
    const c = margen + 20 + rng() * (ancho - 40);
    for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; p.push({ x: c + k * sep, dy: Math.abs(k) * 36 }); }
  } else if (nombre === "columna") {
    const c = margen + rng() * ancho;
    for (let i = 0; i < n; i++) p.push({ x: c, dy: i * 40 });
  } else if (nombre === "diagonal") {
    const dir = rng() < 0.5 ? 1 : -1, sep = Math.min(44, ancho / Math.max(1, n - 1));
    const x0 = dir > 0 ? margen : W - margen;
    for (let i = 0; i < n; i++) p.push({ x: x0 + dir * i * sep, dy: i * 24 });
  } else { // enjambre
    const c = margen + 60 + rng() * (ancho - 120);
    for (let i = 0; i < n; i++) p.push({ x: c + (rng() - 0.5) * 120, dy: rng() * 100 });
  }
  for (const q of p) q.x = acotar(q.x, 24, W - 24);
  return p;
}
const FORMAS = ["fila", "v", "columna", "diagonal", "enjambre"];

// ESCALA multiplica el presupuesto de enemigos de todos los niveles (se calibró con los bots: ver README-naves.md, «Calibración»)
export const ESCALA = 1.5;

// facil = 0 es la dificultad base; cada punto más baja un 10 % la cantidad de enemigos (lo usa el verificador).
export function generarNivel(n, facil = 0, escala = ESCALA) {
  n = acotar(Math.floor(n) || 1, 1, NIVELES);
  const tier = tierDe(n), d = dificultad(n), arma = armaDe(tier);
  const rng = mulberry32(n * 1013 + 7);
  const tipos = TIPOS.filter((t) => tier >= t.desde);
  const dur = 38 + 22 * d;                                        // segundos durante los que salen enemigos
  const ratio = (0.26 + 0.3 * d) * escala * Math.pow(0.9, facil); // parte de lo que el arma podría destruir en ese tiempo
  const presupuesto = arma.dps * dur * ratio;                     // vida total de enemigos del nivel
  const olas = Math.round(6 + 8 * d);
  const porOla = presupuesto / olas;
  const spawns = [];

  for (let o = 0; o < olas; o++) {
    const t0 = 1.5 + (o * dur) / olas;
    const grupos = tipos.length > 1 && d > 0.05 && rng() < 0.55 ? 2 : 1;
    for (let g = 0; g < grupos; g++) {
      const T = tipos[Math.floor(rng() * tipos.length)];
      const hpUno = Math.max(1, Math.round(hpBase(tier) * T.hp));
      let cuantos = Math.round(porOla / grupos / hpUno);
      cuantos = acotar(cuantos, 2, T.id === 4 ? 4 : T.id === 3 ? 7 : 12);
      const forma = T.id === 4 ? "fila" : T.amp ? (rng() < 0.5 ? "fila" : "enjambre") : FORMAS[Math.floor(rng() * FORMAS.length)];
      const pos = formacion(forma, cuantos, rng);
      const vy = (velBase(tier) * T.vel) / TPS;                   // px por paso: así la formación conserva su forma
      const ph = rng() * 6.28;
      const retraso = g * 2.2;
      if (T.amp) for (const q of pos) q.x = acotar(q.x, T.amp + 20, W - T.amp - 20);
      for (const q of pos) spawns.push({ tk: Math.round((t0 + retraso) * TPS + q.dy / vy), tp: T.id, x: q.x, ph: T.amp ? ph : 0 });
    }
  }
  spawns.sort((a, b) => a.tk - b.tk || a.x - b.x);
  return { n, tier, arma, spawns, dur, maxTk: Math.round((dur + 70) * TPS), vidas: 5, maxFugas: 10, facil };
}

const cache = new Map();
// El nivel tal como se juega (ya con el ajuste que le calculó el verificador)
export function nivelDe(n) {
  n = acotar(Math.floor(n) || 1, 1, NIVELES);
  let v = cache.get(n);
  if (!v) { v = generarNivel(n, FACIL[n] || 0); cache.set(n, v); if (cache.size > 40) cache.delete(cache.keys().next().value); }
  return v;
}
export { ARMAS };
