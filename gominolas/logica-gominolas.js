// Ruta: gominolas/logica-gominolas.js
// Reglas de «Conecta gominolas» SIN pantalla (no usa document ni Firebase). Sirve para dos cosas:
//  1) El BALANCE del juego vive aquí (tableros, dificultades, cuántas negras y movimientos por nivel/ronda):
//     juego-gominolas.js lo importa, así el bot prueba exactamente los números que ve el jugador.
//  2) El bot (bot-gominolas.mjs) juega miles de partidas con este motor, que copia las reglas de juego-gominolas.js
//     (romper, caer, negra nueva por jugada fallida, poderes: ositos de color con poder que solo se activan dentro de una cadena de su color). Si cambias una regla allá, cámbiala aquí y vuelve a correr el bot.

export const NEGRA = -1;
export const COLORES = 5;
export const MIN_CADENA = 3;
// Poderes que deja una cadena larga (en la última casilla, con el color de la cadena). Umbrales subidos de 5/7 a 7/9 para que salgan menos:
export const CADENA_HORIZONTAL = 7; // 7 o 8 gominolas → poder horizontal (rompe toda la fila)
export const CADENA_VERTICAL = 9;   // 9 o más → poder vertical (rompe toda la columna)
// Poder «color»: NO lo deja ninguna cadena; se coloca desde la tienda (50 monedas, colocarPoder). Al incluirlo en una cadena rompe TODAS las gominolas de ese color.
export const PODERES_VALIDOS = ["horizontal", "vertical", "color"];

// ---------- Balance ----------
export const TABLEROS = [
  { id: "6x8", cols: 6, filas: 8 },
  { id: "8x10", cols: 8, filas: 10 },
  { id: "10x12", cols: 10, filas: 12 },
  { id: "12x14", cols: 12, filas: 14 },
  { id: "14x16", cols: 14, filas: 16 },
];
// «penaliza»: cuántas negras nuevas aparecen cuando una jugada no elimina ninguna negra
// «holgura»: multiplica los movimientos de las rondas del modo libre (más holgura = más margen para equivocarse)
export const DIFICULTADES = {
  facil: { id: "facil", nombre: "Fácil", icono: "🙂", penaliza: 1, holgura: 1.15 },
  medio: { id: "medio", nombre: "Medio", icono: "😐", penaliza: 2, holgura: 1.0 },
  dificil: { id: "dificil", nombre: "Difícil", icono: "😈", penaliza: 3, holgura: 0.85 },
};

// Zonas proporcionales a la altura (en 8 filas dan 5 y 3, como el juego original)
export const zonaInicial = (filas) => Math.round((filas * 5) / 8); // filas de abajo donde nacen las negras
export const zonaNueva = (filas) => Math.round((filas * 3) / 8);   // filas de abajo donde aparece la negra extra

// --- Campaña (tablero 6×8, una negra por jugada fallida). Mismos números que tenía juego-gominolas.js ---
export const NEGRAS_MIN = 10, NEGRAS_MAX = 18, NEGRAS_CADA = 2;
export const NIVELES = [
  { negras: 12, movs: 25 }, { negras: 14, movs: 22 }, { negras: 16, movs: 20 }, { negras: 19, movs: 19 },
];
const MOVS_FACTOR = 1.2, MOVS_BAJA = 0.03, MOVS_FACTOR_MIN = 0.7, MOVS_EXTRA = 3;

export function negrasDelNivel(n, rng = Math.random) {
  const base = NEGRAS_MIN + Math.floor((n - 1) / NEGRAS_CADA);
  const variacion = Math.floor(rng() * 3) - 1;
  return Math.max(NEGRAS_MIN, Math.min(NEGRAS_MAX, base + variacion));
}
export function movimientosDelNivel(negras, n) {
  const factor = Math.max(MOVS_FACTOR_MIN, MOVS_FACTOR - (n - 1) * MOVS_BAJA);
  return Math.round(negras * factor) + MOVS_EXTRA;
}
export function parametrosCampana(n, rng = Math.random) {
  const fijo = NIVELES[n - 1];
  const negras = fijo ? fijo.negras : negrasDelNivel(n, rng);
  const movs = fijo ? fijo.movs : movimientosDelNivel(negras, n);
  return { cols: 6, filas: 8, negras, movs, zona: 5, zonaNueva: 3, penaliza: 1 };
}

