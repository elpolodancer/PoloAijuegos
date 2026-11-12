// Ruta: slither/niveles-slither.js
// NIVELES de «Slither»: 22 600 niveles (32 estados de México + 194 países, 100 por etapa), generados con semilla: el nivel n es SIEMPRE
// el mismo para todos los jugadores. No usa document (se puede probar en Node: slither/verificar-slither.mjs).
//
// Cada nivel = { n, etapa, k, dif, mapa, meta, reto, respiro }
//   • El OBJETIVO es siempre de puntos: llegar a «meta» de Largo (el número que se ve en pantalla) sin que te choquen.
//   • dif  (0 Fácil · 1 Normal · 2 Difícil) = dificultad de los BOTS (ver DIFICULTADES en juego-slither.js)
//   • mapa (0 Pequeño · 1 Mediano · 2 Grande) = tamaño de la arena (ver MAPAS en juego-slither.js)
//
// REPARTO (se hace etapa por etapa, con cuentas EXACTAS por cada 100 niveles y el orden sorteado con semilla):
//   Dificultad: la primera etapa es 50 % Fácil · 40 % Normal · 10 % Difícil y va cambiando poco a poco, en línea recta, hasta que la
//               última etapa (el último país) es 25 % · 35 % · 40 %.
//   Mapas:      un tercio cada uno (33/33/34 por etapa; el que recibe el nivel extra va rotando, así el total es 33.3 % cada uno).
//   Metas:      crecen de 250 a 2000 puntos a lo largo del juego (curva geométrica) y se sortean con altibajos: ~10 % son «retos»
//               (+20 a +40 %), ~20 % son «respiros» (−15 a −30 %) y el resto varía ±10 %. Los primeros 5 niveles no se sortean.
// Si cambias algo de aquí, jugadores con progreso verían otro nivel con el mismo número: no lo cambies después de publicar.
//   TECHO:      ninguna meta pasa de lo que un jugador automático logra en el 10 % de sus vidas en esa combinación de mapa y bots
//               (CALIBRACION, abajo): así TODOS los niveles se pueden pasar. Las metas que topan se sortean entre 85 y 100 % del techo.
// La calibración y cómo repetirla están en README-slither.md.

export const POR_ETAPA = 100;
export const NUM_ETAPAS = 32 + 194;            // 226
export const TOTAL = NUM_ETAPAS * POR_ETAPA;   // 22 600

export const MEZCLA_INI = [50, 40, 10];        // % Fácil / Normal / Difícil en la primera etapa
export const MEZCLA_FIN = [25, 35, 40];        // ... y en la última
export const META_MIN = 200;                   // ninguna meta baja de esto (ni con el sorteo)
export const META_INI = 250, META_FIN = 2000;  // puntos de meta del nivel 1 y del último (antes del sorteo)
const CURVA = 0.85;

// CALIBRACION[mapa][dificultad] = puntos que alcanza el pico de UNA vida de un jugador automático (la IA de los bots, con 7 302 vidas medidas
// en 50 min simulados por combinación), en los cuantiles 5 %, 10 %, … 95 %. Ejemplo: un 1300 en el cuantil 85 % significa que solo el 15 % de las vidas llega a 1300.
// Es un piso conservador: el jugador automático muere mucho al nacer y una persona lo hace mejor. Si cambias DIFICULTADES, MAPAS o la IA
// de los bots en juego-slither.js, hay que volver a medirla (README-slither.md).
export const CALIBRACION = [
  [  // mapa Pequeño
    [100,100,120,150,200,240,290,350,400,450,530,600,690,810,940,1110,1300,1600,2160],  // bots Fácil
    [100,100,100,120,140,170,210,240,280,320,370,430,490,590,690,790,960,1210,1590],  // bots Normal
    [100,100,100,110,140,170,200,240,300,350,420,490,580,680,790,910,1110,1380,1990],  // bots Difícil
  ],
  [  // mapa Mediano
    [100,110,120,150,180,240,290,370,410,500,590,660,760,920,1100,1370,1630,1970,2540],  // bots Fácil
    [100,100,110,130,150,170,200,240,280,310,370,420,480,600,690,840,1100,1420,1970],  // bots Normal
    [100,100,100,110,130,150,170,200,230,270,320,380,460,540,640,780,980,1290,1990],  // bots Difícil
  ],
  [  // mapa Grande
    [130,160,180,220,280,350,400,450,530,590,650,760,940,1250,1480,1790,1940,2340,3730],  // bots Fácil
    [100,100,120,130,150,170,190,210,250,290,360,430,510,590,690,900,1140,1410,2230],  // bots Normal
    [100,100,110,110,130,140,150,170,190,220,260,290,340,400,500,640,900,1280,1820],  // bots Difícil
  ],
];
export const P_TECHO = 0.10;   // fracción de vidas del jugador automático que debe poder llegar a cualquier meta
export const P_INICIO = 0.25, FRAC_INICIO = 0.2;   // ... y en el primer 20 % del juego, al menos esta (así el comienzo nunca es un muro)
const Q_TECHO = Math.round((1 - P_TECHO) * 20) - 1;   // posición del cuantil (1 − P_TECHO) en cada fila
// (0.10 = cuantil 90 %. Súbelo para metas más fáciles; bájalo para más difíciles. Con 0.15 las metas se estancan cerca de 950.)
// Techo de la meta por [mapa][dificultad], de 50 en 50 y sin que suba al pasar a bots más difíciles
export const TECHO = CALIBRACION.map((fila) => { let m = Infinity; return fila.map((q) => { m = Math.min(m, q[Q_TECHO]); return Math.floor(m / 50) * 50; }); });
// Probabilidad estimada de que UNA vida del jugador automático llegue a la meta (interpolando CALIBRACION)
export function probExito(mapa, dif, meta) {
  const q = CALIBRACION[mapa][dif];
  if (meta <= q[0]) return 0.97;
  for (let i = 1; i < q.length; i++) if (meta <= q[i]) { const f = q[i] === q[i - 1] ? 1 : (meta - q[i - 1]) / (q[i] - q[i - 1]); return 1 - ((i) / 20 + f / 20); }
  return 0.05 * Math.pow(q[q.length - 1] / meta, 2);
}
                            // <1: la meta sube un poco más rápido al principio

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function barajar(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Cuántos niveles de cada dificultad tiene la etapa e (suman 100). Método del mayor residuo.
export function mezclaEtapa(e) {
  const u = e / (NUM_ETAPAS - 1);
  const p = MEZCLA_INI.map((v, i) => v + (MEZCLA_FIN[i] - v) * u);
  const c = p.map(Math.floor);
  let falta = POR_ETAPA - c.reduce((a, b) => a + b, 0);
  const orden = p.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || b.i - a.i); // en empate gana la más difícil
  for (let k = 0; falta > 0; k++, falta--) c[orden[k % 3].i]++;
  return c;
}
// Cuántos niveles de cada mapa tiene la etapa e: 33, 33 y 33 + 1 para el mapa e % 3
export function mapasEtapa(e) {
  const c = [33, 33, 33];
  c[e % 3]++;
  return c;
}

