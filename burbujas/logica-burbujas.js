// Ruta: burbujas/logica-burbujas.js
// Reglas de «Burbujas» SIN pantalla (no usa document, ni audio, ni Firebase). Las comparten el juego (juego-burbujas.js) y el bot de
// backtracking (bot-burbujas.mjs): así el bot prueba exactamente las mismas reglas que juega la persona.
//
// Un tablero T es un objeto simple: { grid, par, ncol, tirosPorFila, probPiedra, tiros, racha, actual, siguiente, rngCola, rngTecho }
//   grid[r][c]   null = vacío · 0..5 = color · PIEDRA (-1) = piedra   (los especiales «bomba», «arcoiris» y «rayo» solo viajan en la cola)
//   rngCola / rngTecho  generadores con semilla (fabricados con crearRng): el mismo nivel sale igual para todos y se puede copiar el tablero
//
// Niveles del mapa:  nivelFijo(n, total, dificultad)   → siempre el mismo tablero y la misma cola de burbujas para el nivel n
// Modo libre:        nivelLibre(idDificultad, ronda)   → tablero al azar (Math.random)
// Un tiro:           tirar(T, angulo) / (el juego, que anima, usa sacarDeCola + pasoDisparo + resolverTiro)

// ---------- Medidas y reglas ----------
export const R = 22;                    // radio de cada burbuja
export const COLS = 10;                 // burbujas por fila
export const ALTO = 760;                // alto lógico del lienzo
export const ANCHO = 2 * R * (COLS + 0.5);
export const RH = R * Math.sqrt(3);     // alto entre filas
export const LIMITE_FILA = 13;          // si una burbuja llega a esta fila, pierdes
export const VELOCIDAD = 17;            // píxeles por cuadro del disparo
export const MIN_GRADOS = 12;           // ángulo mínimo respecto a la horizontal
export const TIRADOR = { x: ANCHO / 2, y: ALTO - 70 };
export const PUNTOS_BASE = 10;          // por burbuja reventada
export const PUNTOS_CAIDA = 30;         // por burbuja que cae
export const MAX_FILAS_INICIO = 10;     // filas máximas con las que puede empezar un tablero
export const PIEDRA = -1;               // valor de una piedra en la rejilla (los colores son 0..5)
export const NUM_COLORES = 6;

export const REVENTAR_PARA_BOMBA = 6;   // reventar 6 o más de un tiro → bomba
export const CAIDAS_PARA_ARCOIRIS = 4;  // hacer caer 4 o más de un tiro → arcoíris
export const RACHA_PARA_RAYO = 3;       // 3 tiros seguidos que revientan → rayo
export const RADIO_BOMBA = 2;           // alcance de la bomba (en burbujas)

