// Ruta: estacionamiento/niveles-estacionamiento.js
// Generador de los 22 600 niveles del Estacionamiento (tableros de 10×10 —los 10 primeros suben de 6×6—, siempre completamente llenos, dificultad 1 o 2: ver generarNivel). No toca la página (no usa document), así que se puede probar en Node.
//   - configNivel(n)   → { n, zona, etapa, k, tam, dificultad, seed, obj, p3, enredo, extra, premio, corazones }  (todo sale del número de nivel: iguales para todos)
//   - generarNivel(cfg) → lista de autos del nivel; SIEMPRE tiene solución (se resuelve quitando los autos del último al primero)
//
// Niveles: 1–3200 = México (32 estados × 100) · 3201–22600 = mundo (194 países × 100). Ver README, secciones 1 a 4.

import { dificultadSorteada } from "./dificultades-estacionamiento.js"; // sorteo fijo de la dificultad de cada nivel (1 = medio, 2 = difícil)

export const NIVELES_POR_ETAPA = 100;
export const ESTADOS = 32;
export const PAISES = 194;
export const NIVELES_MEXICO = ESTADOS * NIVELES_POR_ETAPA;              // 3 200
export const TOTAL_NIVELES = NIVELES_MEXICO + PAISES * NIVELES_POR_ETAPA; // 22 600

// ----- Tamaño y dificultad (versión «divertido y satisfactorio») -----
// Estándar: todos los tableros son de 10×10 y quedan COMPLETAMENTE llenos. Solo los 10 primeros niveles van subiendo (6×6 → 10×10)
// para aprender jugando. El juego maneja SOLO las dificultades 1 y 2 (las 3, 4 y 5 se descartaron: ver README, sección 14).
export const TAM_ESTANDAR = 10;
const TAMS_INICIALES = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10]; // tamaño de los niveles 1..10
// Dificultad → forma del tablero. p3 = proporción de autos largos (3 casillas); enredo = cuánto se prefieren los caminos tapados al desarmar
// (poco enredo = casi todos los autos salen de una; más enredo = algunas cadenas de 2 o 3 autos que se estorban).
export const DIFICULTADES = {
  // minLibres = % de autos que pueden salir desde el primer toque · minOla = la «ola» más chica (cuello de botella) · maxProf = cadena más larga de autos que se estorban
  // premio = monedas al terminar el nivel por primera vez · corazones = errores que se permiten (tocar un auto que tiene otro enfrente cuesta uno)
  1: { nombre: "Medio", p3: 0.3, enredo: 0, extra: 0, premio: 20, corazones: 15, minLibres: 0.40, minOla: 3, maxProf: 4 },
  2: { nombre: "Difícil", p3: 0.4, enredo: 0.5, extra: 99, premio: 35, corazones: 8, minLibres: 0.28, minOla: 2, maxProf: 6 },
};
// Qué nivel es medio y cuál difícil NO se calcula aquí: sale del sorteo de dificultades-estacionamiento.js (lo escribe sorteo-dificultades.mjs).
// Semillas escogidas a mano (probadas con probar-niveles-estacionamiento.mjs) para que los 10 primeros niveles salgan lindos.
// null = se usa la semilla normal del nivel. Para cambiar un nivel: probar otras semillas con «node semillas-iniciales.mjs».
const SEMILLAS_INICIALES = [1053, 2141, 3332, 4040, 5249, 6595, 7419, 8164, 9184, 10561];

