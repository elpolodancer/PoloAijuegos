// Ruta: cortafrutas/logica-cortafrutas.js
// Lógica de los NIVELES de «Corta Frutas» SIN pantalla (no usa document): la comparten el juego, el generador y el verificador.
//
// MODELO DEL NIVEL (lo que analiza el bot; el juego lo reproduce en tiempo real, una oleada por segundo):
//  • Un nivel = 12 oleadas × n carriles (n = 6 … 12). Las primeras 7 son oleadas normales y las ÚLTIMAS 5 son la FRUTA FINAL:
//    un jefe «J» que ocupa el mismo carril durante 5 oleadas (5 segundos) y hay que cortar en todas para el puntaje TRIPLE.
//  • Cada casilla de una oleada: «.» vacía · «1» «2» «3» fruta de 1, 2 o 3 puntos · «b» bomba · «J» fruta final.
//  • Un CORTE es un tajo recto que cubre un tramo continuo de carriles. Tope humano: máximo 2 cortes por oleada.
//    – Un corte corta todo lo que cubre. Una bomba cubierta EXPLOTA (−1 vida; el corte sigue y corta lo demás).
//    – Fruta que no cubre ningún corte: se escapa (−1 vida). Bomba sin cortar: no pasa nada.
//    – La fruta final no quita vida si se escapa. Cada oleada en que la cortas suma 1 punto; si la cortas en las 5 oleadas, esos puntos se TRIPLICAN.
//  • 3 vidas: con la tercera pérdida se acaba. Se gana al sobrevivir las 12 oleadas.
//  • MÁXIMO = más puntos que se pueden sacar sobreviviendo. PÉRDIDAS = vidas que cuesta, como mínimo, lograr ese máximo (0, 1 o 2).
//    La dificultad del nivel ES esa cifra: 0 fácil (existe una partida perfecta) · 1 medio (hay que sacrificar una vida) · 2 difícil (dos).
// TEXTO DE UN NIVEL: 12 × n caracteres, oleada por oleada. Todo es determinista (solo enteros): mismo nivel → misma solución en cualquier navegador o Node.

export const OLEADAS = 12, OLEADAS_JEFE = 5, OLEADAS_NORMALES = OLEADAS - OLEADAS_JEFE;
export const VIDAS = 3, CORTES_OLEADA = 2, TRIPLE = 3;
export const TAMANOS_NIVELES = [6, 7, 8, 9, 10, 11, 12]; // carriles
export const ETAPAS_TOTAL = 226, NIVELES_ETAPA = 100;
export const CLASES = ["fácil", "medio", "difícil"]; // índice 0, 1, 2 = vidas que hay que sacrificar

// Generador pseudoaleatorio con semilla (mulberry32): mismo número → misma secuencia.
export function crearRng(semilla) {
  let a = semilla >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.entero = (n) => Math.floor(f() * n);
  return f;
}

// ----- Nivel ↔ texto -----  nivel = { n, ondas: [12 textos de n caracteres] }
export const aTexto = (nivel) => nivel.ondas.join("");
export function deTexto(s) {
  const n = s.length / OLEADAS;
  if (!Number.isInteger(n) || n < 1) throw new RangeError("nivel: el texto no mide 12 × n");
  return { n, ondas: Array.from({ length: OLEADAS }, (_, i) => s.slice(i * n, (i + 1) * n)) };
}
// Revisa que el nivel cumpla las reglas. Devuelve null si está bien o un texto con el problema.
export function validar(nivel) {
  const { n, ondas } = nivel;
  if (!TAMANOS_NIVELES.includes(n)) return "tamaño " + n;
  if (ondas.length !== OLEADAS || ondas.some((o) => o.length !== n || /[^.123bJ]/.test(o))) return "oleadas mal formadas";
  let carril = -1;
  for (let w = 0; w < OLEADAS; w++) {
    const j = ondas[w].indexOf("J");
    if (w < OLEADAS_NORMALES) { if (j >= 0) return "jefe fuera de la fase final"; if (!/[123]/.test(ondas[w])) return "oleada " + (w + 1) + " sin frutas"; }
    else { if (j < 0 || ondas[w].indexOf("J", j + 1) >= 0) return "oleada " + (w + 1) + " sin un solo jefe"; if (carril < 0) carril = j; else if (j !== carril) return "el jefe cambia de carril"; }
  }
  return null;
}
// Cuántos tramos (separados por bombas) tienen algo que cortar: son los cortes mínimos para una oleada perfecta.
export function grupos(onda) {
  let g = 0, hay = false;
  for (const ch of onda + "b") { if (ch === "b") { if (hay) g++; hay = false; } else if (ch !== ".") hay = true; }
  return g;
}

