// Ruta: buscapalabras/generador-buscapalabras.js
// Generador de niveles del mapa de Buscapalabras. Solo lógica: NO usa document ni Firebase (se puede probar en Node).
//   import { nivel } from "./generador-buscapalabras.js";   const n = nivel(1);   // niveles 1 a 22 600 (hechos y comprobados: 1 a NIVELES_HECHOS)
// Cada nivel sale SIEMPRE igual (semilla fija a partir del número de nivel): son niveles fijos, no al azar en cada partida.
// Un nivel = { n, etapa, k, tipo, dif, tam, tema, palabras[], grid[] (filas de texto), pos[] ({ p, f, c, d }), parSeg }
//   etapa = 0..225 (estado o país) · k = 1..100 (nivel dentro de la etapa) · tipo = "facil" | "medio" | "dificil" (plan de dificultad de config)
// REGLAS que cumple todo nivel (las comprueba bot-buscapalabras.mjs, que es otro código aparte):
//   1. Cada palabra está UNA sola vez en el tablero (en las 8 direcciones), así que la selección del jugador se compara con la lista sin ambigüedad.
//   2. Las palabras colocadas solo usan las direcciones de la dificultad (config-buscapalabras.js → DIFICULTADES[...].dirs).
//   3. Ninguna palabra está dentro de otra (ni al revés), y no hay repetidas.
// TIPO → DIFICULTAD (PROVISIONAL, se puede cambiar): fácil = 1 o 2 · medio = 3 · difícil = 4 o 5.
// IMPORTANTE: cambiar este archivo, el banco de palabras o la config CAMBIA los niveles. Después de publicar, no los toques (bot: «huella»).
import { NIVELES_POR_ETAPA, TOTAL_ETAPAS, nivelesPorTipo, DIFICULTADES } from "./config-buscapalabras.js";
import { parSegundos } from "./economia-buscapalabras.js";
import { TEMAS, GENERAL } from "./palabras-buscapalabras.js";

export const NIVELES_HECHOS = 3200; // niveles 1 a 3200 = los 32 estados de México
export const TOTAL_NIVELES = NIVELES_POR_ETAPA * TOTAL_ETAPAS;
export const VECTORES = { E: [0, 1], S: [1, 0], W: [0, -1], N: [-1, 0], SE: [1, 1], NE: [-1, 1], SW: [1, -1], NW: [-1, -1] };
const OCHO = Object.keys(VECTORES);

