// Ruta: atasco/logica-atasco.js
// Lógica de «Atasco» SIN pantalla (no usa document): la comparten el juego, el generador de niveles y el verificador.
// REGLAS: tablero n×n. Los carros miden 2 o 3 casillas y solo se deslizan a lo largo de su eje (horizontal o vertical),
// cualquier distancia = 1 MOVIMIENTO. Las macetas (#) ocupan una casilla y no se mueven. El carro rojo (R, siempre de 2, horizontal)
// sale por el borde DERECHO de su fila: ahí no hay macetas ni otros carros horizontales. Gana al llegar su frente a la última columna.
// TEXTO DE UN TABLERO: n×n caracteres, fila por fila: «.» libre, «#» maceta, «R» carro rojo, «a»…«x» los demás carros (una letra por carro).
// Todo es determinista (solo enteros): el mismo tablero da siempre la misma solución, en cualquier navegador o en Node.

export const TAMANOS_NIVELES = [4, 5, 6, 7, 8, 9, 10]; // tableros de los niveles fijos (el modo libre llega hasta 13×13)
export const MAX_COCHES = 24;
const LETRAS = "abcdefghijklmnopqrstuvwx";

// Generador pseudoaleatorio con semilla (mulberry32): mismo número → misma secuencia.
export function crearRng(semilla) {
  let a = semilla >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.entero = (n) => Math.floor(f() * n);
  return f;
}

// ----- Tablero ↔ texto -----
// tablero = { n, coches: [{ o: 0 horizontal | 1 vertical, l: largo, f: fila (o=0) o columna (o=1), p: columna (o=0) o fila (o=1) del inicio }], macetas: [índice de casilla] }
// coches[0] es SIEMPRE el rojo.
export function aTexto(t) {
  const g = new Array(t.n * t.n).fill(".");
  for (const m of t.macetas) g[m] = "#";
  t.coches.forEach((c, i) => {
    for (let k = 0; k < c.l; k++) g[c.o === 0 ? c.f * t.n + c.p + k : (c.p + k) * t.n + c.f] = i === 0 ? "R" : LETRAS[i - 1];
  });
  return g.join("");
}
export function deTexto(s) {
  const n = Math.round(Math.sqrt(s.length));
  if (n * n !== s.length) throw new RangeError("tablero: el texto no es cuadrado");
  const por = new Map(), macetas = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "#") macetas.push(i);
    else if (ch !== ".") { if (!por.has(ch)) por.set(ch, []); por.get(ch).push(i); }
  }
  const coche = (cs) => {
    const o = cs.length > 1 && cs[1] === cs[0] + 1 ? 0 : 1;
    return o === 0 ? { o, l: cs.length, f: Math.floor(cs[0] / n), p: cs[0] % n } : { o, l: cs.length, f: cs[0] % n, p: Math.floor(cs[0] / n) };
  };
  if (!por.has("R")) throw new RangeError("tablero: falta el carro rojo");
  const coches = [coche(por.get("R"))];
  for (const ch of [...por.keys()].filter((x) => x !== "R").sort()) coches.push(coche(por.get(ch)));
  return { n, coches, macetas };
}

