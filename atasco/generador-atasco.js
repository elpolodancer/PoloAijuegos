// Ruta: atasco/generador-atasco.js
// Fábrica de tableros (sin pantalla). Arma un tablero al azar con macetas y lo MUTA (mueve carros, el rojo, agrega o quita) conservando solo los
// cambios que no bajan los movimientos mínimos que calcula el solucionador (compartido/…/logica-atasco.js → resolver). Todo con semilla: determinista.
import { resolver, aTexto, BANDAS, MAX_COCHES } from "./logica-atasco.js";

export function ocupacion(t) { // casillas ocupadas (1 = maceta, 2 = carro) o null si algo se encima
  const n = t.n, g = new Uint8Array(n * n);
  for (const m of t.macetas) g[m] = 1;
  for (const c of t.coches) for (let j = 0; j < c.l; j++) { const x = c.o === 0 ? c.f * n + c.p + j : (c.p + j) * n + c.f; if (g[x]) return null; g[x] = 2; }
  return g;
}
function colocarCoche(t, g, rng, i) { // pone un carro en un sitio libre (en la posición i, o al final); en la fila de salida solo verticales
  const n = t.n, fila = t.coches[0].f;
  for (let k = 0; k < 30; k++) {
    const o = rng.entero(2), l = rng() < (n <= 4 ? 0.2 : 0.3) ? 3 : 2, f = rng.entero(n), p = rng.entero(n - l + 1);
    if (o === 0 && f === fila) continue;
    const cel = []; let ok = true;
    for (let j = 0; j < l; j++) { const x = o === 0 ? f * n + p + j : (p + j) * n + f; if (g[x]) { ok = false; break; } cel.push(x); }
    if (!ok) continue;
    if (i === undefined) t.coches.push({ o, l, f, p }); else t.coches[i] = { o, l, f, p };
    for (const x of cel) g[x] = 2;
    return true;
  }
  return false;
}
export function inicial(n, rng, nc) { // tablero al azar con el rojo lejos de la salida (no se garantiza que tenga solución: lo decide el solucionador)
  const t = { n, coches: [{ o: 0, l: 2, f: rng.entero(n), p: rng.entero(n - 2) }], macetas: [] }, g = ocupacion(t);
  while (t.coches.length < nc + 1 && colocarCoche(t, g, rng)) {}
  return t;
}
export function ponerMacetas(t, rng, nm) { // macetas nuevas en casillas libres, nunca en la fila de salida
  t.macetas = [];
  const g = ocupacion(t); if (!g) return false;
  for (let k = 0, i = 0; i < nm && k < 80; k++) { const x = rng.entero(t.n * t.n); if (g[x] === 0 && Math.floor(x / t.n) !== t.coches[0].f) { g[x] = 1; t.macetas.push(x); i++; } }
  t.macetas.sort((a, b) => a - b);
  return true;
}
export function mutar(t, rng, pasos) { // copia con un cambio; «pasos» = solución actual: se prefiere mover los carros que ella mueve
  const n = t.n, u = rng(), c2 = { n, coches: t.coches.map((c) => ({ ...c })), macetas: t.macetas.slice() }, g = ocupacion(c2);
  if (u < 0.7 && c2.coches.length > 1) {
    let i = pasos && pasos.length && rng() < 0.6 ? pasos[rng.entero(pasos.length)][0] : 1 + rng.entero(c2.coches.length - 1);
    if (i === 0) i = 1;
    const c = c2.coches[i];
    for (let j = 0; j < c.l; j++) g[c.o === 0 ? c.f * n + c.p + j : (c.p + j) * n + c.f] = 0;
    return colocarCoche(c2, g, rng, i) ? c2 : null;
  }
  if (u < 0.8) { const r = c2.coches[0], q = rng.entero(n - 2); for (let j = 0; j < 2; j++) g[r.f * n + r.p + j] = 0; if (g[r.f * n + q] || g[r.f * n + q + 1]) return null; r.p = q; return c2; }
  if (u < 0.9) return c2.coches.length <= MAX_COCHES && colocarCoche(c2, g, rng) ? c2 : null;
  if (c2.coches.length > 3) { c2.coches.splice(1 + rng.entero(c2.coches.length - 1), 1); return c2; }
  return null;
}
export function escalar(t, rng, { objetivo, pasos, tope }) { // muta hasta llegar a «objetivo» movimientos mínimos (o se acaban los pasos)
  let r = resolver(t, tope);
  if (!r) return null;
  for (let s = 0; s < pasos && r.minimo < objetivo; s++) {
    const c2 = mutar(t, rng, r.pasos);
    if (!c2 || !ocupacion(c2)) continue;
    const r2 = resolver(c2, tope);
    if (r2 && r2.minimo >= r.minimo) { t = c2; r = r2; }
  }
  return { t, r };
}

// ----- Un nivel de la clase pedida (0 fácil, 1 medio, 2 difícil) -----
// ctx = { bancos: { n: [[], [], []] }, vistos: Set de textos ya usados, tope: nodos máximos del solucionador }
export function crearContexto(tope = 25000) { return { bancos: {}, vistos: new Set(), tope }; }
const DENSIDAD = [0.32, 0.4, 0.45];
const MAX_MACETAS = (n) => Math.floor(n / 3);   // 4→1 … 10→3
const PROB_MACETAS = 0.4;                        // «a veces» hay macetas: 4 de cada 10 niveles
export function fabricar(n, clase, rng, ctx) {
  const [lo, hi] = BANDAS[n][clase], banco = ((ctx.bancos[n] ||= [[], [], []]))[clase];
  const nm = rng() < PROB_MACETAS ? 1 + rng.entero(MAX_MACETAS(n)) : 0;
  const nc = Math.max(2, Math.round((n * n * (DENSIDAD[clase] + (n <= 5 ? 0.05 : 0))) / 2.3));
  for (let intento = 0; intento < 600; intento++) {
    let t;
    if (clase > 0 && banco.length && rng() < 0.9) { // deriva de un tablero bueno ya hecho: unos cuantos cambios y macetas nuevas
      t = banco[rng.entero(banco.length)];
      for (let j = 0, k = 3 + rng.entero(4); j < k && t; j++) t = mutar(t, rng, null);
      if (!t || !ocupacion(t) || !ponerMacetas(t, rng, nm)) continue;
    } else {
      t = inicial(n, rng, nc);
      if (!ponerMacetas(t, rng, nm)) continue;
      const e = escalar(t, rng, { objetivo: lo, pasos: 200, tope: ctx.tope });
      if (!e) continue;
      t = e.t;
    }
    const r = resolver(t, ctx.tope);
    if (!r || r.minimo < lo || r.minimo > hi) continue;
    const texto = aTexto(t);
    if (ctx.vistos.has(texto)) continue;
    ctx.vistos.add(texto);
    if (banco.length < 40) banco.push(t); else banco[rng.entero(40)] = t;
    return { texto, minimo: r.minimo };
  }
  throw new Error("fabricar: no se pudo hacer un nivel " + n + "×" + n + " de clase " + clase);
}