// ----- Números al azar con semilla (mismo resultado en cualquier aparato) -----
function crearRng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function semillaDe(a, b, c) {
  let h = 2166136261;
  for (const x of [a, b, c]) { h ^= x; h = Math.imul(h, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); }
  return h >>> 0;
}
const elegir = (rng, lista) => lista[Math.floor(rng() * lista.length)];
function barajar(rng, lista) {
  const r = lista.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// ----- Qué tipo (fácil/medio/difícil) es cada nivel de una etapa -----
// Se reparte según el plan de config (nivelesPorTipo), con los fáciles al principio y los difíciles al final, pero mezclados.
// El nivel 1 de cada etapa es fácil y el 100 es difícil (el «jefe» del estado).
const cacheTipos = new Map();
export function tiposEtapa(i) {
  if (cacheTipos.has(i)) return cacheTipos.get(i);
  const c = nivelesPorTipo(i);
  const lista = [...Array(c.facil).fill("facil"), ...Array(c.medio).fill("medio"), ...Array(c.dificil).fill("dificil")];
  const rng = crearRng(semillaDe(7001, i, 1));
  const r = lista.map((t, j) => ({ t, k: j + (rng() - 0.5) * 60 })).sort((a, b) => a.k - b.k).map((x) => x.t);
  const ult = r.length - 1;
  if (c.dificil > 0 && r[ult] !== "dificil") { const j = r.lastIndexOf("dificil"); [r[ult], r[j]] = [r[j], r[ult]]; }
  if (c.facil > 0 && r[0] !== "facil") { const j = r.indexOf("facil"); [r[0], r[j]] = [r[j], r[0]]; }
  cacheTipos.set(i, r);
  return r;
}

// ----- Dificultad, tamaño y cuántas palabras tiene un nivel -----
function parametros(tipo, i, k, rng) {
  const p = i / (TOTAL_ETAPAS - 1); // avance en todo el mapa: 0 en el primer estado, 1 en el último país
  let dif, tam, palabras;
  if (tipo === "facil") {
    dif = rng() < 0.75 - 0.45 * p ? 1 : 2;
    tam = elegir(rng, p < 0.5 ? [8, 8, 9, 10] : [9, 10, 10]);
    palabras = tam - 3 + (rng() < 0.4 ? 1 : 0);
  } else if (tipo === "medio") {
    dif = 3;
    tam = elegir(rng, p < 0.5 ? [10, 10, 12] : [10, 12, 12]);
    palabras = tam - 3 + elegir(rng, [0, 1, 2]);
  } else {
    dif = rng() < 0.65 - 0.4 * p ? 4 : 5;
    tam = elegir(rng, p < 0.5 ? [12, 12, 15] : [12, 15, 15, 20]);
    palabras = Math.round(tam * 0.7) + elegir(rng, [0, 1, 2]) + (dif === 5 ? 1 : 0);
  }
  if (i === 0 && k <= 5 && tipo === "facil") { dif = 1; tam = 8; palabras = 5; } // los primeros niveles del juego: lo más sencillo
  return { dif, tam, palabras };
}

// ----- Elegir las palabras del nivel -----
const alReves = (s) => [...s].reverse().join("");
const chocan = (a, b) => a.includes(b) || b.includes(a) || alReves(a).includes(b) || alReves(b).includes(a);
function elegirPalabras(rng, tema, cuantas, tam, dif) {
  const [lo, hi] = dif <= 1 ? [4, 6] : dif === 2 ? [4, 7] : dif === 3 ? [4, 8] : dif === 4 ? [5, 10] : [6, 12];
  const maxLen = Math.min(tam, 12), tope = Math.floor((dif <= 2 ? 0.45 : 0.5) * tam * tam);
  const dentro = (lista, a, b) => lista.filter((w) => w.length >= a && w.length <= Math.min(b, maxLen));
  let pool = dentro(tema.palabras, lo, hi);
  if (pool.length < cuantas * 2) pool = pool.concat(dentro(GENERAL, lo, hi).filter((w) => !pool.includes(w)));
  if (pool.length < cuantas * 2) pool = pool.concat(dentro(GENERAL, 4, maxLen).filter((w) => !pool.includes(w)));
  const elegidas = []; let letras = 0;
  for (const w of barajar(rng, pool)) {
    if (elegidas.length >= cuantas) break;
    if (letras + w.length > tope || elegidas.some((x) => chocan(x, w))) continue;
    elegidas.push(w); letras += w.length;
  }
  return elegidas.length === cuantas ? elegidas : null;
}

// ----- Colocar las palabras con BACKTRACKING -----
// Va palabra por palabra (la más larga primero) probando posiciones; si una palabra ya no cabe, deshace la anterior y prueba otra posición.
// dif 1 a 3: prefiere NO cruzarse con otras palabras · dif 4 y 5: prefiere cruzarse (palabras entrelazadas). Con tope de intentos para no atorarse.
function colocarTodas(rng, palabras, tam, dirs, cruzar) {
  const g = Array.from({ length: tam }, () => Array(tam).fill(""));
  const orden = palabras.slice().sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const pos = []; let nodos = 0; const LIMITE = 4000;
  function candidatos(w) {
    const r = [];
    for (const d of dirs) {
      const [df, dc] = VECTORES[d];
      for (let f = 0; f < tam; f++) for (let c = 0; c < tam; c++) {
        const f2 = f + df * (w.length - 1), c2 = c + dc * (w.length - 1);
        if (f2 < 0 || f2 >= tam || c2 < 0 || c2 >= tam) continue;
        let cruces = 0, ok = true;
        for (let j = 0; j < w.length; j++) {
          const x = g[f + df * j][c + dc * j];
          if (x === "") continue;
          if (x !== w[j]) { ok = false; break; }
          cruces++;
        }
        if (ok) r.push({ f, c, d, v: cruzar ? Math.min(cruces, 3) + rng() * 2.5 : -cruces * 5 + rng() });
      }
    }
    return r.sort((a, b) => b.v - a.v).slice(0, 30);
  }
  function rec(idx) {
    if (idx === orden.length) return true;
    const w = orden[idx];
    for (const cand of candidatos(w)) {
      if (++nodos > LIMITE) return false;
      const [df, dc] = VECTORES[cand.d], nuevas = [];
      for (let j = 0; j < w.length; j++) {
        const f = cand.f + df * j, c = cand.c + dc * j;
        if (g[f][c] === "") { g[f][c] = w[j]; nuevas.push([f, c]); }
      }
      pos.push({ p: w, f: cand.f, c: cand.c, d: cand.d });
      if (rec(idx + 1)) return true;
      pos.pop();
      for (const [f, c] of nuevas) g[f][c] = "";
      if (nodos > LIMITE) return false;
    }
    return false;
  }
  return rec(0) ? { g, pos } : null;
}

// ----- Rellenar con letras y asegurar que cada palabra aparece UNA sola vez (en las 8 direcciones) -----
const ALFABETO = "AAAAAEEEEEOOOOIIIUUSSSRRRNNNLLLTTTDDCCMMPPBBGGVVFFHHQJYZXK";
function veces(g, tam, w) {
  const vistos = new Set();
  for (let f = 0; f < tam; f++) for (let c = 0; c < tam; c++) {
    if (g[f][c] !== w[0]) continue;
    for (const d of OCHO) {
      const [df, dc] = VECTORES[d], f2 = f + df * (w.length - 1), c2 = c + dc * (w.length - 1);
      if (f2 < 0 || f2 >= tam || c2 < 0 || c2 >= tam) continue;
      let ok = true;
      for (let j = 1; j < w.length; j++) if (g[f + df * j][c + dc * j] !== w[j]) { ok = false; break; }
      if (ok) vistos.add(Math.min(f * tam + c, f2 * tam + c2) + "-" + Math.max(f * tam + c, f2 * tam + c2));
    }
  }
  return vistos.size;
}
function rellenar(rng, base, tam, palabras, dif) {
  const señuelo = palabras.join(""); // medio y difícil: letras de las propias palabras para despistar
  for (let intento = 0; intento < 40; intento++) {
    const g = base.map((fila) => fila.map((x) => x || (dif >= 3 && rng() < 0.6 ? señuelo[Math.floor(rng() * señuelo.length)] : ALFABETO[Math.floor(rng() * ALFABETO.length)])));
    if (palabras.every((w) => veces(g, tam, w) === 1)) return g;
  }
  return null;
}

// ----- Un nivel -----
export function nivel(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1 && n <= TOTAL_NIVELES)) throw new RangeError("nivel fuera de rango: " + n);
  const i = Math.floor((n - 1) / NIVELES_POR_ETAPA), k = ((n - 1) % NIVELES_POR_ETAPA) + 1;
  const tipo = tiposEtapa(i)[k - 1], tema = TEMAS[i % TEMAS.length];
  for (let intento = 0; intento < 80; intento++) { // cada intento usa otra semilla; el resultado sigue siendo siempre el mismo
    const rng = crearRng(semillaDe(n, intento, 99));
    const { dif, tam, palabras: cuantas } = parametros(tipo, i, k, rng);
    const dirs = DIFICULTADES.find((d) => d.id === dif).dirs;
    const ps = elegirPalabras(rng, tema, cuantas, tam, dif);
    if (!ps) continue;
    const col = colocarTodas(rng, ps, tam, dirs, dif >= 4);
    if (!col) continue;
    const g = rellenar(rng, col.g, tam, ps, dif);
    if (!g) continue;
    const palabras = ps.slice().sort();
    return {
      n, etapa: i, k, tipo, dif, tam, tema: tema.nombre, palabras,
      grid: g.map((fila) => fila.join("")),
      pos: col.pos.slice().sort((a, b) => (a.p < b.p ? -1 : 1)),
      parSeg: parSegundos({ palabras: palabras.length, dif, tam }),
    };
  }
  throw new Error("No se pudo generar el nivel " + n);
}