// --- Campaña con catálogo (compartido por los 22 600 niveles): el tablero y la dificultad los da catalogo-gominolas.js ---
// Negras NUEVAS por jugada que no elimina ninguna negra = DIFICULTADES[dif].penaliza: fácil 1 · normal 2 · difícil 3.
// Negras al empezar = fracción de la zona de abajo (igual en las tres dificultades: lo que cambia es el castigo por fallar y los movimientos).
// Movimientos = negras × factor[dificultad][tablero] + extra. Los factores se calibran con el bot (node gominolas/bot-gominolas.mjs catalogo).
// Los tipos de nivel (capas, contrarreloj, jefe…) todavía no cambian los números: se calibran como un nivel clásico.
export const CAMPANA_NIVEL = {
  dens: 0.36, escalaArea: 0.2, extra: 3,
  // factor[dificultad][tablero]: calibrado con el estilo «casual» del bot (la persona típica) para que gane ≈ 90 % en Fácil, ≈ 70 % en Normal y ≈ 50 % en Difícil (con poderes a 7/9; si cambias los umbrales hay que recalibrar).
  // Los tableros chicos necesitan MÁS holgura (pocas negras = más varianza); los grandes, algo menos. Si cambias densidad, extra o la lógica, vuelve a correr el bot.
  factor: {
    facil:   { "6x8": 2.2,  "8x10": 2.2,  "10x12": 2.0,  "12x14": 2.15 },
    medio:   { "6x8": 1.9,  "8x10": 2.05, "10x12": 1.85, "12x14": 2.1 },
    dificil: { "6x8": 1.75, "8x10": 1.8,  "10x12": 1.75, "12x14": 2.45 },
  },
};
export function parametrosNivel(nv, rng = Math.random) {
  const C = CAMPANA_NIVEL, t = nv.tablero, dif = DIFICULTADES[nv.dificultad];
  const zona = zonaInicial(t.filas);
  const escala = Math.pow(48 / (t.cols * t.filas), C.escalaArea);
  const variacion = Math.floor(rng() * 3) - 1;
  const negras = Math.max(4, Math.round(zona * t.cols * C.dens * escala) + variacion);
  const movs = Math.round(negras * C.factor[dif.id][t.id]) + C.extra;
  const filasCompletas = nv.patron === "filas" ? filasDelPatron(negras, t.cols) : 0; // patrón del nivel (lo da el catálogo)
  return { cols: t.cols, filas: t.filas, negras, movs, zona, zonaNueva: zonaNueva(t.filas), penaliza: dif.penaliza, filasCompletas };
}

// --- Modo libre: rondas sin fin en el tablero y dificultad elegidos ---
// Negras = fracción de la zona de abajo (sube con las rondas hasta un tope). Movimientos = negras × factor + extra (el factor baja con las rondas).
export const LIBRE = {
  dens0: 0.30, densSube: 0.012, densMax: 0.55, escalaArea: 0.2,
  factor0: 1.7, factorBaja: 0.04, factorMin: 1.0, extra: 3,
};
export function parametrosLibre(tablero, dif, ronda, rng = Math.random) {
  const L = LIBRE;
  const zona = zonaInicial(tablero.filas);
  const escala = Math.pow(48 / (tablero.cols * tablero.filas), L.escalaArea); // tableros grandes: menos negras por casilla (partidas más cortas)
  const dens = Math.min(L.densMax, L.dens0 + (ronda - 1) * L.densSube) * escala;
  const variacion = Math.floor(rng() * 3) - 1;
  const negras = Math.max(4, Math.round(zona * tablero.cols * dens) + variacion);
  const factor = Math.max(L.factorMin, L.factor0 - (ronda - 1) * L.factorBaja) * dif.holgura;
  const movs = Math.round(negras * factor) + L.extra;
  return { cols: tablero.cols, filas: tablero.filas, negras, movs, zona, zonaNueva: zonaNueva(tablero.filas), penaliza: dif.penaliza };
}

// ---------- Azar con semilla (para repetir una prueba) ----------
export function crearRng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Motor ----------
export function vecinos(p, f, c) {
  const r = [];
  for (let df = -1; df <= 1; df++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!df && !dc) continue;
      const nf = f + df, nc = c + dc;
      if (nf >= 0 && nf < p.filas && nc >= 0 && nc < p.cols) r.push([nf, nc]);
    }
  return r;
}
// Vecinos en cruz (arriba, abajo, izquierda, derecha): los únicos que cuentan para eliminar negras.
// Las cadenas sí pueden ir en diagonal (usan «vecinos»).
export function vecinosCruz(p, f, c) {
  const r = [];
  if (f > 0) r.push([f - 1, c]);
  if (f < p.filas - 1) r.push([f + 1, c]);
  if (c > 0) r.push([f, c - 1]);
  if (c < p.cols - 1) r.push([f, c + 1]);
  return r;
}
const azar = (p) => Math.floor(p.rng() * COLORES);

