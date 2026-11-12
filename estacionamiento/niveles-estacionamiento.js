// Ruta: estacionamiento/niveles-estacionamiento.js
// Generador de los 22 600 niveles del Estacionamiento (tableros siempre llenos: ver generarNivel). No toca la página (no usa document), así que se puede probar en Node.
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
  // El tablero SIEMPRE se llena casi por completo (ver generarNivel). La dificultad ya no sale de cuántos autos caben, sino de:
  //   p3      proporción de autos largos (3 casillas): 0.3 → 0.6
  //   enredo  qué tanto se prefieren los caminos tapados por otros autos al desarmar el tablero: 0.1 → 0.95
  //           (poco enredo = muchos autos libres desde el principio; mucho = pocos libres y cadenas largas de autos que estorban)
  const p3 = 0.3 + 0.3 * dif;
  return {
    n, zona, etapa, k, tam, dif,
    seed: mezclar(n, 12345),
    p3,
    enredo: 0.1 + 0.85 * dif,
    obj: Math.round((tam * tam) / (2 + p3)), // autos aproximados (informativo: el tablero se llena casi entero)
    premio: premioMonedas(tam),
  };
}

// ----- Generador del tablero -----
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const TONOS = [0, 22, 48, 120, 165, 198, 225, 265, 300, 335];
export const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

// Paso 1: TESELAR. Se recorre el tablero fila por fila y en cada casilla libre se pone un auto de 2 o 3 casillas, horizontal o vertical,
// hasta llenarlo. (Hacia abajo siempre hay lugar, así que solo pueden quedar casillas sueltas en las últimas filas.)
function teselar(N, p3, rnd) {
  const lleno = new Uint8Array(N * N), piezas = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (lleno[y * N + x]) continue;
    let r = 0;
    while (x + r < N && !lleno[y * N + x + r]) r++; // casillas libres seguidas hacia la derecha
    const v = N - y;                                // hacia abajo
    let h = rnd() < 0.6; // un poco más de horizontales: al barrer fila por fila, los verticales ocupan casillas de las filas siguientes y saldrían de más
    if (h && r < 2) h = false;
    else if (!h && v < 2) h = r >= 2;
    const espacio = h ? r : v;
    if (espacio < 2) continue;                      // casilla suelta
    let len = rnd() < p3 ? 3 : 2;
    if (len > espacio) len = espacio;
    if (espacio - len === 1) len = len === 2 ? 3 : 2; // que no sobre una sola casilla
    for (let i = 0; i < len; i++) lleno[(h ? y : y + i) * N + (h ? x + i : x)] = 1;
    piezas.push({ x, y, len, h });
  }
  return piezas;
}

// Paso 2: DESARMAR. Se van quitando autos en un orden al azar: en cada paso se elige uno que tenga libre su camino hacia la orilla
// (con los autos que aún quedan) y se le pone la flecha hacia ese lado. Ese orden de salida ES una solución: cada auto solo tiene
// delante autos que salen antes que él. Con «enredo» alto se prefieren los autos cuyo camino, en el tablero completo, está tapado
// (cadenas largas); con «enredo» bajo, los que ya estaban libres. Si el tablero se atora (ningún auto libre), se quita un auto al azar
// y queda un hueco (pasa muy pocas veces).
function desarmar(N, piezas, enredo, rnd) {
  const M = piezas.length;
  const orig = new Int32Array(N * N).fill(-1), occ = new Int32Array(N * N).fill(-1);
  piezas.forEach((p, i) => { for (let k = 0; k < p.len; k++) orig[(p.h ? p.y : p.y + k) * N + (p.h ? p.x + k : p.x)] = i; });
  occ.set(orig);
  const vivo = new Uint8Array(M).fill(1), dir = new Int8Array(M).fill(-1), orden = [];
  let quedan = M;
  const sacar = (i) => { const p = piezas[i]; vivo[i] = 0; quedan--; for (let k = 0; k < p.len; k++) occ[(p.h ? p.y : p.y + k) * N + (p.h ? p.x + k : p.x)] = -1; };
  // ¿Su camino hacia la orilla, en el tablero completo, está libre?
  const libreEnOrig = (i, d) => {
    const p = piezas[i];
    let x = d === 1 ? p.x + p.len - 1 : p.x, y = d === 2 ? p.y + p.len - 1 : p.y;
    x += DX[d]; y += DY[d];
    while (x >= 0 && y >= 0 && x < N && y < N) { if (orig[y * N + x] !== -1) return false; x += DX[d]; y += DY[d]; }
    return true;
  };
  while (quedan > 0) {
    const faciles = [], dificiles = [];
    const nuevo = (i, d) => (libreEnOrig(i, d) ? faciles : dificiles).push(i * 4 + d);
    for (let y = 0; y < N; y++) { // solo el primero y el último auto de cada fila (y de cada columna) pueden tener el camino libre
      let x = 0; while (x < N && occ[y * N + x] < 0) x++;
      if (x === N) continue;
      if (piezas[occ[y * N + x]].h) nuevo(occ[y * N + x], 3);
      let x2 = N - 1; while (occ[y * N + x2] < 0) x2--;
      if (piezas[occ[y * N + x2]].h) nuevo(occ[y * N + x2], 1);
    }
    for (let x = 0; x < N; x++) {
      let y = 0; while (y < N && occ[y * N + x] < 0) y++;
      if (y === N) continue;
      if (!piezas[occ[y * N + x]].h) nuevo(occ[y * N + x], 0);
      let y2 = N - 1; while (occ[y2 * N + x] < 0) y2--;
      if (!piezas[occ[y2 * N + x]].h) nuevo(occ[y2 * N + x], 2);
    }
    if (!faciles.length && !dificiles.length) { // atorado: se quita un auto al azar (no entra al nivel)
      let k = (rnd() * quedan) | 0, i = 0;
      for (; i < M; i++) if (vivo[i] && k-- === 0) break;
      sacar(i);
      continue;
    }
    const pool = (rnd() < enredo && dificiles.length) || !faciles.length ? dificiles : faciles;
    const e = pool[(rnd() * pool.length) | 0], i = e >> 2;
    dir[i] = e & 3;
    orden.push(i);
    sacar(i);
  }
  return { orden, dir };
}

// Cada auto sale con su camino libre respecto a los que salen después que él; quitando los autos del último al primero, el nivel siempre se puede resolver.
export function generarNivel(cfg) {
  const N = cfg.tam;
  const rnd = mulberry32(cfg.seed);
  const piezas = teselar(N, cfg.p3, rnd);
  const { orden, dir } = desarmar(N, piezas, cfg.enredo, rnd);
  const K = orden.length;
  const autos = new Array(K);
  orden.forEach((i, k) => { // el primero en salir recibe el id más alto (esResoluble los quita del último al primero)
    const p = piezas[i], id = K - 1 - k;
    autos[id] = { x: p.x, y: p.y, len: p.len, dir: dir[i], h: p.h, id, tono: TONOS[(rnd() * TONOS.length) | 0], luz: 46 + ((rnd() * 12) | 0) };
  });
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