// ----- Solucionador por BACKTRACKING con memoria (oleada, vidas perdidas, racha del jefe) -----
// Devuelve { maximo, perdidas, cortes, ruta: [máscara de carriles cortados por oleada] } o null si el nivel no se puede sobrevivir.
const cacheMascaras = new Map();
function mascaras(n) { // todas las formas de cubrir carriles con 0, 1 o 2 cortes: Map máscara → cortes mínimos (los tramos de la máscara)
  if (cacheMascaras.has(n)) return cacheMascaras.get(n);
  const tramos = [0], m = new Map([[0, 0]]);
  for (let a = 0; a < n; a++) for (let b = a; b < n; b++) tramos.push(((1 << (b - a + 1)) - 1) << a);
  const corridas = (x) => { let c = 0; for (let i = 0; i < n; i++) if ((x >> i) & 1 && !((x >> (i - 1)) & 1 && i > 0)) c++; return c; };
  for (const x of tramos) for (const y of tramos) { const u = x | y; if (!m.has(u)) m.set(u, corridas(u)); }
  const lista = [...m].filter(([, c]) => c <= CORTES_OLEADA);
  cacheMascaras.set(n, lista);
  return lista;
}
function opciones(onda, n) { // resultados distintos que se pueden lograr en una oleada: { gan, per, jefe (-1 no hay · 0 se escapa · 1 cortado), cor, mascara }
  const hayJefe = onda.indexOf("J") >= 0, mejor = new Map();
  for (const [mask, cor] of mascaras(n)) {
    let gan = 0, per = 0, jefe = hayJefe ? 0 : -1;
    for (let i = 0; i < n; i++) {
      const c = onda[i], dentro = (mask >> i) & 1;
      if (c === "b") { if (dentro) per++; }
      else if (c === "J") { if (dentro) { gan++; jefe = 1; } }
      else if (c !== ".") { if (dentro) gan += Number(c); else per++; }
    }
    if (per >= VIDAS) continue;
    const k = gan + "," + per + "," + jefe, previa = mejor.get(k);
    if (!previa || cor < previa.cor) mejor.set(k, { gan, per, jefe, cor, mascara: mask });
  }
  return [...mejor.values()];
}
export function resolver(nivel) {
  const opc = nivel.ondas.map((o) => opciones(o, nivel.n)), memo = new Map();
  function mejorDesde(w, perd, racha) {
    if (w === OLEADAS) return { pts: racha ? (TRIPLE - 1) * OLEADAS_JEFE : 0, per: 0, cor: 0, op: null, sig: null };
    const clave = (w * VIDAS + perd) * 2 + racha;
    if (memo.has(clave)) return memo.get(clave);
    let mejor = null;
    for (const o of opc[w]) {
      const p2 = perd + o.per;
      if (p2 >= VIDAS) continue;
      const s = mejorDesde(w + 1, p2, o.jefe === 0 ? 0 : racha);
      if (!s) continue;
      const pts = o.gan + s.pts, per = o.per + s.per, cor = o.cor + s.cor;
      if (!mejor || pts > mejor.pts || (pts === mejor.pts && (per < mejor.per || (per === mejor.per && cor < mejor.cor)))) mejor = { pts, per, cor, op: o, sig: s };
    }
    memo.set(clave, mejor);
    return mejor;
  }
  const r = mejorDesde(0, 0, 1);
  if (!r) return null;
  const ruta = [];
  for (let s = r; s.op; s = s.sig) ruta.push(s.op.mascara);
  return { maximo: r.pts, perdidas: r.per, cortes: r.cor, ruta };
}

// ----- Plan de los niveles fijos: 226 etapas (32 estados + 194 países) de 100 niveles = 22 600 -----
// Cuántos niveles de cada clase tiene la etapa s (0..225): de 50/40/10 % en la primera a 25/40/35 % en la última, subiendo parejo.
export function mezclaEtapa(s) { const d = Math.round(10 + (25 * s) / (ETAPAS_TOTAL - 1)); return [60 - d, 40, d]; }
// Cuántos niveles de cada tamaño (6 … 12 carriles): 100 = 7 × 14 + 2; los dos tamaños que reciben el nivel de más rotan de etapa en etapa.
export function tamanosEtapa(s) { const k = TAMANOS_NIVELES.length; return TAMANOS_NIVELES.map((_, i) => 14 + ((((i - 2 * s) % k) + k) % k < 2 ? 1 : 0)); }
// Los 100 niveles de la etapa s en orden: [{ n: carriles, clase }]. Primero los de 6 carriles, luego 7… y, dentro de cada tamaño, de fácil a difícil.
export function planEtapa(s) {
  const meta = mezclaEtapa(s), dado = [0, 0, 0], seq = [];
  for (let i = 0; i < NIVELES_ETAPA; i++) {
    let mejor = 0, falta = -Infinity;
    for (let c = 0; c < 3; c++) { const f = (meta[c] * (i + 1)) / NIVELES_ETAPA - dado[c]; if (f > falta + 1e-9) { falta = f; mejor = c; } }
    dado[mejor]++; seq.push(mejor);
  }
  const cuantos = tamanosEtapa(s), plan = [];
  let k = 0;
  TAMANOS_NIVELES.forEach((n, i) => { seq.slice(k, k + cuantos[i]).sort().forEach((clase) => plan.push({ n, clase })); k += cuantos[i]; });
  return plan;
}
