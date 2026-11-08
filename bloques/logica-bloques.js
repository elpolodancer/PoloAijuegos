// Ruta: bloques/logica-bloques.js
// Reglas y generador de rondas de «Bloques de madera». No toca el DOM (se puede probar con Node).
// Tablero 8×8: un arreglo de 16 números. Los primeros 8 son las filas (el bit c de la fila r vale 1 si la casilla está ocupada);
// los otros 8 son los candados (el bit vale 1 si esa casilla ocupada tiene candado).
// Al completar una fila o columna (o varias a la vez) se limpian las casillas normales; una casilla con candado solo pierde
// el candado y se queda como bloque normal: hay que completar la línea otra vez para quitarla.
//
// Cada ronda se construye "al revés" para que SIEMPRE tenga solución: se eligen las 3 piezas colocándolas una por una
// en huecos que de verdad existen (con preferencia por los huecos donde encajan justo). Después se cuentan cuántos de los
// primeros movimientos posibles todavía permiten terminar la ronda: los demás son «trampas». La dificultad `dif` (0 a 1)
// decide qué proporción de movimientos buenos se busca (mucha al principio, poca al final).
export const N = 8;
const TODO = 255;
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Ajustes de jugabilidad (probados con jugadores simulados: un jugador razonable aguanta ~15 rondas, uno al azar ~2)
const LIMPIA = 6;       // preferencia por colocar piezas que completan líneas (mantiene el tablero respirable)
const INICIO = 22;      // cubos con los que empieza el tablero (más hasta 5 extra)
const MINIMO = 13;      // si quedan menos cubos que esto, aparecen más
const CANDIDATAS = 30;  // rondas que se prueban para quedarse con la que tenga la dificultad buscada
const FACIL = 0.9, DIFICIL = 0.15; // proporción de primeros movimientos buenos que se busca (al principio → al final)

// ----- Formas (las piezas no se giran: cada orientación es una forma distinta) -----
// «#» = cuadro. El número es el peso con el que sale ese grupo de formas.
const BASES = [
  ["#", 0.3], ["##", 1], ["###", 1], ["####", 0.9], ["#####", 0.5],
  ["#./##", 1], ["#./#./##", 1], ["###/.#.", 1], [".##/##.", 0.9], ["##/##", 1],
  ["#../#../###", 0.5], ["##/##/#.", 0.4],
];
const normalizar = (cel) => {
  const mr = Math.min(...cel.map((c) => c[0])), mc = Math.min(...cel.map((c) => c[1]));
  return cel.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rotar = (cel) => cel.map(([r, c]) => [c, -r]);
const reflejar = (cel) => cel.map(([r, c]) => [r, -c]);

export const FORMAS = [];
for (const [txt, peso] of BASES) {
  const base = [];
  txt.split("/").forEach((fila, r) => [...fila].forEach((ch, c) => { if (ch === "#") base.push([r, c]); }));
  const vistas = new Set(), grupo = [];
  for (const espejo of [false, true]) {
    let cur = espejo ? reflejar(base) : base;
    for (let k = 0; k < 4; k++) {
      const cel = normalizar(cur), clave = cel.join(";");
      if (!vistas.has(clave)) {
        vistas.add(clave);
        const h = Math.max(...cel.map((c) => c[0])) + 1, w = Math.max(...cel.map((c) => c[1])) + 1;
        const filas = Array(h).fill(0);
        for (const [r, c] of cel) filas[r] |= 1 << c;
        grupo.push({ id: FORMAS.length + grupo.length, celdas: cel, w, h, filas, n: cel.length, peso: 0 });
      }
      cur = rotar(cur);
    }
  }
  for (const f of grupo) { f.peso = peso / grupo.length; FORMAS.push(f); }
}

// ----- Tablero -----
export const tableroVacio = () => Array(2 * N).fill(0);
const bits = (v) => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
export const llenas = (t) => t.slice(0, N).reduce((s, f) => s + bits(f), 0);

export function cabe(t, f, r0, c0) {
  if (r0 < 0 || c0 < 0 || r0 + f.h > N || c0 + f.w > N) return false;
  for (let i = 0; i < f.h; i++) if (t[r0 + i] & (f.filas[i] << c0)) return false;
  return true;
}
export function hayLugar(t, f) {
  for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) if (cabe(t, f, r, c)) return true;
  return false;
}
// Pone la pieza y limpia las filas y columnas que quedaron completas (todas a la vez).
// Devuelve { t: tablero nuevo, filas: [filas completas], cols: máscara de columnas completas, lineas: cuántas, rotos: [[r, c]…] candados quitados }
export function colocar(t, f, r0, c0) {
  const x = t.slice();
  for (let i = 0; i < f.h; i++) x[r0 + i] |= f.filas[i] << c0;
  let cols = TODO;
  const filas = [];
  for (let r = 0; r < N; r++) { cols &= x[r]; if (x[r] === TODO) filas.push(r); }
  const rotos = [];
  for (let r = 0; r < N; r++) {
    const m = filas.includes(r) ? TODO : cols; // casillas de esta fila que se limpian (por la fila, por columnas o por ambas)
    if (!m) continue;
    const dur = x[N + r] & m;                  // las que tienen candado solo lo pierden
    for (let c = 0; c < N; c++) if ((dur >> c) & 1) rotos.push([r, c]);
    x[N + r] &= ~dur;
    x[r] &= ~(m & ~dur);
  }
  return { t: x, filas, cols, lineas: filas.length + bits(cols), rotos };
}