export function hayJugada(p) {
  const visto = new Set();
  for (let f = 0; f < p.filas; f++)
    for (let c = 0; c < p.cols; c++) {
      const key = f * 100 + c;
      if (visto.has(key)) continue;
      const k = p.grid[f][c].k;
      if (k < 0) continue;
      let n = 0;
      const pila = [[f, c]];
      visto.add(key);
      while (pila.length) {
        const [a, b] = pila.pop();
        n++;
        for (const [na, nb] of vecinos(p, a, b))
          if (!visto.has(na * 100 + nb) && p.grid[na][nb].k === k) { visto.add(na * 100 + nb); pila.push([na, nb]); }
      }
      if (n >= MIN_CADENA) return true;
    }
  return false;
}

export function barajar(p) {
  const ks = [];
  p.grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) ks.push(g.k); })); // los ositos con poder no se revuelven
  let intentos = 0;
  do {
    for (let i = ks.length - 1; i > 0; i--) {
      const j = Math.floor(p.rng() * (i + 1));
      [ks[i], ks[j]] = [ks[j], ks[i]];
    }
    let i = 0;
    p.grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) g.k = ks[i++]; }));
    intentos++;
  } while (!hayJugada(p) && intentos < 40);
  if (!hayJugada(p)) p.grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) g.k = azar(p); }));
}

export function contarNegras(p) {
  let n = 0;
  for (const fila of p.grid) for (const g of fila) if (g.k === NEGRA) n++;
  return n;
}

// Patrón «filas completas»: cuántas filas enteras de negras lleva el nivel (el resto de las negras va al azar). Mismo total de negras que un nivel normal.
export const filasDelPatron = (negras, cols) => Math.max(1, Math.min(3, Math.floor(negras / cols)));

// Pone «cant» negras en la zona de abajo. Con filasCompletas > 0, esa cantidad de filas de la zona quedan TODAS negras (nunca dos pegadas)
// y las negras que sobran se reparten al azar en el resto de la zona. El total siempre es «cant».
function colocarNegras(p, cant, filasCompletas = 0) {
  const desde = Math.max(0, p.filas - p.zona);
  const mezclar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(p.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const filasNegras = [];
  const k = Math.min(filasCompletas, Math.floor(cant / p.cols));
  if (k > 0) {
    const cand = [];
    for (let f = p.filas - 1; f >= desde; f--) cand.push(f);
    for (const f of mezclar(cand)) {
      if (filasNegras.length >= k) break;
      if (filasNegras.every((x) => Math.abs(x - f) > 1)) filasNegras.push(f);
    }
    for (const f of filasNegras) for (let c = 0; c < p.cols; c++) p.grid[f][c].k = NEGRA;
  }
  const celdas = [];
  for (let f = p.filas - 1; f >= desde; f--) if (!filasNegras.includes(f)) for (let c = 0; c < p.cols; c++) celdas.push([f, c]);
  mezclar(celdas).slice(0, cant - filasNegras.length * p.cols).forEach(([f, c]) => { p.grid[f][c].k = NEGRA; });
  let intentos = 0;
  while (!hayJugada(p) && intentos++ < 50) barajar(p);
}

// params: { cols, filas, negras, movs, zona, zonaNueva, penaliza, filasCompletas (opcional) }
export function crearPartida(params, rng = Math.random) {
  const p = { ...params, rng, movsIni: params.movs, grid: [], estado: "jugando", fallos: 0 };
  for (let f = 0; f < p.filas; f++) {
    p.grid.push([]);
    for (let c = 0; c < p.cols; c++) p.grid[f].push({ k: azar(p) });
  }
  let i = 0;
  while (!hayJugada(p) && i++ < 50) barajar(p);
  colocarNegras(p, params.negras, params.filasCompletas || 0);
  return p;
}

function caer(p) {
  for (let c = 0; c < p.cols; c++) {
    let w = p.filas - 1;
    for (let f = p.filas - 1; f >= 0; f--) {
      if (p.grid[f][c]) {
        if (f !== w) { p.grid[w][c] = p.grid[f][c]; p.grid[f][c] = null; }
        w--;
      }
    }
    for (let f = w; f >= 0; f--) p.grid[f][c] = { k: azar(p) };
  }
}

function nuevaNegra(p) {
  const cand = [];
  const juntar = (desde, hasta) => {
    for (let f = desde; f >= hasta; f--)
      for (let c = 0; c < p.cols; c++) if (p.grid[f][c].k >= 0 && !p.grid[f][c].p) cand.push([f, c]);
  };
  juntar(p.filas - 1, Math.max(0, p.filas - p.zonaNueva));
  if (!cand.length) juntar(p.filas - p.zonaNueva - 1, 0);
  if (!cand.length) return;
  const [f, c] = cand[Math.floor(p.rng() * cand.length)];
  p.grid[f][c].k = NEGRA;
  delete p.grid[f][c].p;
}

// Celdas que rompen los poderes de la cadena (fila y/o columna de la última casilla)
export function lineasDePoderes(p, cad, ult) {
  const lista = [];
  const tipos = new Set(cad.map(({ f, c }) => p.grid[f][c].p).filter(Boolean));
  if (tipos.has("horizontal")) for (let c = 0; c < p.cols; c++) lista.push([ult.f, c]);
  if (tipos.has("vertical")) for (let f = 0; f < p.filas; f++) lista.push([f, ult.c]);
  if (tipos.has("color")) { // todas las gominolas del color de la cadena (las negras no tienen color)
    const kc = p.grid[ult.f][ult.c].k;
    for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) if (p.grid[f][c] && p.grid[f][c].k === kc) lista.push([f, c]);
  }
  return lista;
}