// ----- Solucionador por BACKTRACKING (IDA*: profundidad creciente + poda + tabla de transposición) -----
// Devuelve { minimo, pasos: [[coche, nuevaPos], …] } con la solución MÁS CORTA, o null si no tiene solución o se pasó del «tope» de nodos
// (el tope es de nodos, no de tiempo, para que el resultado sea igual en cualquier computadora).
export function resolver(t, tope = 150000) {
  const n = t.n, cs = t.coches, k = cs.length, g = new Uint8Array(n * n), pos = new Int32Array(k);
  for (const m of t.macetas) g[m] = 1;
  const idx = (i, q) => (cs[i].o === 0 ? cs[i].f * n + q : q * n + cs[i].f);
  const paso = cs.map((c) => (c.o === 0 ? 1 : n));
  const poner = (i, p, v) => { const c = cs[i]; for (let j = 0, x = idx(i, p); j < c.l; j++, x += paso[i]) g[x] = v; };
  for (let i = 0; i < k; i++) { pos[i] = cs[i].p; poner(i, pos[i], 2); }
  // hash de Zobrist incremental (dos enteros de 32 bits juntos en un número)
  const r = crearRng(987654321), Z1 = new Int32Array(k * n), Z2 = new Int32Array(k * n);
  for (let i = 0; i < k * n; i++) { Z1[i] = (r() * 4294967296) | 0; Z2[i] = (r() * 4294967296) | 0; }
  let h1 = 0, h2 = 0;
  for (let i = 0; i < k; i++) { h1 ^= Z1[i * n + pos[i]]; h2 ^= Z2[i * n + pos[i]]; }
  const fr = cs[0].f;
  const cota = () => { // mínimo de movimientos que faltan: 1 del rojo + 1 por cada carro vertical que tapa su camino
    if (pos[0] + 2 >= n) return 0;
    let b = 1;
    for (let i = 1; i < k; i++) { const c = cs[i]; if (c.o === 1 && c.f > pos[0] + 1 && pos[i] <= fr && fr < pos[i] + c.l) b++; }
    return b;
  };
  let nodos = 0, limite = 0, sig = 0, agotado = false, tabla = new Map();
  const camino = [];
  function dfs(gg) {
    const h = cota();
    if (h === 0) return true;
    if (gg + h > limite) { if (gg + h < sig) sig = gg + h; return false; }
    if (++nodos > tope) { agotado = true; return false; }
    const clave = (h1 >>> 0) + (h2 & 0x1fffff) * 4294967296, vista = tabla.get(clave);
    if (vista !== undefined && vista <= gg) return false;
    tabla.set(clave, gg);
    for (let i = 0; i < k; i++) {
      const c = cs[i], p = pos[i], l = c.l;
      for (let sentido = -1; sentido <= 1; sentido += 2) {
        let q = sentido < 0 ? p - 1 : p + l;
        while (q >= 0 && q < n && g[idx(i, q)] === 0) {
          const np = sentido < 0 ? q : q - l + 1;
          poner(i, p, 0); poner(i, np, 2);
          const a1 = h1, a2 = h2;
          h1 ^= Z1[i * n + p] ^ Z1[i * n + np]; h2 ^= Z2[i * n + p] ^ Z2[i * n + np];
          pos[i] = np; camino.push(i, np);
          const ok = dfs(gg + 1);
          if (ok) return true;
          camino.length -= 2; pos[i] = p; h1 = a1; h2 = a2;
          poner(i, np, 0); poner(i, p, 2);
          if (agotado) return false;
          q += sentido;
        }
      }
    }
    return false;
  }
  limite = cota();
  if (limite === 0) return { minimo: 0, pasos: [] };
  for (;;) {
    sig = Infinity; tabla = new Map();
    if (dfs(0)) { const pasos = []; for (let j = 0; j < camino.length; j += 2) pasos.push([camino[j], camino[j + 1]]); return { minimo: limite, pasos }; }
    if (agotado || sig === Infinity) return null;
    limite = sig;
  }
}

// ----- Plan de los niveles fijos: 226 etapas (32 estados + 194 países) de 100 niveles = 22 600 -----
export const ETAPAS_TOTAL = 226, NIVELES_ETAPA = 100;
export const CLASES = ["fácil", "medio", "difícil"]; // índice 0, 1, 2
// Movimientos MÍNIMOS que exige cada clase, por tamaño: [fácil [mín, máx], medio [mín, máx], difícil [mín, máx]].
// El 4×4 tiene menos espacio, por eso sus umbrales son menores; el 9×9 y el 10×10 piden un poco menos porque el bot tarda mucho más en ellos.
export const BANDAS = {
  4: [[2, 3], [4, 5], [6, 99]], 5: [[3, 5], [6, 8], [9, 99]], 6: [[3, 5], [6, 8], [9, 99]], 7: [[3, 5], [6, 8], [9, 99]],
  8: [[3, 5], [6, 8], [9, 99]], 9: [[3, 5], [6, 7], [8, 99]], 10: [[3, 5], [6, 7], [8, 99]],
};
export function claseDeMinimo(n, minimo) {
  const b = BANDAS[n];
  if (b) for (let c = 0; c < 3; c++) if (minimo >= b[c][0] && minimo <= b[c][1]) return c;
  return -1;
}
// Cuántos niveles de cada clase tiene la etapa s (0..225): de 50/40/10 % en la primera a 25/40/35 % en la última, subiendo parejo.
export function mezclaEtapa(s) { const d = Math.round(10 + (25 * s) / (ETAPAS_TOTAL - 1)); return [60 - d, 40, d]; }
// Cuántos niveles de cada tamaño (4×4 … 10×10): 100 = 7 × 14 + 2; los dos tamaños que reciben el nivel de más rotan de etapa en etapa.
export function tamanosEtapa(s) { const k = TAMANOS_NIVELES.length; return TAMANOS_NIVELES.map((_, i) => 14 + ((((i - 2 * s) % k) + k) % k < 2 ? 1 : 0)); }
// Los 100 niveles de la etapa s en orden: [{ n: tamaño, clase }]. Primero los 4×4, luego los 5×5… y, dentro de cada tamaño, de fácil a difícil.
// Las clases se reparten parejo entre los tamaños (cada tamaño recibe más o menos la misma proporción).
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