// Formas de los niveles: «#» burbuja, «.» vacío. Cada fila mide COLS (10) y debe quedar pegada al techo.
// NO cambiar el orden ni quitar formas después de publicar: el nivel n elige su forma con la semilla de n.
export const FORMAS = [
  { nombre: "Triángulo", filas: ["##########", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Corazón", filas: [".###..###.", "##########", "##########", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Rombo", filas: ["....##....", "...####...", "..######..", ".########.", "..######..", "...####...", "....##...."] },
  { nombre: "Cortinas", filas: ["##.##.##.#", "##.##.##.#", "##.##.##.#", "##.##.##.#", "##########"] },
  { nombre: "Cara sonriente", filas: ["##########", "##########", "##..##..##", "##########", "##########", "##.####.##", "###....###"] },
  { nombre: "Ondas", filas: ["##########", "##########", "#.#.#.#.#.", "##########", "#.#.#.#.#.", "#.#.#.#.#."] },
  { nombre: "Castillo", filas: ["#.##..##.#", "##########", "##########", "##########", ".###..###."] },
  { nombre: "Reloj de arena", filas: ["##########", ".########.", "..######..", "...####...", "....##....", "...####...", "..######..", ".########.", "##########"] },
];

// ---------- Modo libre: las 5 dificultades estándar ----------
// ncol = colores · tiros = tiros sin reventar para que baje el techo · piedras = piedras al empezar · extra = filas llenas extra arriba
export const DIFICULTADES_LIBRE = [
  { id: "muyfacil", nombre: "Muy fácil", clase: "b-verde", ncol: 3, tiros: 6, piedras: 0, extra: 0, probPiedra: 0 },
  { id: "facil", nombre: "Fácil", clase: "b-azul", ncol: 4, tiros: 5, piedras: 0, extra: 1, probPiedra: 0 },
  { id: "normal", nombre: "Normal", clase: "b-morado", ncol: 5, tiros: 5, piedras: 4, extra: 1, probPiedra: 0.04 },
  { id: "dificil", nombre: "Difícil", clase: "b-oro", ncol: 6, tiros: 4, piedras: 8, extra: 2, probPiedra: 0.06 },
  { id: "experto", nombre: "Experto", clase: "b-rojo", ncol: 6, tiros: 3, piedras: 14, extra: 3, probPiedra: 0.08 },
];

// ---------- Números al azar con semilla (se pueden copiar: .estado) ----------
export function crearRng(semilla, estado) {
  let a = (estado === undefined ? semilla : estado) >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.estado = () => a;
  return f;
}
const copiarRng = (f) => (f && f.estado ? crearRng(0, f.estado()) : f);

// ---------- Rejilla hexagonal ----------
export const posX = (T, r, c) => R + c * 2 * R + (((r + T.par) & 1) ? R : 0);
export const posY = (r) => R + r * RH;

export function vecinos(T, r, c) {
  const desp = (r + T.par) & 1;
  const dc = desp ? [0, 1] : [-1, 0];
  const lista = [[r, c - 1], [r, c + 1]];
  for (const dr of [-1, 1]) for (const d of dc) lista.push([r + dr, c + d]);
  return lista.filter(([rr, cc]) => rr >= 0 && rr < T.grid.length && cc >= 0 && cc < COLS);
}

export function coloresPresentes(T) {
  const s = new Set();
  for (const fila of T.grid) for (const v of fila) if (v !== null && v >= 0) s.add(v);
  return [...s];
}
export const hayColores = (T) => T.grid.some((f) => f.some((v) => v !== null && v >= 0));
export function contarColores(T) {
  let n = 0;
  for (const f of T.grid) for (const v of f) if (v !== null && v >= 0) n++;
  return n;
}
export function colorAlAzar(T) {
  const p = coloresPresentes(T);
  return p.length ? p[Math.floor(T.rngCola() * p.length)] : 0;
}

export function filaNueva(T) {
  return Array.from({ length: COLS }, () =>
    T.probPiedra > 0 && T.rngTecho() < T.probPiedra ? PIEDRA : Math.floor(T.rngTecho() * T.ncol));
}

// ---------- Construcción de tableros ----------
function construir({ forma, extra, ncol, piedras, tiros, probPiedra, rngNivel, rngCola, rngTecho, nombre }) {
  const filas = [...Array(extra).fill("#".repeat(COLS)), ...forma.filas];
  const grid = filas.map((s) => [...s].map((ch) => (ch === "#" ? Math.floor(rngNivel() * ncol) : null)));
  if (piedras > 0) {
    const celdas = [];
    grid.forEach((fila, r) => fila.forEach((v, c) => { if (v !== null) celdas.push([r, c]); }));
    for (let i = celdas.length - 1; i > 0; i--) { const j = Math.floor(rngNivel() * (i + 1)); [celdas[i], celdas[j]] = [celdas[j], celdas[i]]; }
    const n = Math.min(piedras, Math.floor(celdas.length / 3));
    celdas.slice(0, n).forEach(([r, c]) => { grid[r][c] = PIEDRA; });
  }
  const T = { grid, par: 0, ncol, tirosPorFila: tiros, probPiedra, tiros: 0, racha: 0, actual: 0, siguiente: 0, rngCola, rngTecho, nombre };
  soltarFlotantes(T);   // por si alguna forma o piedra quedó sin tocar el techo
  T.actual = colorAlAzar(T); T.siguiente = colorAlAzar(T);
  return T;
}

// Parámetros del nivel n del mapa. «dificultad» = "facil" | "normal" | "dificil" (compartido/dificultad-niveles.js).
// p = avance en el mapa (0 al principio, 1 en el último nivel). NO cambiar después de publicar: cambiaría niveles ya jugados.
export function parametrosNivel(n, total, dificultad) {
  const p = total > 1 ? Math.min(1, Math.max(0, (n - 1) / (total - 1))) : 0;
  if (dificultad === "facil") {
    return { ncol: 3 + (p > 0.35) + (p > 0.8), tiros: p > 0.6 ? 5 : 6, piedras: p > 0.2 ? Math.min(4, 2 + Math.floor(p * 4)) : 0, extra: p > 0.3 ? 1 : 0, probPiedra: 0 };
  }
  if (dificultad === "dificil") {
    return { ncol: 5 + (p > 0.5), tiros: p > 0.7 ? 3 : 4, piedras: Math.min(16, 4 + Math.floor(p * 12)), extra: Math.min(4, 2 + Math.floor(p * 2)), probPiedra: 0.08 };
  }
  return { ncol: 4 + (p > 0.4) + (p > 0.85), tiros: p > 0.6 ? 4 : 5, piedras: p > 0.05 ? Math.min(8, Math.floor(p * 10)) : 0, extra: p > 0.5 ? 2 : 1, probPiedra: p > 0.2 ? 0.04 : 0 };
}

// Nivel n del mapa. opciones.semillaCola: otra cola de burbujas (el bot la usa para probar con varias «suertes»; 0 = la real del juego)
export function nivelFijo(n, total, dificultad, opciones = {}) {
  const sem = Math.imul(n >>> 0, 2654435761) >>> 0;
  const rngNivel = crearRng(sem ^ 0x1234abcd);
  const par = parametrosNivel(n, total, dificultad);
  const forma = FORMAS[Math.floor(rngNivel() * FORMAS.length)];
  const extra = Math.max(0, Math.min(par.extra, MAX_FILAS_INICIO - forma.filas.length));
  const sc = (opciones.semillaCola || 0) >>> 0;
  const T = construir({ ...par, forma, extra, rngNivel, rngCola: crearRng(sem ^ 0xa5a5a5a5 ^ Math.imul(sc, 40503)), rngTecho: crearRng(sem ^ 0x5a5a5a5a), nombre: forma.nombre });
  T.nivel = n; T.dificultad = dificultad;
  return T;
}

// Modo libre: tablero al azar. ronda = 1, 2, 3… (cada ronda limpia agrega una fila extra cada 2 rondas, hasta 5)
export function nivelLibre(idDificultad, ronda = 1, azar = Math.random) {
  const d = DIFICULTADES_LIBRE.find((x) => x.id === idDificultad) || DIFICULTADES_LIBRE[2];
  const forma = FORMAS[Math.floor(azar() * FORMAS.length)];
  const extra = Math.max(0, Math.min(d.extra + Math.floor((ronda - 1) / 2), 5, MAX_FILAS_INICIO - forma.filas.length));
  // Con semilla (el bot) la cola y el techo llevan su propio generador, para poder copiar el tablero; con Math.random no hace falta
  const aparte = () => (azar.estado ? crearRng(Math.floor(azar() * 4294967296)) : azar);
  const T = construir({ forma, extra, ncol: d.ncol, piedras: d.piedras, tiros: d.tiros, probPiedra: d.probPiedra, rngNivel: azar, rngCola: aparte(), rngTecho: aparte(), nombre: forma.nombre });
  T.dificultad = d.id;
  return T;
}

// Copia independiente (para probar tiros sin tocar el tablero original)
export function copiarTablero(T) {
  return { ...T, grid: T.grid.map((f) => f.slice()), rngCola: copiarRng(T.rngCola), rngTecho: copiarRng(T.rngTecho) };
}
export function claveTablero(T) {
  return T.grid.map((f) => f.map((v) => (v === null ? "." : v === PIEDRA ? "p" : v)).join("")).join("|") +
    "#" + T.par + T.tiros + T.racha + "#" + T.actual + "," + T.siguiente +
    "#" + (T.rngCola.estado ? T.rngCola.estado() : 0) + "," + (T.rngTecho.estado ? T.rngTecho.estado() : 0);
}

// ---------- Física del disparo ----------
export function chocaConTablero(T, x, y, deslizar = 0) {
  if (y <= R + deslizar) return true;
  for (let r = 0; r < T.grid.length; r++) {
    const yy = posY(r) - deslizar;
    if (Math.abs(yy - y) > 2 * R) continue;
    for (let c = 0; c < COLS; c++) {
      if (T.grid[r][c] === null) continue;
      const dx = posX(T, r, c) - x, dy = yy - y;
      if (dx * dx + dy * dy < (2 * R * 0.9) ** 2) return true;
    }
  }
  return false;
}
// Un cuadro del disparo b = {x, y, vx, vy} (dos subpasos para que no atraviese burbujas). true = chocó
export function pasoDisparo(T, b, deslizar = 0) {
  for (let i = 0; i < 2; i++) {
    b.x += b.vx / 2; b.y += b.vy / 2;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > ANCHO - R) { b.x = ANCHO - R; b.vx = -Math.abs(b.vx); }
    if (chocaConTablero(T, b.x, b.y, deslizar)) return true;
  }
  return false;
}
export const nuevoDisparo = (angulo, color) => ({ x: TIRADOR.x, y: TIRADOR.y, vx: Math.cos(angulo) * VELOCIDAD, vy: -Math.sin(angulo) * VELOCIDAD, color });
// Dónde se detiene un disparo con este ángulo (sin animar)
export function simular(T, angulo) {
  const b = nuevoDisparo(angulo, 0);
  for (let i = 0; i < 4000; i++) if (pasoDisparo(T, b)) break;
  return { x: b.x, y: b.y };
}
export const limitarAngulo = (a) => { const m = (MIN_GRADOS * Math.PI) / 180; return Math.max(m, Math.min(Math.PI - m, a)); };

// Celda vacía más cercana a (x, y). No modifica el tablero.
export function celdaLibre(T, x, y) {
  const r0 = Math.round((y - R) / RH);
  let mejor = null, mejorD = Infinity;
  for (let rr = Math.max(0, r0 - 1); rr <= r0 + 1; rr++) {
    for (let c = 0; c < COLS; c++) {
      if (rr < T.grid.length && T.grid[rr][c] !== null) continue;
      const d = (posX(T, rr, c) - x) ** 2 + (posY(rr) - y) ** 2;
      if (d < mejorD) { mejorD = d; mejor = [rr, c]; }
    }
  }
  return mejor;
}

// ---------- Reventar, soltar, especiales ----------
function quitar(T, celdas) {
  const hechas = [];
  for (const [r, c] of celdas) {
    if (T.grid[r][c] === null) continue;
    hechas.push({ r, c, v: T.grid[r][c], x: posX(T, r, c), y: posY(r) });
    T.grid[r][c] = null;
  }
  return hechas;
}
function grupo(T, r, c) {
  const color = T.grid[r][c];
  const vistos = new Set([r + "," + c]);
  const pila = [[r, c]];
  while (pila.length) {
    const [rr, cc] = pila.pop();
    for (const [vr, vc] of vecinos(T, rr, cc)) {
      const k = vr + "," + vc;
      if (!vistos.has(k) && T.grid[vr][vc] === color) { vistos.add(k); pila.push([vr, vc]); }
    }
  }
  return [...vistos].map((k) => k.split(",").map(Number));
}
export function areaBomba(T, r, c) {
  const marcadas = new Set([r + "," + c]);
  let borde = [[r, c]];
  for (let i = 0; i < RADIO_BOMBA; i++) {
    const nuevo = [];
    for (const [rr, cc] of borde) for (const [vr, vc] of vecinos(T, rr, cc)) {
      const k = vr + "," + vc;
      if (!marcadas.has(k)) { marcadas.add(k); nuevo.push([vr, vc]); }
    }
    borde = nuevo;
  }
  return [...marcadas].map((k) => k.split(",").map(Number));
}
function celdasEspecial(T, tipo, r, c) {
  const celdas = [];
  if (tipo === "bomba") return areaBomba(T, r, c);
  if (tipo === "rayo") { for (let cc = 0; cc < COLS; cc++) celdas.push([r, cc]); return celdas; }
  // arcoíris: borra todas las burbujas del color que toca (o uno al azar si no toca ninguna)
  const cuenta = {};
  for (const [vr, vc] of vecinos(T, r, c)) {
    const v = T.grid[vr][vc];
    if (v !== null && v >= 0) cuenta[v] = (cuenta[v] || 0) + 1;
  }
  const claves = Object.keys(cuenta);
  const objetivo = claves.length ? Number(claves.sort((a, b) => cuenta[b] - cuenta[a] || a - b)[0]) : colorAlAzar(T);
  for (let rr = 0; rr < T.grid.length; rr++) for (let cc = 0; cc < COLS; cc++) if (T.grid[rr][cc] === objetivo) celdas.push([rr, cc]);
  return celdas;
}
// Quita lo que no cuelga del techo. Devuelve las burbujas que caen: [{ r, c, v, x, y }] (x, y = su lugar en pantalla al caer)
export function soltarFlotantes(T) {
  const vistos = new Set();
  const pila = [];
  for (let c = 0; c < COLS; c++) if (T.grid[0][c] !== null) { vistos.add("0," + c); pila.push([0, c]); }
  while (pila.length) {
    const [r, c] = pila.pop();
    for (const [vr, vc] of vecinos(T, r, c)) {
      const k = vr + "," + vc;
      if (!vistos.has(k) && T.grid[vr][vc] !== null) { vistos.add(k); pila.push([vr, vc]); }
    }
  }
  const caidas = [];
  for (let r = 0; r < T.grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (T.grid[r][c] !== null && !vistos.has(r + "," + c)) { caidas.push({ r, c, v: T.grid[r][c], x: posX(T, r, c), y: posY(r) }); T.grid[r][c] = null; }
  }
  return caidas;
}
function recortarFilasVacias(T) {
  while (T.grid.length > 1 && T.grid[T.grid.length - 1].every((v) => v === null)) T.grid.pop();
}
export function bajarTecho(T) {
  T.grid.unshift(filaNueva(T));
  T.par ^= 1;
}
function darEspecial(T, tipo) {
  if (typeof T.actual === "string") T.siguiente = tipo;       // ya llevas uno: este queda de «siguiente»
  else { T.siguiente = T.actual; T.actual = tipo; }
}

// ---------- Un tiro ----------
// Saca la burbuja que se dispara y acomoda la cola (la siguiente nace con los colores que hay ahora en el tablero). Devuelve el color.
export function sacarDeCola(T) {
  const color = T.actual;
  T.actual = T.siguiente;
  T.siguiente = colorAlAzar(T);
  return color;
}
export function cambiarCola(T) { [T.actual, T.siguiente] = [T.siguiente, T.actual]; }

// Qué pasa cuando la burbuja «color» se detiene en (x, y). Devuelve el resultado del tiro:
//   { r, c, esEspecial, n (reventadas), cayeron, quitadas[], caidas[], premio (tipo o null), bajo (bajó el techo), gano, perdio }
// Los puntos los calcula el juego: reventadas = n·PUNTOS_BASE (+ bono si no es especial), caídas = cayeron·PUNTOS_CAIDA.
export function resolverTiro(T, color, x, y) {
  const esp = typeof color === "string";
  const [r, c] = celdaLibre(T, x, y);
  while (T.grid.length <= r) T.grid.push(Array(COLS).fill(null));
  if (!esp) T.grid[r][c] = color;

  let quitadas = [], caidas = [];
  if (esp) quitadas = quitar(T, celdasEspecial(T, color, r, c));
  else { const g = grupo(T, r, c); if (g.length >= 3) quitadas = quitar(T, g); }
  const n = quitadas.length;
  if (n) { caidas = soltarFlotantes(T); T.tiros = 0; T.racha++; } else { T.tiros++; T.racha = 0; }
  recortarFilasVacias(T);

  const ev = { r, c, esEspecial: esp, n, cayeron: caidas.length, quitadas, caidas, premio: null, bajo: false, gano: false, perdio: false };
  if (!hayColores(T)) { ev.gano = true; return ev; }   // nivel limpio (las piedras que queden no cuentan)

  if (!esp) {   // premios por jugar bien
    if (ev.cayeron >= CAIDAS_PARA_ARCOIRIS) ev.premio = "arcoiris";
    else if (n >= REVENTAR_PARA_BOMBA) ev.premio = "bomba";
    else if (T.racha >= RACHA_PARA_RAYO) { ev.premio = "rayo"; T.racha = 0; }
    if (ev.premio) darEspecial(T, ev.premio);
  }
  if (T.tiros >= T.tirosPorFila) { bajarTecho(T); T.tiros = 0; ev.bajo = true; }

  // los colores que siguen deben existir todavía en el tablero
  const p = coloresPresentes(T);
  if (typeof T.actual === "number" && !p.includes(T.actual)) T.actual = colorAlAzar(T);
  if (typeof T.siguiente === "number" && !p.includes(T.siguiente)) T.siguiente = colorAlAzar(T);

  for (let rr = LIMITE_FILA; rr < T.grid.length; rr++) if (T.grid[rr].some((v) => v !== null)) { ev.perdio = true; break; }
  return ev;
}

// Dispara con este ángulo (radianes, ver limitarAngulo) sin animar. Lo usa el bot.
export function tirar(T, angulo) {
  const color = sacarDeCola(T);
  const p = simular(T, angulo);
  return resolverTiro(T, color, p.x, p.y);
}

// Puntos que da un resultado de tiro (igual que el juego de siempre)
export function puntosDeTiro(ev) {
  const base = ev.esEspecial ? ev.n * PUNTOS_BASE * 2 : ev.n * PUNTOS_BASE + Math.max(0, ev.n - 3) * PUNTOS_BASE;
  return base + ev.cayeron * PUNTOS_CAIDA;
}
