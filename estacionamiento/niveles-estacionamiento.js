// Ruta: estacionamiento/niveles-estacionamiento.js
// Generador de los 22 600 niveles del Estacionamiento. No toca la página (no usa document), así que se puede probar en Node.
//   - configNivel(n)   → { n, zona, etapa, k, tam, seed, obj, p3, K, premio, dif }  (todo sale del número de nivel: iguales para todos)
//   - generarNivel(cfg) → lista de autos del nivel; SIEMPRE tiene solución (se resuelve quitando los autos del último al primero)
//
// Niveles: 1–3200 = México (32 estados × 100) · 3201–22600 = mundo (194 países × 100). Ver README, secciones 1 a 4.

export const NIVELES_POR_ETAPA = 100;
export const ESTADOS = 32;
export const PAISES = 194;
export const NIVELES_MEXICO = ESTADOS * NIVELES_POR_ETAPA;              // 3 200
export const TOTAL_NIVELES = NIVELES_MEXICO + PAISES * NIVELES_POR_ETAPA; // 22 600

// ----- Tamaños -----
// México: [primer nivel, último nivel, tamaño mínimo, tamaño máximo]. Dentro del tramo el tamaño SUBE poco a poco
// con un poco de azar (así la dificultad no da saltos bruscos, pero tampoco es una escalera aburrida).
const TRAMOS_MEXICO = [
  [1, 100, 10, 15],
  [101, 300, 12, 20],
  [301, 600, 15, 22],
  [601, 1000, 17, 25],
  [1001, 2000, 25, 35],
  [2001, 3000, 27, 40],
  [3001, 3200, 50, 50],
];
// Países: en cada país, de sus 100 niveles exactamente 40 / 30 / 20 / 10 son de estos rangos, en orden aleatorio fijo.
const REPARTO_PAIS = [
  { cantidad: 40, min: 40, max: 50 },
  { cantidad: 30, min: 30, max: 39 },
  { cantidad: 20, min: 20, max: 29 },
  { cantidad: 10, min: 10, max: 19 },
];

// ----- Monedas por terminar un nivel, según su tamaño -----
export function premioMonedas(tam) {
  if (tam <= 19) return 15;
  if (tam <= 29) return 25;
  if (tam <= 39) return 35;
  if (tam <= 45) return 45;
  return 60;
}

// ----- Azar con semilla -----
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Mezcla dos números en una semilla de 32 bits (para que niveles vecinos no se parezcan)
function mezclar(a, b) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 15;
  return h >>> 0;
}
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

function tamanoMexico(n) {
  const [ini, fin, a, b] = TRAMOS_MEXICO.find((t) => n >= t[0] && n <= t[1]);
  if (a === b) return a;
  const pos = (n - ini) / (fin - ini);
  const t = acotar(pos + (mulberry32(mezclar(n, 7))() - 0.5) * 0.5, 0, 1);
  return Math.round(a + (b - a) * t);
}

const cachePaises = new Map();
function tamanosPais(p) { // los 100 tamaños de un país (índice 0..193)
  if (cachePaises.has(p)) return cachePaises.get(p);
  const rnd = mulberry32(mezclar(p, 99));
  const cubos = [];
  REPARTO_PAIS.forEach((r, i) => { for (let j = 0; j < r.cantidad; j++) cubos.push(i); });
  for (let i = cubos.length - 1; i > 0; i--) { // Fisher-Yates
    const j = (rnd() * (i + 1)) | 0;
    [cubos[i], cubos[j]] = [cubos[j], cubos[i]];
  }
  const lista = cubos.map((i) => REPARTO_PAIS[i].min + ((rnd() * (REPARTO_PAIS[i].max - REPARTO_PAIS[i].min + 1)) | 0));
  cachePaises.set(p, lista);
  return lista;
}

// ----- Configuración de un nivel -----
export function configNivel(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1 && n <= TOTAL_NIVELES)) throw new RangeError("Nivel fuera de rango: " + n);
  let zona, etapa, k, tam, dif;
  if (n <= NIVELES_MEXICO) {
    zona = "mexico";
    etapa = Math.floor((n - 1) / NIVELES_POR_ETAPA); // 0..31 = índice del estado
    k = ((n - 1) % NIVELES_POR_ETAPA) + 1;           // 1..100 dentro del estado
    tam = tamanoMexico(n);
    dif = n > 3000 ? 0.9 : 0.1 + 0.75 * ((n - 1) / 2999);
  } else {
    zona = "mundo";
    const m = n - NIVELES_MEXICO - 1;
    etapa = Math.floor(m / NIVELES_POR_ETAPA);       // 0..193 = índice del país
    k = (m % NIVELES_POR_ETAPA) + 1;
    tam = tamanosPais(etapa)[k - 1];
    dif = 0.5 + 0.5 * ((tam - 10) / 40);
  }
  // Densidad (parte de las casillas que ocupan los autos), proporción de autos largos y «desorden» del generador:
  // todo crece con la dificultad. Pero hay un TOPE por tamaño: mientras más grande es el tablero, más largo es el camino de cada auto
  // hasta la orilla y más fácil que otro lo tape, así que no caben tantos autos (medido: ~74 % de ocupación máxima en 10×10,
  // ~52 % en 25×25, ~36 % en 50×50). El tope va un poco por debajo de ese máximo.
  const p3 = 0.3 + 0.3 * dif;
  const dens = Math.min(0.16 + 0.44 * dif, 0.245 + 4.25 / tam);
  return {
    n, zona, etapa, k, tam, dif,
    seed: mezclar(n, 12345),
    p3,
    K: Math.round(6 + 26 * dif),
    obj: Math.max(4, Math.round((dens * tam * tam) / (2 + p3))),
    premio: premioMonedas(tam),
  };
}