// ----- Análisis: ¿cuántos primeros movimientos siguen permitiendo terminar las 3 piezas? -----
export function analizar(t, piezas, tope = 80000) {
  let nodos = 0;
  const resolver = (tab, resto) => {
    if (!resto.length) return true;
    for (let i = 0; i < resto.length; i++) {
      const f = resto[i];
      if (i > 0 && resto.slice(0, i).includes(f)) continue;
      const otras = resto.filter((_, j) => j !== i);
      for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) {
        if (!cabe(tab, f, r, c)) continue;
        if (++nodos > tope) return true; // demasiado grande: se da por buena (solo afecta a la medida de dificultad)
        if (resolver(colocar(tab, f, r, c).t, otras)) return true;
      }
    }
    return false;
  };
  let legales = 0, buenas = 0;
  piezas.forEach((f, i) => {
    const otras = piezas.filter((_, j) => j !== i);
    for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) {
      if (!cabe(t, f, r, c)) continue;
      legales++;
      if (resolver(colocar(t, f, r, c).t, otras)) buenas++;
    }
  });
  return { legales, buenas, ratio: legales ? buenas / legales : 0 };
}

// ----- Generador -----
function contacto(t, f, r0, c0) { // cuánto «abraza» la pieza a lo que ya hay (más = encaja más justo)
  const dentro = new Set(f.celdas.map(([r, c]) => (r0 + r) * N + c0 + c));
  let s = 0;
  for (const [r, c] of f.celdas) for (const [dr, dc] of DIR) {
    const rr = r0 + r + dr, cc = c0 + c + dc;
    if (rr < 0 || cc < 0 || rr >= N || cc >= N) s += 0.5;
    else if (!dentro.has(rr * N + cc) && (t[rr] >> cc) & 1) s += 1;
  }
  return s;
}
function elegir(lista, peso, rnd) {
  let total = 0;
  for (const x of lista) total += peso(x);
  let u = rnd() * total;
  for (const x of lista) { u -= peso(x); if (u <= 0) return x; }
  return lista[lista.length - 1];
}
function construir(t, rnd, limpia = LIMPIA) {
  let tab = t;
  const ids = [];
  for (let k = 0; k < 3; k++) {
    const caben = FORMAS.filter((f) => hayLugar(tab, f));
    const f = elegir(caben, (x) => x.peso, rnd);
    const sitios = [];
    for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) if (cabe(tab, f, r, c)) sitios.push({ r, c, s: contacto(tab, f, r, c), l: colocar(tab, f, r, c).lineas });
    const s = elegir(sitios, (x) => Math.pow(x.s + 0.5, 2.2) * (1 + limpia * x.l), rnd);
    tab = colocar(tab, f, s.r, s.c).t;
    ids.push(f.id);
  }
  for (let i = 2; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}
// dif: 0 (fácil: casi cualquier sitio sirve) a 1 (difícil: casi todos los sitios son trampa)
// limpia: cuánto prefiere el generador los sitios que completan líneas (más = el tablero respira mejor; las dificultades lo ajustan)
export function generarRonda(t, dif, rnd = Math.random, limpia = LIMPIA) {
  const objetivo = FACIL + (DIFICIL - FACIL) * Math.min(1, Math.max(0, dif));
  let mejor = null;
  for (let k = 0; k < CANDIDATAS; k++) {
    const ids = construir(t, rnd, limpia);
    const a = analizar(t, ids.map((i) => FORMAS[i]));
    const d = Math.abs(a.ratio - objetivo);
    if (!mejor || d < mejor.d) mejor = { ids, d, ratio: a.ratio };
    if (d < 0.04) break;
  }
  return mejor.ids;
}

// ----- Cubos que aparecen en el tablero (sin completar ninguna línea) -----
function sembrar(t, objetivo, rnd, pCandado = 0) {
  for (let i = 0; i < 300 && llenas(t) < objetivo; i++) {
    const f = FORMAS[Math.floor(rnd() * FORMAS.length)];
    const r = Math.floor(rnd() * (N - f.h + 1)), c = Math.floor(rnd() * (N - f.w + 1));
    if (!cabe(t, f, r, c)) continue;
    const res = colocar(t, f, r, c);
    if (res.lineas) continue;
    t = res.t;
    if (rnd() < pCandado) { const [pr, pc] = f.celdas[Math.floor(rnd() * f.celdas.length)]; t[N + r + pr] |= 1 << (c + pc); }
  }
  return t;
}
// Aparece un cubo con candado en una casilla libre (nunca una que complete una línea). Devuelve el tablero nuevo
export function agregarBloqueo(t, rnd = Math.random) {
  const libres = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!((t[r] >> c) & 1)) libres.push([r, c]);
  for (let k = libres.length; k > 0; k--) {
    const j = Math.floor(rnd() * k), [r, c] = libres[j];
    libres[j] = libres[k - 1];
    const x = t.slice();
    x[r] |= 1 << c;
    let lleno = x[r] === TODO, col = true;
    for (let i = 0; i < N; i++) if (!((x[i] >> c) & 1)) col = false;
    if (lleno || col) continue;
    x[N + r] |= 1 << c;
    return x;
  }
  return t;
}
export const tableroInicial = (rnd = Math.random) => sembrar(tableroVacio(), INICIO + Math.floor(rnd() * 6), rnd);
// Tablero con un número exacto de cubos (sin candados): lo usan las dificultades y los niveles fijos (niveles-bloques.js)
export const tableroCon = (cubos, rnd = Math.random) => sembrar(tableroVacio(), cubos, rnd);
// Si quedan pocos cubos, aparecen más (así siempre hay algo que armar)
// pCandado: probabilidad de que cada pieza sembrada lleve un cubo con candado (los niveles sencillos pasan 0)
export const rellenar = (t, rnd = Math.random, pCandado = 0.12) => (llenas(t) >= MINIMO ? t : sembrar(t, MINIMO + 8 + Math.floor(rnd() * 5), rnd, pCandado));