// Boost de la tienda: pone un poder en una gominola de color que no tenga poder. Devuelve true si lo puso (si no, no se cobra).
export function colocarPoder(p, f, c, poder = "color") {
  const g = p.grid[f] && p.grid[f][c];
  if (!g || g.k < 0 || g.p || !PODERES_VALIDOS.includes(poder)) return false;
  g.p = poder;
  return true;
}

// Conjunto de celdas que se romperían (lista + negras pegadas, en cruz, a una gominola rota). No modifica nada.
export function conjuntoRoto(p, lista) {
  const quitar = new Set();
  lista.forEach(([f, c]) => { if (p.grid[f][c]) quitar.add(f * 100 + c); });
  const pegadas = [];
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    if (p.grid[f][c].k === NEGRA) return;
    for (const [nf, nc] of vecinosCruz(p, f, c)) if (p.grid[nf][nc].k === NEGRA) pegadas.push(nf * 100 + nc);
  });
  pegadas.forEach((k) => quitar.add(k));
  return quitar;
}

function romper(p, lista) {
  const quitar = conjuntoRoto(p, lista);
  let negras = 0;
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    if (p.grid[f][c].k === NEGRA) negras++;
    p.grid[f][c] = null;
  });
  return negras;
}

function cerrarJugada(p, negrasQuitadas) {
  p.movs--;
  caer(p);
  if (contarNegras(p) === 0) { p.estado = "gano"; return; }
  if (!negrasQuitadas) { p.fallos++; for (let i = 0; i < p.penaliza; i++) nuevaNegra(p); }
  if (p.movs <= 0) { p.estado = "perdio"; return; }
  if (!hayJugada(p)) barajar(p);
}

// ¿La cadena es legal? (misma regla que el arrastre del juego: 3 o más ositos del mismo color, vecinos y sin repetir;
// un osito con poder es un osito de su color, y tocarlo solo no hace nada)
export function cadenaValida(p, cad) {
  if (cad.length < MIN_CADENA) return false;
  let kc = null;
  const usados = new Set();
  for (let i = 0; i < cad.length; i++) {
    const q = cad[i], g = p.grid[q.f][q.c];
    if (!g || g.k === NEGRA || usados.has(q.f * 100 + q.c)) return false;
    usados.add(q.f * 100 + q.c);
    if (i > 0 && Math.max(Math.abs(q.f - cad[i - 1].f), Math.abs(q.c - cad[i - 1].c)) !== 1) return false;
    if (kc === null) kc = g.k; else if (g.k !== kc) return false;
  }
  return true;
}

export function jugarCadena(p, cad) {
  const n = cad.length, ult = cad[n - 1];
  const colorCadena = p.grid[ult.f][ult.c].k; // el poder nuevo conserva el color de la cadena
  const lineas = lineasDePoderes(p, cad, ult);
  const negras = romper(p, cad.map(({ f, c }) => [f, c]).concat(lineas));
  const poder = n >= CADENA_VERTICAL ? "vertical" : n >= CADENA_HORIZONTAL ? "horizontal" : null;
  if (poder) p.grid[ult.f][ult.c] = { k: colorCadena, p: poder };
  cerrarJugada(p, negras);
  return negras;
}