// ----- Generador del tablero -----
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const TONOS = [0, 22, 48, 120, 165, 198, 225, 265, 300, 335];
export const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

// Cada auto se coloca con su camino hacia afuera LIBRE respecto a los ya puestos; los nuevos pueden estorbar a los viejos.
// Por eso, quitando los autos del último al primero, el nivel siempre se puede resolver.
export function generarNivel(cfg) {
  const N = cfg.tam;
  const rnd = mulberry32(cfg.seed);
  const occ = new Int32Array(N * N).fill(-1);
  const ruta = new Uint16Array(N * N); // cuántos autos ya puestos pasarían por cada casilla al salir (mide el «enredo»)
  const autos = [];
  const candidato = () => {
    const len = rnd() < cfg.p3 ? 3 : 2, h = rnd() < 0.5;
    const x = (rnd() * (N - (h ? len : 1) + 1)) | 0, y = (rnd() * (N - (h ? 1 : len) + 1)) | 0;
    const celdas = [];
    let score = 0;
    for (let i = 0; i < len; i++) {
      const cx = h ? x + i : x, cy = h ? y : y + i;
      if (occ[cy * N + cx] !== -1) return null;
      celdas.push(cy * N + cx);
      score += ruta[cy * N + cx];
    }
    // sentido al azar; si su camino está tapado, prueba el contrario (sube mucho la cantidad de autos que caben)
    const d0 = h ? (rnd() < 0.5 ? 1 : 3) : (rnd() < 0.5 ? 0 : 2);
    for (const dir of [d0, (d0 + 2) % 4]) {
      const c = { x, y, len, dir, h };
      const [hx, hy] = cabeza(c);
      let rx = hx + DX[dir], ry = hy + DY[dir], libre = true;
      while (rx >= 0 && ry >= 0 && rx < N && ry < N) {
        if (occ[ry * N + rx] !== -1) { libre = false; break; }
        rx += DX[dir]; ry += DY[dir];
      }
      if (libre) return { c, celdas, score };
    }
    return null;
  };
  const maxIntentos = cfg.obj * 30 + 2000;
  for (let intento = 0; autos.length < cfg.obj && intento < maxIntentos; intento++) {
    let mejor = null;
    for (let k = 0; k < cfg.K; k++) {
      const r = candidato();
      if (r && (!mejor || r.score > mejor.score)) mejor = r;
    }
    if (!mejor) continue;
    const id = autos.length;
    mejor.celdas.forEach((i) => (occ[i] = id));
    mejor.c.id = id;
    mejor.c.tono = TONOS[(rnd() * TONOS.length) | 0];
    mejor.c.luz = 46 + ((rnd() * 12) | 0);
    // su camino de salida cuenta para el «enredo» de los autos que se pongan después
    const [hx, hy] = cabeza(mejor.c);
    let rx = hx + DX[mejor.c.dir], ry = hy + DY[mejor.c.dir];
    while (rx >= 0 && ry >= 0 && rx < N && ry < N) { ruta[ry * N + rx]++; rx += DX[mejor.c.dir]; ry += DY[mejor.c.dir]; }
    autos.push(mejor.c);
  }
  return autos;
}

// Comprobación (para pruebas): ¿se pueden sacar todos quitando del último al primero?
export function esResoluble(tam, autos) {
  const N = tam, occ = new Int32Array(N * N).fill(-1);
  for (const c of autos) for (let i = 0; i < c.len; i++) occ[(c.h ? c.y : c.y + i) * N + (c.h ? c.x + i : c.x)] = c.id;
  for (let id = autos.length - 1; id >= 0; id--) {
    const c = autos[id], [hx, hy] = cabeza(c);
    let x = hx + DX[c.dir], y = hy + DY[c.dir];
    while (x >= 0 && y >= 0 && x < N && y < N) { if (occ[y * N + x] !== -1) return false; x += DX[c.dir]; y += DY[c.dir]; }
    for (let i = 0; i < c.len; i++) occ[(c.h ? c.y : c.y + i) * N + (c.h ? c.x + i : c.x)] = -1;
  }
  return true;
}