const cacheEtapas = new Map();
function etapa(e) {
  let d = cacheEtapas.get(e);
  if (d) return d;
  const rng = mulberry32(e * 7919 + 13);
  const dif = [], mapa = [];
  mezclaEtapa(e).forEach((n, i) => { for (let k = 0; k < n; k++) dif.push(i); });
  mapasEtapa(e).forEach((n, i) => { for (let k = 0; k < n; k++) mapa.push(i); });
  barajar(dif, rng); barajar(mapa, rng);
  if (e === 0) { // el nivel 1 siempre es el más suave: bots fáciles y mapa pequeño
    const a = dif.indexOf(0); [dif[0], dif[a]] = [dif[a], dif[0]];
    const b = mapa.indexOf(0); [mapa[0], mapa[b]] = [mapa[b], mapa[0]];
  }
  d = { dif, mapa };
  cacheEtapas.set(e, d);
  return d;
}

const redondear = (v) => (v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 50) * 50);
export function metaBase(n) { // la curva, sin sorteo
  const u = (n - 1) / (TOTAL - 1);
  return META_INI * Math.pow(META_FIN / META_INI, Math.pow(u, CURVA));
}
// Los puntos de perfil que da pasar el nivel por primera vez
export const puntosNivel = (meta) => Math.max(2, Math.round(meta / 40));
// 1200 → «1.2k»
export const abrev = (v) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k" : String(v));

export function nivelDe(n) {
  n = Math.max(1, Math.min(TOTAL, Math.floor(Number(n)) || 1));
  const e = Math.floor((n - 1) / POR_ETAPA), k = (n - 1) % POR_ETAPA, d = etapa(e);
  const r = mulberry32(n * 2246822519 + 3266489917), a = r(), b = r();
  let f = 1, reto = false, respiro = false;
  if (n > 5) {
    if (a < 0.1) { f = 1.2 + 0.2 * b; reto = true; }
    else if (a < 0.3) { f = 0.7 + 0.15 * b; respiro = true; }
    else f = 0.9 + 0.2 * b;
  }
  const dif = d.dif[k], mapa = d.mapa[k], tope = TECHO[mapa][dif];
  let meta = Math.max(META_MIN, redondear(metaBase(n) * f)), techo = false;
  if (meta > tope) { meta = Math.max(META_MIN, redondear(tope * (0.85 + 0.15 * b))); techo = true; reto = false; respiro = false; }   // topó con el techo: se sortea justo debajo
  if (n <= TOTAL * FRAC_INICIO) {   // comienzo del juego: un «reto» no puede dejar la meta por debajo de P_INICIO de éxito
    while (meta > META_MIN && probExito(mapa, dif, meta) < P_INICIO) { meta = Math.max(META_MIN, redondear(meta * 0.95 - 5)); reto = false; }
  }
  return { n, etapa: e, k: k + 1, dif, mapa, meta, reto, respiro, techo };
}