// ----- Monedas por terminar un nivel: según la dificultad (1 → 20, 2 → 35) -----
export function premioMonedas(dificultad) {
  return (DIFICULTADES[dificultad] || DIFICULTADES[1]).premio;
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

// ----- Configuración de un nivel -----
export function configNivel(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1 && n <= TOTAL_NIVELES)) throw new RangeError("Nivel fuera de rango: " + n);
  let zona, etapa, k;
  if (n <= NIVELES_MEXICO) {
    zona = "mexico";
    etapa = Math.floor((n - 1) / NIVELES_POR_ETAPA); // 0..31 = índice del estado
    k = ((n - 1) % NIVELES_POR_ETAPA) + 1;           // 1..100 dentro del estado
  } else {
    zona = "mundo";
    const m = n - NIVELES_MEXICO - 1;
    etapa = Math.floor(m / NIVELES_POR_ETAPA);       // 0..193 = índice del país
    k = (m % NIVELES_POR_ETAPA) + 1;
  }
  const inicial = n <= TAMS_INICIALES.length;
  const tam = inicial ? TAMS_INICIALES[n - 1] : TAM_ESTANDAR;
  const dificultad = dificultadSorteada(n);
  const { p3, enredo, extra, premio, corazones } = DIFICULTADES[dificultad];
  return {
    n, zona, etapa, k, tam, dificultad,
    seed: (inicial && SEMILLAS_INICIALES[n - 1]) || mezclar(n, 12345),
    p3, enredo, extra,
    obj: Math.round((tam * tam) / (2 + p3)), // autos aproximados (informativo: el tablero se llena por completo)
    premio, corazones,
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
function desarmar(N, piezas, enredo, extra, rnd) {
  const M = piezas.length;
  const orig = new Int32Array(N * N).fill(-1), occ = new Int32Array(N * N).fill(-1);
  piezas.forEach((p, i) => { for (let k = 0; k < p.len; k++) orig[(p.h ? p.y : p.y + k) * N + (p.h ? p.x + k : p.x)] = i; });
  occ.set(orig);
  const vivo = new Uint8Array(M).fill(1), dir = new Int8Array(M).fill(-1), orden = [];
  let quedan = M;
  const sacar = (i) => { const p = piezas[i]; vivo[i] = 0; quedan--; for (let k = 0; k < p.len; k++) occ[(p.h ? p.y : p.y + k) * N + (p.h ? p.x + k : p.x)] = -1; };
  // ¿Cuántos autos distintos hay en su camino hacia la orilla, en el tablero completo? (0 = sale de una, desde el primer toque)
  const bloqueosEnOrig = (i, d) => {
    const p = piezas[i];
    let x = d === 1 ? p.x + p.len - 1 : p.x, y = d === 2 ? p.y + p.len - 1 : p.y;
    x += DX[d]; y += DY[d];
    let ultimo = -1, cuenta = 0;
    while (x >= 0 && y >= 0 && x < N && y < N) { const o = orig[y * N + x]; if (o !== -1 && o !== ultimo) { cuenta++; ultimo = o; } x += DX[d]; y += DY[d]; }
    return cuenta;
  };
  while (quedan > 0) {
    const cand = []; // candidatos: [auto * 4 + dirección, autos que le estorban en el tablero completo]
    const nuevo = (i, d) => cand.push([i * 4 + d, bloqueosEnOrig(i, d)]);
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
    if (!cand.length) { // atorado: se quita un auto al azar (no entra al nivel)
      let k = (rnd() * quedan) | 0, i = 0;
      for (; i < M; i++) if (vivo[i] && k-- === 0) break;
      sacar(i);
      continue;
    }
    // Con poco «enredo» se sacan primero los autos con menos estorbos (tablero amable: casi todo sale de una o con un solo auto de por medio);
    // con más «enredo» a veces se elige uno con hasta 2 estorbos de más (cadenas un poco más largas).
    let minB = 99; for (const c of cand) if (c[1] < minB) minB = c[1];
    const tope = minB + (rnd() < enredo ? extra : 0);
    const pool = cand.filter((c) => c[1] <= tope);
    const e = pool[(rnd() * pool.length) | 0][0], i = e >> 2;
    dir[i] = e & 3;
    orden.push(i);
    sacar(i);
  }
  return { orden, dir };
}

// Cada auto sale con su camino libre respecto a los que salen después que él; quitando los autos del último al primero, el nivel siempre se puede resolver.
// Además de llenarse por completo, el tablero tiene que ser AMABLE para su dificultad (ver DIFICULTADES): si no cumple, se descarta y se genera otro
// con lo que sigue del mismo azar (sigue siendo igual para todos los jugadores).
export function generarNivel(cfg) {
  const N = cfg.tam;
  const rnd = mulberry32(cfg.seed);
  const meta = DIFICULTADES[cfg.dificultad] || DIFICULTADES[1];
  let autos = null;
  for (let intento = 0; intento < 3000; intento++) {
    const piezas = teselar(N, cfg.p3, rnd);
    if (piezas.reduce((t, p) => t + p.len, 0) !== N * N) continue;   // quedó una casilla suelta: no está lleno
    const { orden, dir } = desarmar(N, piezas, cfg.enredo, cfg.extra, rnd);
    if (orden.length !== piezas.length) continue;                    // se atoró y se descartó un auto: habría un hueco
    const K = orden.length;
    const intentoAutos = new Array(K);
    orden.forEach((i, k) => { // el primero en salir recibe el id más alto (esResoluble los quita del último al primero)
      const p = piezas[i], id = K - 1 - k;
      intentoAutos[id] = { x: p.x, y: p.y, len: p.len, dir: dir[i], h: p.h, id, tono: TONOS[(rnd() * TONOS.length) | 0], luz: 46 + ((rnd() * 12) | 0) };
    });
    autos = intentoAutos;
    const a = analizar(N, autos);
    if (a.pctLibres >= meta.minLibres && a.minOla >= meta.minOla && a.profundidad <= meta.maxProf) break;
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

// Medidas de «qué tan divertido» sale un tablero (para pruebas): cuántos autos pueden salir desde el primer toque (libres),
// y la cadena más larga de autos que se estorban (profundidad: 0 = nadie estorba; 2 = hay que sacar un auto que depende de otro que depende de otro).
export function analizar(tam, autos) {
  const N = tam, occ = new Int32Array(N * N).fill(-1);
  for (const c of autos) for (let i = 0; i < c.len; i++) occ[(c.h ? c.y : c.y + i) * N + (c.h ? c.x + i : c.x)] = c.id;
  const prof = new Array(autos.length).fill(-1);
  const calc = (id) => {
    if (prof[id] >= 0) return prof[id];
    const c = autos[id], [hx, hy] = cabeza(c);
    let x = hx + DX[c.dir], y = hy + DY[c.dir], m = 0;
    while (x >= 0 && y >= 0 && x < N && y < N) { const o = occ[y * N + x]; if (o !== -1 && o !== id) m = Math.max(m, 1 + calc(o)); x += DX[c.dir]; y += DY[c.dir]; }
    return (prof[id] = m);
  };
  let libres = 0, maxProf = 0;
  for (let i = 0; i < autos.length; i++) { const d = calc(i); if (d === 0) libres++; maxProf = Math.max(maxProf, d); }
  // olas: cuántos autos hay en cada profundidad (ola 0 = los que salen desde el primer toque). La ola más chica es el «cuello de botella»:
  // si es muy chica, el jugador se queda con muy pocos autos que se puedan tocar y se frustra buscándolos.
  const olas = new Array(maxProf + 1).fill(0);
  for (const d of prof) olas[d]++;
  return { autos: autos.length, libres, pctLibres: libres / autos.length, profundidad: maxProf, olas, minOla: Math.min(...olas) };
}
