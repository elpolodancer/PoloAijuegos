// Ruta: spider/logica-spider.js
// Lógica pura del Solitario Spider (sin DOM, sin Firebase): la usan el juego (juego-spider.js) y el bot (ia-spider.js).
// Carta = número 0..51 → palo = floor(c/13), rango = c%13 (0 = A … 12 = K). Se juega con 104 cartas (8 series de 13).
// Estado e = { cols:[10 listas, la última carta es la de arriba], ocultas:[cuántas cartas boca abajo tiene cada columna (las de abajo)],
//              reparto:[50 cartas del mazo], rep:(repartos hechos 0..5), hechos:(series K..A quitadas 0..8), movs, palos (1..4), dif (1..5), semilla }
// PALOS y DIFICULTAD son cosas distintas: el reparto depende solo de (palos, semilla); la dificultad dice qué tan complicado es el reparto
// (lo mide el bot: banco-spider.js) y si hay deshacer.

export const NUM_COL = 10, SERIES = 8;
// 5 dificultades (con cualquier cantidad de palos). Maestro = el reparto más difícil y sin deshacer.
export const DIFICULTADES = [
  { id: 1, nombre: "Fácil", ico: "🟢", deshacer: true },
  { id: 2, nombre: "Normal", ico: "🔵", deshacer: true },
  { id: 3, nombre: "Difícil", ico: "🟣", deshacer: true },
  { id: 4, nombre: "Experto", ico: "🟠", deshacer: true },
  { id: 5, nombre: "Maestro", ico: "🔴", deshacer: false },
];
// Cantidad de palos de la baraja: 1 (solo ♠), 2 (♠♥), 3 (♠♥♣; series 3+3+2, porque 8 no se divide entre 3) o 4
export const PALOS = [1, 2, 3, 4];
export const palo = (c) => (c / 13) | 0;
export const rango = (c) => c % 13;

// Generador con semilla (mulberry32): la misma semilla da siempre el mismo reparto (necesario para niveles fijos)
export function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// El mismo (palos, semilla) da SIEMPRE el mismo reparto, sea cual sea la dificultad. (Antes era nuevaPartida(dif, semilla) con dif = palos:
// para 1 a 4 da exactamente los mismos repartos, así que los niveles ya publicados no cambian.)
export function nuevaPartida(palos, semilla, dif = 1) {
  palos = Math.min(4, Math.max(1, Math.floor(palos) || 1));
  const d = DIFICULTADES[dif - 1] || DIFICULTADES[0];
  const mazo = [];
  for (let k = 0; k < SERIES; k++) for (let r = 0; r < 13; r++) mazo.push((k % palos) * 13 + r);
  const rnd = aleatorio(semilla);
  for (let i = mazo.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [mazo[i], mazo[j]] = [mazo[j], mazo[i]]; }
  const cols = Array.from({ length: NUM_COL }, () => []);
  for (let i = 0; i < 54; i++) cols[i % NUM_COL].push(mazo[i]);
  return { cols, ocultas: cols.map((c) => c.length - 1), reparto: mazo.slice(54), rep: 0, hechos: 0, movs: 0, palos, dif: d.id, semilla };
}

export const clonar = (e) => ({ ...e, cols: e.cols.map((c) => c.slice()), ocultas: e.ocultas.slice() });
export const ganada = (e) => e.hechos >= SERIES;

// Cuántas cartas de arriba forman una escalera del mismo palo (K…A descendente) y están boca arriba
export function largoTramo(e, c) {
  const col = e.cols[c], vis = col.length - e.ocultas[c];
  if (vis <= 0) return 0;
  let n = 1;
  while (n < vis) {
    const a = col[col.length - n - 1], b = col[col.length - n];
    if (palo(a) === palo(b) && rango(a) === rango(b) + 1) n++; else break;
  }
  return n;
}
// ¿Se pueden mover las k cartas de arriba de la columna de a la columna a?
export function puedeMover(e, de, k, a) {
  if (de === a || k < 1 || k > largoTramo(e, de)) return false;
  const base = e.cols[de][e.cols[de].length - k], dest = e.cols[a];
  return dest.length === 0 || rango(dest[dest.length - 1]) === rango(base) + 1;
}
function destapar(e, c) { const n = e.cols[c].length; if (n > 0 && e.ocultas[c] >= n) e.ocultas[c] = n - 1; }
// Si arriba de la columna quedó K…A del mismo palo, la serie se quita
function quitarSerie(e, c) {
  const col = e.cols[c], n = col.length;
  if (n < 13 || n - 13 < e.ocultas[c] || rango(col[n - 1]) !== 0) return 0;
  for (let i = 1; i < 13; i++) if (palo(col[n - 1 - i]) !== palo(col[n - 1]) || rango(col[n - 1 - i]) !== i) return 0;
  col.length = n - 13; e.hechos++; destapar(e, c);
  return 1;
}
// Mueve (el que llama ya comprobó puedeMover). Devuelve cuántas series se quitaron.
export function mover(e, de, k, a) {
  const tramo = e.cols[de].splice(e.cols[de].length - k, k);
  e.cols[a].push(...tramo);
  destapar(e, de);
  e.movs++;
  return quitarSerie(e, a);
}
// Regla estándar: no se reparte si hay una columna vacía
export const puedeRepartir = (e) => e.rep < e.reparto.length / NUM_COL && e.cols.every((c) => c.length > 0);
export function repartir(e) {
  for (let c = 0; c < NUM_COL; c++) e.cols[c].push(e.reparto[e.rep * NUM_COL + c]);
  e.rep++; e.movs++;
  for (let c = 0; c < NUM_COL; c++) quitarSerie(e, c);
}

// Todas las jugadas de mover que vale la pena probar (el bot las ordena). Se descartan las inútiles:
//  - mover una columna entera ya descubierta a una columna vacía
//  - partir una escalera para ponerla sobre una carta de OTRO palo
//  - a columnas vacías solo se manda la escalera completa o la carta de arriba, y solo a la primera vacía
export function jugadas(e) {
  const r = [];
  for (let de = 0; de < NUM_COL; de++) {
    const L = largoTramo(e, de);
    if (!L) continue;
    const col = e.cols[de], n = col.length;
    for (let k = L; k >= 1; k--) {
      const base = col[n - k];
      let vacia = false;
      for (let a = 0; a < NUM_COL; a++) {
        if (a === de) continue;
        const dest = e.cols[a];
        if (dest.length === 0) {
          if (vacia || n === k || (k !== L && k !== 1)) continue;
          vacia = true; r.push({ de, k, a, rev: n - k === e.ocultas[de] ? 1 : 0, mismo: 0, vacia: 1 });
        } else {
          const t = dest[dest.length - 1];
          if (rango(t) !== rango(base) + 1) continue;
          const mismo = palo(t) === palo(base) ? 1 : 0;
          if (k < L && !mismo) continue;
          r.push({ de, k, a, rev: n - k === e.ocultas[de] ? 1 : 0, mismo, vacia: 0 });
        }
      }
    }
  }
  return r;
}
